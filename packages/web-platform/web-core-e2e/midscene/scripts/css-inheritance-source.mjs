import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

export async function originalCSSInheritance(ssr = false) {
  assert.equal(typeof ssr, 'boolean');
  const ast = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL('../../tests/reactlynx.spec.ts', import.meta.url),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  let callback, settings, goto;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'goto') {
      goto = node.initializer;
    }
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isTemplateExpression(node.arguments[0])
      && node.arguments[0].head.text === 'config-css-inheritance-'
    ) {
      callback = node.arguments[1];
      let parent = node.parent;
      while (parent && !ts.isForOfStatement(parent)) parent = parent.parent;
      assert.ok(parent && ts.isArrayLiteralExpression(parent.expression));
      assert.ok(parent.expression.elements.every(ts.isStringLiteral));
      settings = parent.expression.elements.map(element => element.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(callback && goto);
  const cases = [];
  for (const setting of settings) {
    const name = 'config-css-inheritance-' + setting;
    const steps = [];
    const locator = selector => ({
      selector,
      locator: child => locator(selector + ' ' + child),
      click: async () => {
        assert.equal(selector, '#update');
        steps.push({
          aiAct: {
            prompt:
              'Click the visible text "Update" once. Stop after that single click.',
            options: { deepLocate: true, cacheable: false },
          },
        });
      },
    });
    const context = {
      setting,
      isSSR: ssr,
      document: { fonts: { ready: Promise.resolve() } },
      wait: async ms =>
        steps.push({
          javascript:
            `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
        }),
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
    const run = runInNewContext(
      ts.transpile(
        'const goto = ' + goto.getText(ast) + '; (' + callback.getText(ast)
          + ')',
        {
          target: ts.ScriptTarget.ES2022,
        },
      ),
      context,
    );
    await run({
      page: {
        locator,
        async goto(url, options) {
          assert.equal(options.waitUntil, 'load');
          steps.push({ gotoUrl: '${shellUrl}' + url.slice(1) });
        },
        async evaluate(callback) {
          await callback();
          steps.push({ javascript: 'document.fonts.ready.then(() => true)' });
        },
      },
    }, { title: name });
    cases.push({ name: (ssr ? 'ssr/' : '') + name, steps });
  }
  return cases;
}
