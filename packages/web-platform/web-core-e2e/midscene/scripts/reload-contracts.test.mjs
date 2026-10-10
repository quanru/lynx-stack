import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';

const parse = text =>
  ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true);
const original = parse(
  readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  ),
);
const cases = YAML.parse(
  readFileSync(
    new URL('../cases/web/reload-contracts.yaml', import.meta.url),
    'utf8',
  ),
).cases;
const normalize = text =>
  ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  })
    .outputText.replace(/,\s*}/g, '}').replace(/[\s();]/g, '');

test('reload contracts retain original ordered API bodies, waits, raw count and six viewport assertions', () => {
  const originals = new Map();
  function find(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(original) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) originals.set(node.arguments[0].text, node.arguments[1].body);
    ts.forEachChild(node, find);
  }
  find(original);
  assert.equal(cases.length, 3);
  for (const item of cases) {
    const expected = [];
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(original);
        if (name === 'goto') {
          expected.push([
            'goto',
            ts.isStringLiteral(node.arguments[1])
              ? node.arguments[1].text
              : item.name,
          ]);
        } else if (name === 'wait') {
          expected.push(['wait', Number(node.arguments[0].getText(original))]);
        } else if (name.endsWith('.toHaveCSS')) {
          expected.push([
            'css',
            ...node.arguments.map(a => a.text),
            name.includes('.not.'),
          ]);
        } else if (name.endsWith('.toContain')) {
          assert.match(
            node.expression.expression.getText(original),
            /getAttribute\('style'\)/,
          );
          expected.push(['style', node.arguments[0].text]);
        } else if (name.endsWith('.toBe')) {
          assert.equal(node.arguments[0].getText(original), '1');
          ts.forEachChild(node, visit);
          expected.push(['count', 1]);
          return;
        } else if (name === 'page.evaluate' || name === 'lynxView.evaluate') {
          const callback = node.arguments[0];
          if (ts.isBlock(callback.body)) {
            expected.push([
              'api',
              normalize(
                callback.body.statements.map(s => s.getText(original)).join(
                  '\n',
                ),
              ),
            ]);
          } else {expected.push([
              'read',
              normalize(callback.body.getText(original)),
            ]);}
          return;
        } else if (
          /\.(click|fill|press|toEqual|toHaveText|toHaveAttribute)$/.test(name)
        ) assert.fail('Unsupported source contract: ' + name);
      }
      ts.forEachChild(node, visit);
    }
    visit(originals.get(item.name));
    const actual = [];
    for (const step of item.steps) {
      if (step.gotoUrl) {
        actual.push(['goto', step.gotoUrl.split('?casename=')[1]]);
      } else if (step.recordToReport) continue;
      else if (step['web.expect']) {
        const input = step['web.expect'];
        assert.equal(input.selector, '#target');
        if (input.css) {
          actual.push(['css', input.css, input.equals, input.not === true]);
        } else {
          assert.equal(input.attribute, 'style');
          assert.equal(input.immediate, true);
          actual.push(['style', input.contains]);
        }
      } else if (step.javascript) {
        const timer =
          /^new Promise\(resolve => setTimeout\(\(\) => resolve\(true\), (\d+)\)\)$/
            .exec(step.javascript);
        if (timer) actual.push(['wait', Number(timer[1])]);
        else {
          const script = parse(step.javascript);
          const body =
            script.statements[0].expression.expression.expression.body;
          assert.equal(body.statements.at(-1).getText(script), 'return true;');
          if (step.javascript.includes('const actual =')) {
            const read =
              body.statements[0].declarationList.declarations[0].initializer;
            actual.push(['read', normalize(read.getText(script))]);
            assert.equal(
              body.statements[1].expression.getText(script),
              'actual !== 1',
            );
            assert.ok(ts.isThrowStatement(body.statements[1].thenStatement));
            actual.push(['count', 1]);
          } else {
            const start = step.javascript.includes('const nodes =') ? 3 : 0;
            actual.push([
              'api',
              normalize(
                body.statements.slice(start, -1).map(s => s.getText(script))
                  .join('\n'),
              ),
            ]);
          }
        }
      } else assert.fail('Unsupported translated step');
    }
    assert.deepEqual(actual, expected, item.name);
    assert.ok(
      item.steps.findIndex(s => s.recordToReport)
        < item.steps.findIndex(s =>
          s['web.expect'] || /\.reload\(/.test(s.javascript ?? '')
        ),
    );
  }
});
