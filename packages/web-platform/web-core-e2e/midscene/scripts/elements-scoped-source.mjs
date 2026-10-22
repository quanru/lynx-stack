import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Replay only complete static or explicitly allowed public-API callbacks.
// Extra UI actions, guards, assertions and screenshot overrides exclude a case.
export async function originalScopedPixels(mode = 'static') {
  assert.ok(['static', 'api'].includes(mode));
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
  let helper;
  function visit(node, parents = []) {
    if (
      ts.isVariableDeclaration(node) && node.name.getText(ast) === 'getTitle'
    ) {
      helper = node.initializer.getText(ast);
    }
    if (
      ts.isCallExpression(node)
      && node.expression.getText(ast) === 'test.describe'
      && ts.isStringLiteral(node.arguments[0])
    ) {
      parents = [...parents, node.arguments[0].text];
    }
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0]) && node.arguments[1]?.body
    ) {
      const callback = node.arguments[1];
      const statements = callback.body.statements;
      if (
        statements.length >= 3 && ts.isVariableStatement(statements[0])
        && statements[0].getText(ast).replace(/\s/g, '')
          === 'consttitle=getTitle(titlePath);'
        && (mode === 'static'
          || statements.some(statement =>
            statement.getText(ast).includes('.evaluate(')
          ))
        && statements.slice(1).every(statement => {
          if (
            !ts.isExpressionStatement(statement)
            || !ts.isAwaitExpression(statement.expression)
            || !ts.isCallExpression(statement.expression.expression)
          ) return false;
          const call = statement.expression.expression;
          const kind = call.expression.getText(ast);
          if (
            mode === 'api'
            && /^page\.locator\(.+\)\.evaluate$/.test(kind.replace(/\s+/g, ''))
          ) {
            const callback = call.arguments[0];
            if (
              !callback || !ts.isArrowFunction(callback)
              || callback.parameters.length !== 1
            ) return false;
            const parameter = callback.parameters[0].name.getText(ast);
            const expressions = ts.isBlock(callback.body)
              ? callback.body.statements.map(statement =>
                ts.isExpressionStatement(statement)
                  ? statement.expression
                  : undefined
              )
              : [callback.body];
            return expressions.length > 0
              && expressions.every(expression =>
                expression
                && ts.isCallExpression(expression)
                && ts.isPropertyAccessExpression(expression.expression)
                && expression.expression.expression.getText(ast) === parameter
                && ['setAttribute', 'addText', 'setValue', 'sendDelEvent']
                  .includes(expression.expression.name.text)
              );
          }
          return ['gotoWebComponentPage', 'wait', 'diffScreenShot'].includes(
            kind,
          )
            && (kind !== 'diffScreenShot' || call.arguments.length === 3);
        })
      ) {
        callbacks.push({ callback, title: node.arguments[0].text, parents });
      }
    }
    ts.forEachChild(node, child => visit(child, parents));
  }
  visit(ast);
  assert.ok(helper);
  const results = [];
  for (const { callback, title, parents } of callbacks) {
    const steps = [];
    let fixture;
    const context = vm.createContext({
      path,
      gotoWebComponentPage: async (_page, name) => {
        assert.equal(fixture, undefined, 'Only one original navigation');
        fixture = name;
        steps.push({
          gotoUrl: '${elementsUrl}tests/fixtures/' + name + '.html',
        }, { javascript: 'document.fonts.ready.then(() => true)' });
      },
      wait: async ms => {
        assert.ok(Number.isFinite(ms) && ms >= 0);
        steps.push({
          javascript:
            `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
        });
      },
      diffScreenShot: async (_page, name, subcase) => {
        assert.equal(typeof subcase, 'string');
        steps.push({
          'web.pixels': {
            suite: 'web-elements',
            baseline: name + '/' + subcase,
          },
        });
      },
    });
    const source = `const getTitle = ${helper}; (${callback.getText(ast)})`;
    const runnable = vm.runInContext(
      ts.transpile(source, { target: ts.ScriptTarget.ES2022 }),
      context,
    );
    const page = mode === 'static' ? {} : {
      locator: selector => ({
        evaluate: async callback => {
          assert.equal(typeof selector, 'string');
          steps.push({
            javascript: `(${callback.toString()})(document.querySelector(${
              JSON.stringify(selector)
            }))`,
          });
        },
      }),
    };
    await runnable({ page }, {
      title,
      titlePath: ['web-elements.spec.ts', ...parents, title],
    });
    const originalTitle = path.join(parents.at(-1), title);
    if (mode === 'static') assert.equal(fixture, originalTitle);
    results.push({ name: 'web-elements/' + originalTitle, steps });
  }
  return results;
}
