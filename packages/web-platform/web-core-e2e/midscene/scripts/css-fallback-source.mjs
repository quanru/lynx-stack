import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export async function originalCSSFallback(ssr) {
  assert.equal(typeof ssr, 'boolean');
  const ast = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL(
        '../../tests/reactlynx-css-var-fallback.spec.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const definitions = [];
  const test = (name, callback) => definitions.push({ name, callback });
  test.describe = (_name, callback) => callback();
  let steps;
  const context = {
    test,
    process: { env: { ENABLE_SSR: ssr ? '1' : undefined } },
    document: { fonts: { ready: Promise.resolve() } },
    setTimeout(callback, ms) {
      assert.ok([100, 300].includes(ms));
      steps.push({
        javascript:
          `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
      });
      callback();
    },
    expect: locator => ({
      toHaveCSS: async (css, equals) =>
        steps.push({
          'web.expect': {
            selector: locator.selector,
            css,
            equals,
            timeoutMs: 5000,
          },
        }),
    }),
  };
  const source = ast.statements.filter(statement =>
    !ts.isImportDeclaration(statement)
  ).map(statement => statement.getText(ast)).join('\n');
  vm.runInNewContext(
    ts.transpile(source, { target: ts.ScriptTarget.ES2022 }),
    context,
  );
  assert.equal(definitions.length, 2);
  const cases = [];
  for (const { name, callback } of definitions) {
    steps = [];
    await callback({
      page: {
        async goto(url, options) {
          assert.equal(options.waitUntil, 'load');
          steps.push({ gotoUrl: '${shellUrl}' + url.slice(1) });
        },
        async evaluate(callback) {
          await callback();
          steps.push({ javascript: 'document.fonts.ready.then(() => true)' });
        },
        locator: selector => ({ selector }),
      },
    }, { title: name });
    cases.push({ name: (ssr ? 'ssr/' : '') + name, steps });
  }
  return cases;
}
