import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

test('sendGlobalEvent retains original array payload, waits and ordered CSS assertions', () => {
  const ast = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL('../../tests/reactlynx.spec.ts', import.meta.url),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  let body;
  function find(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && node.arguments[0]?.text === 'api-sendGlobalEvent'
    ) body = node.arguments[1].body;
    ts.forEachChild(node, find);
  }
  find(ast);
  const waits = [], css = [], api = [];
  function inspect(node) {
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(ast);
      if (name === 'wait') waits.push(Number(node.arguments[0].getText(ast)));
      if (name.endsWith('.toHaveCSS')) {
        css.push(node.arguments.map(a => a.text));
      }
      if (name.endsWith('.sendGlobalEvent')) {
        api.push(node.arguments.map(a => a.getText(ast)));
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(body);
  assert.deepEqual(api, [['\'event-test\'', '[\'change\']']]);
  const cases = YAML.parse(
    readFileSync(
      new URL('../cases/web/send-global-event.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  assert.equal(cases.length, 1);
  const steps = cases[0].steps;
  assert.equal(steps[0].gotoUrl, '${shellUrl}?casename=api-sendGlobalEvent');
  assert.deepEqual(
    steps.filter(s => s['web.expect']).map(s => {
      assert.equal(s['web.expect'].selector, '#target');
      return [s['web.expect'].css, s['web.expect'].equals];
    }),
    css,
  );
  assert.deepEqual(
    steps.filter(s => s.javascript?.startsWith('new Promise')).map(s =>
      Number(/, (\d+)\)\)$/.exec(s.javascript)[1])
    ),
    waits,
  );
  const received = [];
  assert.equal(
    runInNewContext(steps[4].javascript, {
      document: {
        querySelector(selector) {
          assert.equal(selector, 'lynx-view');
          return {
            sendGlobalEvent: (...args) =>
              received.push(JSON.parse(JSON.stringify(args))),
          };
        },
      },
    }),
    true,
  );
  assert.deepEqual(received, [['event-test', ['change']]]);
  assert.deepEqual(steps.map(s => Object.keys(s)[0]), [
    'gotoUrl',
    'javascript',
    'recordToReport',
    'web.expect',
    'javascript',
    'javascript',
    'web.expect',
    'recordToReport',
  ]);
});
