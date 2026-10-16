import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const name = 'basic-element-scroll-view-event-scrollend';
const source = ts.createSourceFile(
  'reactlynx.ts',
  readFileSync(
    new URL(
      '../../tests/reactlynx.spec.ts',
      import.meta.url,
    ),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
let callback;
const helpers = new Map();
function visit(node) {
  if (
    ts.isVariableDeclaration(node)
    && ['goto', 'wait'].includes(node.name.getText(source))
  ) helpers.set(node.name.getText(source), node.initializer);
  if (
    ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    && node.arguments[0]?.text === name
  ) {
    assert.ok(!callback);
    callback = node.arguments[1];
  }
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(callback);
const cases = YAML.parse(
  readFileSync(
    new URL('../cases/web/scrollend-contract.yaml', import.meta.url),
    'utf8',
  ),
).cases;
const compile = node =>
  ts.transpile('(' + node.getText(source) + ')', {
    target: ts.ScriptTarget.ES2022,
  });
const fields = ['scrollTop', 'scrollLeft', 'scrollHeight', 'scrollWidth'];
const valid = Object.fromEntries(fields.map(field => [field, 0]));
function environment(detail = valid, type = 'scrollend', mode = 'present') {
  const trace = [];
  const document = {
    fonts: {
      get ready() {
        trace.push(['fonts']);
        return Promise.resolve();
      },
    },
    querySelector(selector) {
      trace.push(['query', selector]);
      if (mode === 'missing-host') return null;
      return {
        shadowRoot: mode === 'missing-shadow' ? null : {
          querySelector(inner) {
            trace.push(['shadow-query', inner]);
            if (mode === 'missing-target') return null;
            return {
              set scrollTop(value) {
                trace.push(['scrollTop', value]);
              },
              get innerHTML() {
                trace.push(['innerHTML']);
                return mode === 'invalid-json'
                  ? '{'
                  : JSON.stringify(
                    mode === 'missing-detail' ? { type } : { type, detail },
                  );
              },
            };
          },
        },
      };
    },
  };
  const page = {
    goto: async (url, options) =>
      trace.push(['goto', url, JSON.parse(JSON.stringify(options))]),
    evaluate: fn => fn(),
  };
  return {
    trace,
    document,
    page,
    isSSR: false,
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
    },
    expect(actual) {
      return {
        toBe: expected => assert.equal(actual, expected),
        not: { toBe: expected => assert.notEqual(actual, expected) },
      };
    },
  };
}
function runSource(env, browserName = 'chromium') {
  for (const [key, node] of helpers) {
    env[key] = runInNewContext(compile(node), env);
  }
  return runInNewContext(compile(callback), env)({
    page: env.page,
    browserName,
  }, { title: name });
}
async function runYaml(env) {
  for (const step of cases[0].steps) {
    assert.equal(Object.keys(step).length, 1);
    if (step.recordToReport) continue;
    if (step.gotoUrl) {
      await env.page.goto(step.gotoUrl.replace('${shellUrl}', '/'), {
        waitUntil: 'load',
      });
    } else if (step.javascript) await runInNewContext(step.javascript, env);
    else assert.fail('Unexpected node');
  }
}
async function compare(detail, type, mode) {
  const original = environment(detail, type, mode),
    translated = environment(detail, type, mode);
  const passed = action => action.then(() => true, () => false);
  const result = await passed(runSource(original));
  assert.equal(await passed(runYaml(translated)), result);
  assert.deepEqual(translated.trace, original.trace);
  return result;
}
test('scrollend preserves complete source helper behavior and one payload read', async () => {
  assert.deepEqual(cases.map(item => item.name), [name]);
  assert.equal(await compare(valid), true);
  const env = environment();
  await runYaml(env);
  assert.deepEqual(env.trace.filter(row => row[0] === 'wait'), [['wait', 300], [
    'wait',
    200,
  ]]);
  assert.equal(env.trace.filter(row => row[0] === 'innerHTML').length, 1);
});
test('scrollend retains weak non-undefined field assertions, not numeric constraints', async () => {
  for (const value of [null, '', 'not-a-number', false, 0, -1, [], {}]) {
    assert.equal(
      await compare(Object.fromEntries(fields.map(field => [field, value]))),
      true,
    );
  }
  for (const missing of fields) {
    const detail = { ...valid };
    delete detail[missing];
    assert.equal(await compare(detail), false);
  }
});
test('scrollend rejects wrong events, malformed payloads and missing DOM without polling', async () => {
  assert.equal(await compare(valid, 'scroll'), false);
  assert.equal(await compare(null), false);
  for (
    const mode of [
      'missing-host',
      'missing-shadow',
      'missing-target',
      'invalid-json',
      'missing-detail',
    ]
  ) {
    assert.equal(await compare(valid, 'scrollend', mode), false);
  }
});
test('original scrollend callback has no browser guard', async () => {
  for (const browserName of ['chromium', 'firefox', 'webkit']) {
    await runSource(environment(), browserName);
  }
  assert.doesNotMatch(callback.getText(source), /test\.(skip|fixme)/);
});
