import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';
import {
  createConsoleEvidence,
  projectConsoleError,
} from '../runtime-contract.ts';

const ast = ts.createSourceFile(
  'original.ts',
  readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
const cases = YAML.parse(
  readFileSync(
    new URL('../cases/web/runtime-interactions.yaml', import.meta.url),
    'utf8',
  ),
).cases;
const originals = new Map();
function find(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) originals.set(node.arguments[0].text, node.arguments[1].body);
  ts.forEachChild(node, find);
}
find(ast);

test('runtime interactions retain original waits, exact selectors and CSS checks, with aiAct replacing only clicks', () => {
  assert.equal(cases.length, 2);
  for (const item of cases) {
    const source = originals.get(item.name), waits = [], css = [], clicks = [];
    function inspect(node) {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(ast);
        if (name === 'wait') waits.push(Number(node.arguments[0].getText(ast)));
        if (name.endsWith('.toHaveCSS')) {
          css.push(node.arguments.map(a => a.text));
        }
        if (name.endsWith('.click')) clicks.push(name);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
    const steps = item.steps;
    assert.deepEqual(
      steps.filter(s => s.javascript).map(s =>
        Number(/, (\d+)\)\)$/.exec(s.javascript)[1])
      ),
      waits,
    );
    assert.deepEqual(
      steps.filter(s => s['web.expect']?.css).map(
        s => [s['web.expect'].css, s['web.expect'].equals],
      ),
      css,
    );
    assert.equal(clicks.length, 1);
    assert.equal(steps.filter(s => s.aiAct).length, 1);
    assert.deepEqual(
      steps.map(s => Object.keys(s)[0]),
      item.name === 'api-report-error'
        ? [
          'gotoUrl',
          'javascript',
          'recordToReport',
          'aiAct',
          'javascript',
          'web.expect',
          'web.expect',
          'recordToReport',
        ]
        : [
          'gotoUrl',
          'javascript',
          'recordToReport',
          'aiAct',
          'web.expect',
          'recordToReport',
        ],
    );
    if (item.name === 'api-report-error') {
      assert.equal(steps[0].gotoUrl, '${shellUrl}?casename=api-report-error');
      assert.equal(steps[5]['web.expect'].selector, 'lynx-view');
      assert.match(clicks[0], /page\.locator\('#target'\)/);
    } else {
      assert.equal(
        steps[0].gotoUrl,
        '${shellUrl}?casename=api-setSharedData&casename2=api-getSharedData',
      );
      assert.match(
        source.getText(ast),
        /goto\(page, 'api-setSharedData', 'api-getSharedData'\)/,
      );
      assert.equal(steps[4]['web.expect'].selector, '#lynxview2 #target');
      assert.equal(
        clicks[0],
        'page.locator(\'#lynxview2\').locator(\'#target\').click',
      );
      assert.match(steps[3].aiAct, /orange square in the second view/);
    }
  }
});

test('reportError payload matches the unchanged source callback, including strict coordinates and nonempty stack', async () => {
  const source = originals.get('api-report-error');
  let callback;
  function inspect(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'page.on'
    ) callback = node.arguments[1].getText(ast);
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  assert.ok(callback);
  assert.ok(
    source.getText(ast).indexOf('page.on(\'console\'')
      < source.getText(ast).indexOf('goto(page'),
  );
  const contract = cases[0].steps[6]['web.expect'].consoleError;
  assert.deepEqual(contract, {
    type: 'error',
    line: 2,
    col: 0,
    message: 'Error: foo',
    stack: { nonemptyString: true },
  });
  for (const line of [2, '2', 1]) {
    for (const col of [0, '0', 1]) {
      for (const message of ['Error: foo', 'foo']) {
        for (const stack of ['stack', '', ' ', null, 1]) {
          const event = {
            type: 'error',
            detail: {
              error: { message, stack },
              sourceMap: { offset: { line, col } },
            },
          };
          const expected = await runInNewContext(
            `(async () => { let offset = false; await (${callback})({ args: () => [{ evaluate: async fn => fn(event) }] }); return offset; })()`,
            { event },
          );
          const evidence = createConsoleEvidence();
          evidence.recordError(projectConsoleError(event));
          let actual = true;
          try {
            evidence.expectError(contract);
          } catch {
            actual = false;
          }
          assert.equal(actual, expected, JSON.stringify(event));
        }
      }
    }
  }
});
