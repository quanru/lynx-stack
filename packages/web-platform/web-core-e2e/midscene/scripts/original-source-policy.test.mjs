import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import expected from './original-remaining-sources.json' with { type: 'json' };
import { originalRunnerCatalog } from './original-runner-catalog.mjs';

test('trusted source/browser exemptions exactly match original AST guards and no other declarations', () => {
  const actual = [];
  const files = new Map(
    expected.map(row => [`${row.package}/${row.file}`, row]),
  );
  for (const { package: pkg, file } of files.values()) {
    const sf = ts.createSourceFile(
      file,
      readFileSync(new URL(`../../../${pkg}/${file}`, import.meta.url), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const skips = node => {
      const found = [];
      function walk(node) {
        if (
          ts.isCallExpression(node)
          && node.expression.getText(sf) === 'test.skip'
        ) {
          const predicate = node.arguments[0]?.getText(sf) ?? 'true';
          assert.match(
            predicate,
            /^(true|browserName (===|!==) '(chromium|firefox|webkit)')$/,
          );
          found.push(predicate);
        }
        ts.forEachChild(node, walk);
      }
      walk(node);
      return found;
    };
    function visit(node, parents = [], inherited = []) {
      if (
        ts.isCallExpression(node)
        && node.expression.getText(sf) === 'test.describe'
        && ts.isStringLiteral(node.arguments[0])
      ) {
        parents = [...parents, node.arguments[0].text];
        const hooks = node.arguments[1].body.statements.filter(statement =>
          ts.isExpressionStatement(statement)
          && ts.isCallExpression(statement.expression)
          && statement.expression.expression.getText(sf) === 'test.beforeEach'
        );
        inherited = [...inherited, ...hooks.flatMap(skips)];
      }
      if (
        ts.isCallExpression(node) && node.expression.getText(sf) === 'test'
        && ts.isStringLiteral(node.arguments[0])
      ) {
        const title = node.arguments[0].text;
        if (
          file === 'tests/reactlynx.spec.ts'
          && !/^basic-(mts-bindtouchstart|bindmouse|bindwheel-view)$/.test(
            title,
          )
        ) return;
        if (
          file === 'tests/x-markdown.spec.ts'
          && title === 'should fire bindlink and bindimageTap events'
        ) return;
        const guards = [...inherited, ...skips(node)];
        const skipBrowsers = ['chromium', 'firefox', 'webkit'].filter(browser =>
          guards.some(guard =>
            guard === 'true' || guard === `browserName === '${browser}'`
            || (guard.startsWith('browserName !== ')
              && guard !== `browserName !== '${browser}'`)
          )
        );
        if (file === 'tests/template.spec.ts') {
          assert.equal(
            node.arguments[1].parameters.length,
            0,
            'Only the original fixture-free template callback is non-UI',
          );
          assert.doesNotMatch(node.arguments[1].getText(sf), /\bpage\b/);
        }
        actual.push({
          package: pkg,
          file,
          title,
          suite: parents.at(-1) ?? null,
          sourceId: title,
          key: `${file}::${parents.join('/')}/${title}`,
          skipGuards: guards,
          skipBrowsers,
          ...(file === 'tests/template.spec.ts'
            ? { evidencePolicy: 'non-ui' }
            : {}),
        });
        return;
      }
      ts.forEachChild(node, child => visit(child, parents, inherited));
    }
    visit(sf);
  }
  assert.deepEqual(actual, expected);
  const byRunner = Object.fromEntries(
    originalRunnerCatalog.map(
      runner => [
        runner.id,
        (runner.sources ?? []).reduce((count, source) =>
          count
          + runner.browsers.filter(browser =>
            source.skipBrowsers?.includes(browser)
          ).length, 0),
      ],
    ),
  );
  assert.equal(
    Object.values(byRunner).reduce((sum, count) => sum + count, 0),
    54,
  );
  assert.equal(byRunner.runtime, 32);
  assert.equal(byRunner['pointer-csr'], 5);
  assert.equal(byRunner['pointer-ssr'], 5);
  assert.equal(byRunner.markdown, 9);
  assert.equal(byRunner['drag-wheel'], 3);
});
