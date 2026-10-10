import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// These source callbacks use the whole test title as both snapshot directory
// and subcase path. Retain both rather than flattening the nested PNG alias.
export async function originalTitlePixels(
  clipped = false,
  onScreenshotOptions = () => {},
) {
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
      const body = node.arguments[1].body;
      const calls = body.statements.map(statement =>
        ts.isExpressionStatement(statement)
          && ts.isAwaitExpression(statement.expression)
          && ts.isCallExpression(statement.expression.expression)
          ? statement.expression.expression
          : undefined
      );
      if (
        calls.length >= 2 && calls.every(call =>
          call
          && ['gotoWebComponentPage', 'wait', 'diffScreenShot'].includes(
            call.expression.getText(ast),
          )
        )
        && calls.some(call =>
          call.expression.getText(ast) === 'diffScreenShot'
          && call.arguments.length === (clipped ? 4 : 3)
          && call.arguments[2].getText(ast) === 'title'
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
  const cases = [];
  for (const { title, callback } of callbacks) {
    assert.ok(title.includes('/'));
    const steps = [];
    let navigation = 0;
    let snapshots = 0;
    const page = {};
    const run = vm.runInNewContext(
      ts.transpile('(' + callback.getText(ast) + ')', {
        target: ts.ScriptTarget.ES2022,
      }),
      {
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
          assert.equal(subcase, title);
          if (clipped) {
            assert.equal(options.length, 1);
            assert.deepEqual(Object.keys(options[0]), ['clip']);
            const { clip } = options[0];
            assert.deepEqual(Object.keys(clip).sort(), [
              'height',
              'width',
              'x',
              'y',
            ]);
            assert.ok(Object.values(clip).every(Number.isFinite));
            onScreenshotOptions(
              directory + '/' + subcase,
              JSON.parse(JSON.stringify(options[0])),
            );
          } else assert.deepEqual(options, []);
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
    await run({ page }, { title });
    assert.equal(navigation, 1);
    assert.equal(snapshots, 1);
    cases.push({ name: 'web-elements/' + title, steps });
  }
  return cases;
}
