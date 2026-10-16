import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';
import {
  createConsoleEvidence,
  projectConsoleError,
  captureConsoleMessage,
} from '../runtime-contract.ts';

const ast = ts.createSourceFile(
  'source.ts',
  readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
const cases = YAML.parse(
  readFileSync(
    new URL('../cases/web/error-callbacks.yaml', import.meta.url),
    'utf8',
  ),
).cases;
const originals = new Map();
function find(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) {
    originals.set(node.arguments[0].text, node.arguments[1].body);
  }
  ts.forEachChild(node, find);
}
find(ast);

test('error payload predicates match unchanged source callbacks for valid and malformed events', async () => {
  assert.equal(cases.length, 5);
  for (const item of cases) {
    const body = originals.get(item.name);
    let callback, flag;
    const waits = [];
    function inspect(node) {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(ast);
        if (name === 'page.on') {
          assert.equal(node.arguments[0].text, 'console');
          callback = node.arguments[1].getText(ast);
        } else if (name.endsWith('.toBe')) {
          assert.equal(node.arguments[0].getText(ast), 'true');
          flag = node.expression.expression.arguments[0].getText(ast);
        } else if (name === 'wait') {
          waits.push(Number(node.arguments[0].getText(ast)));
        } else if (
          /\.to[A-Z]/.test(name) || /\.(click|fill|press)$/.test(name)
        ) assert.fail('Unsupported original contract');
      }
      ts.forEachChild(node, inspect);
    }
    inspect(body);
    assert.ok(callback && ['offset', 'fileName', 'success'].includes(flag));
    assert.ok(
      body.getText(ast).indexOf('page.on(\'console\'')
        < body.getText(ast).indexOf('goto(page'),
    );
    assert.deepEqual(waits, [500]);
    assert.deepEqual(item.steps.map(s => Object.keys(s)[0]), [
      'gotoUrl',
      'javascript',
      'recordToReport',
      'web.expect',
      'recordToReport',
    ]);
    assert.equal(
      item.steps[1].javascript,
      'new Promise(resolve => setTimeout(() => resolve(true), 500))',
    );
    assert.equal(
      item.steps[0].gotoUrl,
      '${shellUrl}?casename='
        + (item.name.startsWith('api-error-') ? 'api-error' : item.name),
    );
    const contract = item.steps[3]['web.expect'].consoleError;
    const good = {
      type: 'error',
      detail: {
        error: { message: contract.message ?? 'error', stack: 'stack' },
        sourceMap: { offset: { line: 2, col: 0 } },
        fileName: contract.fileName ?? 'lepus.js',
        release: contract.release ?? '1',
      },
    };
    const candidates = [null, undefined, {}, { type: 'not-error' }, {
      type: 'error',
    }, good];
    for (
      const [path, values] of [
        [['type'], ['error ', 1, null]],
        [['detail', 'error', 'message'], ['error ', 'wrong', null, 1]],
        [['detail', 'error', 'stack'], ['', ' ', null, 1, 'stack']],
        [['detail', 'sourceMap', 'offset', 'line'], [0, 2, '2', null]],
        [['detail', 'sourceMap', 'offset', 'col'], [0, 1, '0', null]],
        [['detail', 'fileName'], [
          'lepus.js',
          'app-service.js',
          'lepus.js ',
          null,
          1,
        ]],
        [['detail', 'release'], ['1', '111', 1, 111, null]],
      ]
    ) {
      for (const value of values) {
        const changed = structuredClone(good);
        let target = changed;
        for (const key of path.slice(0, -1)) target = target[key];
        target[path.at(-1)] = value;
        candidates.push(changed);
      }
    }
    for (const event of candidates) {
      let originalResult;
      try {
        originalResult = await runInNewContext(
          `(async () => {
          let ${flag} = false;
          const handler = ${callback};
          await handler({ args: () => [{ evaluate: async fn => fn(event) }] });
          return ${flag};
        })()`,
          { event },
        );
      } catch {
        originalResult = false;
      }
      const evidence = createConsoleEvidence();
      evidence.recordError(projectConsoleError(event));
      let migratedResult = true;
      try {
        evidence.expectError(contract);
      } catch {
        migratedResult = false;
      }
      assert.equal(
        migratedResult,
        originalResult,
        item.name + ': ' + JSON.stringify(event),
      );
    }
  }
});

test('error assertions do not extend observation windows or combine fields from different events', async () => {
  const evidence = createConsoleEvidence();
  const contract = {
    type: 'error',
    line: 2,
    col: 0,
    message: 'error',
    stack: { nonemptyString: true },
  };
  let resolve;
  const pending = captureConsoleMessage({
    text: () => 'error event',
    args: () => [{
      evaluate: () =>
        new Promise(yes => {
          resolve = yes;
        }),
    }],
  }, evidence);
  assert.throws(() => evidence.expectError(contract), /not observed/);
  resolve({ type: 'error', line: 2, col: 0, message: 'error', stack: 'stack' });
  await pending;
  evidence.expectError(contract);
  const separate = createConsoleEvidence();
  separate.recordError({
    type: 'error',
    line: 2,
    col: 1,
    message: 'error',
    stack: 'stack',
  });
  separate.recordError({
    type: 'error',
    line: 3,
    col: 0,
    message: 'error',
    stack: 'stack',
  });
  assert.throws(() => separate.expectError(contract), /not observed/);
  await captureConsoleMessage({
    text: () => 'error',
    args: () => [{
      evaluate: async () => {
        throw new Error('context lost');
      },
    }],
  }, evidence);
  assert.throws(() => evidence.expectError(contract), /incomplete/);
  for (
    const invalid of [
      {},
      { type: 'other' },
      { type: 'error', stack: { nonemptyString: false } },
      { type: 'error', unknown: 'x' },
      { type: 'error', line: NaN },
    ]
  ) assert.throws(() => evidence.expectError(invalid), /Invalid/);
});
