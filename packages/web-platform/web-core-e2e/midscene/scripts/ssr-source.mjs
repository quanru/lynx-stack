import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

export async function originalSSRNoJS() {
  const ast = ts.createSourceFile(
    'ssr.ts',
    readFileSync(
      new URL('../../tests/ssr-no-js.spec.ts', import.meta.url),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const describe = ast.statements.find(statement =>
    ts.isExpressionStatement(statement)
    && ts.isCallExpression(statement.expression)
    && statement.expression.expression.getText(ast) === 'test.describe'
  );
  assert.ok(describe);
  const definitions = [];
  const test = (name, callback) => definitions.push({ name, callback });
  let noJS = false;
  test.use = options => {
    assert.equal(options.javaScriptEnabled, false);
    noJS = true;
  };
  let steps;
  const context = {
    test,
    expect: target => ({
      toHaveCSS: async (css, equals) =>
        steps.push({
          'web.expect': {
            selector: target.selector,
            css,
            equals,
            timeoutMs: 5000,
          },
        }),
      toHaveAttribute: async (attribute, equals) =>
        steps.push({
          'web.expect': {
            selector: target.selector,
            attribute,
            equals,
            timeoutMs: 5000,
          },
        }),
      not: {
        toHaveAttribute: async (attribute, value) => {
          assert.equal(value, undefined);
          steps.push({
            'web.expect': {
              selector: target.selector,
              attribute,
              equals: null,
              timeoutMs: 5000,
            },
          });
        },
      },
    }),
  };
  const declare = runInNewContext(
    ts.transpile('(' + describe.expression.arguments[1].getText(ast) + ')', {
      target: ts.ScriptTarget.ES2022,
    }),
    context,
  );
  declare();
  assert.ok(noJS);
  const cases = [];
  for (const { name, callback } of definitions) {
    steps = [];
    await callback({
      page: {
        goto: async (url, options) => {
          assert.equal(options.waitUntil, 'load');
          assert.ok(url.startsWith('/ssr?casename='));
          steps.push({ gotoUrl: '${shellUrl}' + url.slice(1) });
        },
        locator: selector => ({ selector }),
      },
    });
    cases.push({ name: 'ssr-no-js/' + name, steps });
  }
  return cases;
}
