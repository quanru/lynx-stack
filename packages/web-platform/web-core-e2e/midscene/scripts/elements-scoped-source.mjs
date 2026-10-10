import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Replay only complete static source callbacks. Any extra action, guard,
// assertion or screenshot override excludes the callback from this batch.
export async function originalScopedPixels() {
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
        && statements.slice(1).every(statement => {
          if (
            !ts.isExpressionStatement(statement)
            || !ts.isAwaitExpression(statement.expression)
            || !ts.isCallExpression(statement.expression.expression)
          ) return false;
          const call = statement.expression.expression;
          const kind = call.expression.getText(ast);
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
    await runnable({ page: {} }, {
      title,
      titlePath: ['web-elements.spec.ts', ...parents, title],
    });
    assert.equal(fixture, path.join(parents.at(-1), title));
    results.push({ name: 'web-elements/' + fixture, steps });
  }
  return results;
}
