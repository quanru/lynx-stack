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
const cases = YAML.parse(
  readFileSync(
    new URL('../cases/web-pixels/elements-list-layout.yaml', import.meta.url),
    'utf8',
  ),
).cases;
const names = [
  'recyclable-false',
  'waterfall-size-change',
  'waterfall-insert',
  'list-type-change',
];
const callbacks = new Map();
function visit(node, group = '') {
  if (
    ts.isCallExpression(node)
    && node.expression.getText(source) === 'test.describe'
  ) group = node.arguments[0]?.text ?? group;
  if (
    group === 'x-list' && ts.isCallExpression(node)
    && node.expression.getText(source) === 'test'
    && names.includes(node.arguments[0]?.text)
  ) {
    const name = node.arguments[0].text;
    assert.ok(!callbacks.has(name));
    callbacks.set(name, node.arguments[1]);
  }
  ts.forEachChild(node, child => visit(child, group));
}
visit(source);

// Compare executed source and YAML operations, including exact insertion bytes.
// This is a source-contract test, not a browser or PNG acceptance test.
function environment(missing = false) {
  const trace = [];
  const document = {
    fonts: { ready: Promise.resolve() },
    querySelector(selector) {
      trace.push(['query', selector]);
      if (missing) return null;
      return {
        style: { setProperty: (...args) => trace.push(['style', ...args]) },
        insertAdjacentHTML: (...args) => trace.push(['insert', ...args]),
        setAttribute: (...args) => trace.push(['attribute', ...args]),
      };
    },
  };
  const page = {
    evaluate: fn => fn(),
    locator(selector) {
      return { first: () => ({ selector, index: 0 }) };
    },
  };
  return {
    trace,
    page,
    document,
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
    },
    getTitle: titles => titles.slice(-2).join('/'),
    async gotoWebComponentPage(actual, title) {
      assert.equal(actual, page);
      trace.push(['goto', '${elementsUrl}tests/fixtures/' + title + '.html']);
    },
    async wait(ms) {
      trace.push(['wait', ms]);
    },
    async diffScreenShot(actual, title, subcase, ...options) {
      assert.equal(actual, page);
      assert.deepEqual(options, []);
      trace.push(['pixels', {
        suite: 'web-elements',
        baseline: title + '/' + subcase,
      }]);
    },
    expect(locator) {
      return {
        async toHaveCSS(css, equals) {
          trace.push(['expect', { ...locator, css, equals }]);
        },
      };
    },
  };
}

async function runOriginal(name, env) {
  const callback = runInNewContext(
    ts.transpile('(' + callbacks.get(name).getText(source) + ')', {
      target: ts.ScriptTarget.ES2022,
    }),
    env,
  );
  await callback({ page: env.page, browserName: 'chromium' }, {
    titlePath: ['suite', 'x-list', name],
  });
}
async function runYaml(item, env) {
  for (const step of item.steps) {
    assert.equal(Object.keys(step).length, 1);
    if (step.recordToReport) continue;
    if (step.gotoUrl) env.trace.push(['goto', step.gotoUrl]);
    else if (step.javascript) await runInNewContext(step.javascript, env);
    else if (step['web.pixels']) env.trace.push(['pixels', step['web.pixels']]);
    else if (step['web.expect']) env.trace.push(['expect', step['web.expect']]);
    else assert.fail('Unexpected action: ' + Object.keys(step)[0]);
  }
}

test('list layout batch contains exactly four source callbacks and nine PNG checkpoints', () => {
  assert.deepEqual([...callbacks.keys()], names);
  assert.deepEqual(
    cases.map(item => item.name),
    names.map(name => 'web-elements/x-list/' + name),
  );
  assert.equal(
    cases.flatMap(item => item.steps).filter(step => step['web.pixels']).length,
    9,
  );
  assert.equal(
    cases.flatMap(item => item.steps).filter(step => step['web.expect']).length,
    1,
  );
  for (const item of cases) {
    assert.equal(item.steps.filter(step => step.recordToReport).length, 2);
  }
});

for (const name of names) {
  test(
    name
      + ' preserves the original operation sequence and missing-element behavior',
    async () => {
      const item = cases.find(item => item.name.endsWith('/' + name));
      for (const missing of [false, true]) {
        const original = environment(missing),
          translated = environment(missing);
        const expected = await runOriginal(name, original).then(
          () => 'passed',
          error => error.name,
        );
        const actual = await runYaml(item, translated).then(
          () => 'passed',
          error => error.name,
        );
        assert.equal(actual, expected);
        assert.deepEqual(translated.trace, original.trace);
      }
    },
  );
}
