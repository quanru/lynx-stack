import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Replay complete guarded static callbacks. Chromium coverage cannot activate
// an unconditional skip or claim the original Firefox/WebKit variants passed.
export async function originalGuardedStaticPixels() {
  const ast = ts.createSourceFile(
    'elements.ts',
    readFileSync(
      new URL(
        '../../../web-elements/tests/web-elements.spec.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const callbacks = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0]) && node.arguments[1]?.body
    ) {
      const calls = node.arguments[1].body.statements.map(statement => {
        if (!ts.isExpressionStatement(statement)) return;
        const expression = ts.isAwaitExpression(statement.expression)
          ? statement.expression.expression
          : statement.expression;
        return ts.isCallExpression(expression) ? expression : undefined;
      });
      if (
        calls.some(call => call?.expression.getText(ast) === 'test.skip')
        && calls.filter(call =>
            call?.expression.getText(ast) === 'diffScreenShot'
          ).length === 1
        && calls.every(call =>
          call
          && ['test.skip', 'gotoWebComponentPage', 'wait', 'diffScreenShot']
            .includes(call.expression.getText(ast))
          && (call.expression.getText(ast) !== 'diffScreenShot'
            || call.arguments.length === 3)
        )
      ) {
        callbacks.push({
          title: node.arguments[0].text,
          callback: node.arguments[1],
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const cases = [], matrix = [];
  const skipped = Symbol('original skip');
  for (const { title, callback } of callbacks) {
    assert.ok(title.includes('/'));
    const entry = { name: 'web-elements/' + title, skipped: {} };
    for (const browserName of ['chromium', 'firefox', 'webkit']) {
      const steps = [];
      let navigation = 0, snapshots = 0, guards = 0;
      const page = {};
      const run = vm.runInNewContext(
        ts.transpile('(' + callback.getText(ast) + ')', {
          target: ts.ScriptTarget.ES2022,
        }),
        {
          test: {
            skip: condition => {
              guards++;
              if (condition) throw skipped;
            },
          },
          async gotoWebComponentPage(actualPage, fixture) {
            assert.equal(actualPage, page);
            assert.equal(fixture, title);
            assert.equal(navigation++, 0);
            steps.push({
              gotoUrl: '${elementsUrl}tests/fixtures/' + title + '.html',
            }, { javascript: 'document.fonts.ready.then(() => true)' });
          },
          async wait(ms) {
            assert.ok(Number.isFinite(ms) && ms >= 0);
            steps.push({
              javascript:
                `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
            });
          },
          async diffScreenShot(actualPage, directory, subcase, ...options) {
            assert.equal(actualPage, page);
            assert.equal(directory, title);
            assert.equal(typeof subcase, 'string');
            assert.deepEqual(options, []);
            snapshots++;
            steps.push({
              'web.pixels': {
                suite: 'web-elements',
                baseline: directory + '/' + subcase,
              },
            });
          },
        },
      );
      try {
        await run({ page, browserName }, { title });
        assert.ok(guards > 0);
        assert.equal(navigation, 1);
        assert.equal(snapshots, 1);
        entry.skipped[browserName] = false;
        if (browserName === 'chromium') cases.push({ name: entry.name, steps });
      } catch (error) {
        if (error !== skipped) throw error;
        assert.equal(
          navigation,
          0,
          'A skipped source case must never navigate or capture',
        );
        assert.equal(snapshots, 0);
        entry.skipped[browserName] = true;
      }
    }
    matrix.push(entry);
  }
  return { cases, matrix };
}
