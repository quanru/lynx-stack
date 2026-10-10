import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Replay original programmatic scroll-offset API tests, not user gestures.
// Reject every unhandled statement, guard, action, assertion and override.
export async function originalScrollPixels() {
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
  function assignmentCall(call) {
    const kind = call.expression.getText(ast).replace(/\s/g, '');
    if (
      kind !== 'page.evaluate' && !/^page\.locator\(.+\)\.evaluate$/.test(kind)
    ) return false;
    if (call.arguments.length !== 1 || !ts.isArrowFunction(call.arguments[0])) {
      return false;
    }
    const fn = call.arguments[0];
    const expressions = ts.isBlock(fn.body)
      ? fn.body.statements.map(statement =>
        ts.isExpressionStatement(statement) ? statement.expression : undefined
      )
      : [fn.body];
    return expressions.length > 0 && expressions.every(expression => {
      while (expression && ts.isParenthesizedExpression(expression)) {
        expression = expression.expression;
      }
      if (
        !expression || !ts.isBinaryExpression(expression)
        || expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken
        || !ts.isNumericLiteral(expression.right)
        || !ts.isPropertyAccessExpression(expression.left)
        || !['scrollTop', 'scrollLeft'].includes(expression.left.name.text)
      ) return false;
      let target = expression.left.expression;
      if (ts.isNonNullExpression(target)) target = target.expression;
      return fn.parameters.length === 1
        ? target.getText(ast) === fn.parameters[0].name.getText(ast)
        : fn.parameters.length === 0 && ts.isCallExpression(target)
          && target.expression.getText(ast) === 'document.querySelector'
          && target.arguments.length === 1
          && ts.isStringLiteral(target.arguments[0]);
    });
  }
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0]) && node.arguments[1]?.body
    ) {
      const calls = node.arguments[1].body.statements.map(statement =>
        ts.isExpressionStatement(statement)
          && ts.isAwaitExpression(statement.expression)
          && ts.isCallExpression(statement.expression.expression)
          ? statement.expression.expression
          : undefined
      );
      if (
        calls.some(call => call && assignmentCall(call))
        && calls.every(call =>
          call
          && (assignmentCall(call)
            || ['gotoWebComponentPage', 'wait'].includes(
              call.expression.getText(ast),
            )
            || call.expression.getText(ast) === 'diffScreenShot'
              && call.arguments.length === 3
              && ts.isStringLiteral(call.arguments[2]))
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
    const page = {
      async evaluate(fn) {
        steps.push({ javascript: `(${fn.toString()})()` });
      },
      locator(selector) {
        assert.equal(typeof selector, 'string');
        return {
          async evaluate(fn) {
            steps.push({
              javascript:
                `new Promise((resolve, reject) => { const deadline = Date.now() + 30000; const check = () => { const matches = document.querySelectorAll(${
                  JSON.stringify(selector)
                }); if (matches.length > 1) return reject(new Error('Original scroll API locator strictness violation')); if (matches.length === 1) { try { return resolve((${fn.toString()})(matches[0])); } catch (error) { return reject(error); } } if (Date.now() >= deadline) return reject(new Error('Original scroll API locator attachment timed out')); requestAnimationFrame(check); }; check(); })`,
            });
          },
        };
      },
    };
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
    await run({ page }, { title });
    assert.equal(navigation, 1);
    assert.ok(snapshots > 0);
    cases.push({ name: 'web-elements/' + title, steps });
  }
  return cases;
}
