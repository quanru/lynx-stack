import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const source = ts.createSourceFile(
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
let callback;
function visit(node, group = '') {
  if (
    ts.isCallExpression(node)
    && node.expression.getText(source) === 'test.describe'
  ) {
    group = node.arguments[0]?.text ?? group;
  }
  if (
    group === 'x-overlay-ng' && ts.isCallExpression(node)
    && node.expression.getText(source) === 'test'
    && node.arguments[0]?.text === 'event-layoutchange'
  ) {
    assert.equal(callback, undefined);
    callback = node.arguments[1];
  }
  ts.forEachChild(node, child => visit(child, group));
}
visit(source);
assert.ok(callback);
const { cases } = YAML.parse(readFileSync(
  new URL(
    '../cases/web-pixels/elements-overlay-layout.yaml',
    import.meta.url,
  ),
  'utf8',
));

function environment(detail, missing) {
  const trace = [];
  const env = {
    trace,
    detail,
    document: {
      fonts: { ready: Promise.resolve() },
      getElementById(id) {
        trace.push(['getElementById', id]);
        return missing ? null : {
          setAttribute: (...args) => trace.push(['setAttribute', ...args]),
        };
      },
    },
    page: { evaluate: fn => fn() },
    getTitle: titles => titles.slice(-2).join('/'),
    gotoWebComponentPage: async (_page, title) => {
      trace.push(['goto', '${elementsUrl}tests/fixtures/' + title + '.html']);
    },
    wait: async ms => {
      trace.push(['wait', ms]);
    },
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
    },
    expect(value) {
      return {
        toBeTruthy: () => assert.ok(value),
        toBe: expected => assert.equal(value, expected),
      };
    },
  };
  return env;
}

test('overlay layout retains the exact source event contract, including negative payloads', async () => {
  assert.equal(cases.length, 1);
  assert.equal(cases[0].name, 'web-elements/x-overlay-ng/event-layoutchange');
  assert.equal(cases[0].steps.filter(step => step.recordToReport).length, 2);
  const valid = {
    width: 1,
    height: 2,
    left: 3,
    right: 4,
    top: 5,
    bottom: 6,
    id: 'target',
  };
  const payloads = [undefined, null, false, {}, valid, {
    ...valid,
    id: 'wrong',
  }];
  for (const field of ['width', 'height', 'left', 'right', 'top', 'bottom']) {
    payloads.push({ ...valid, [field]: '1' }, { ...valid, [field]: undefined });
    // The original checks typeof, not positivity or finiteness.
    payloads.push({ ...valid, [field]: NaN }, { ...valid, [field]: -1 });
  }
  for (const detail of payloads) {
    for (const missing of [false, true]) {
      const original = environment(detail, missing);
      const migrated = environment(detail, missing);
      const runSource = runInNewContext(
        ts.transpile('(' + callback.getText(source) + ')', {
          target: ts.ScriptTarget.ES2022,
        }),
        original,
      );
      const expected = await runSource({ page: original.page }, {
        titlePath: ['suite', 'x-overlay-ng', 'event-layoutchange'],
      }).then(() => true, () => false);
      const actual = await (async () => {
        for (const step of cases[0].steps) {
          assert.equal(Object.keys(step).length, 1);
          if (step.recordToReport) continue;
          if (step.gotoUrl) migrated.trace.push(['goto', step.gotoUrl]);
          else if (step.javascript) {
            await runInNewContext(step.javascript, migrated);
          } else assert.fail('Unexpected step');
        }
      })().then(() => true, () => false);
      assert.equal(actual, expected);
      assert.deepEqual(migrated.trace, original.trace);
    }
  }
});
