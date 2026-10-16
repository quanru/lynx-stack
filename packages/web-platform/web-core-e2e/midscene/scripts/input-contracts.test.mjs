import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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
const cases = YAML.parse(readFileSync(
  new URL(
    '../cases/web-pixels/elements-input-contracts.yaml',
    import.meta.url,
  ),
  'utf8',
)).cases;
const names = [
  'x-input/attribute-autocomplete',
  'x-textarea/method-setSelectionRange',
];
const callbacks = new Map();
function visit(node, group = '') {
  if (
    ts.isCallExpression(node)
    && node.expression.getText(source) === 'test.describe'
  ) {
    group = node.arguments[0]?.text ?? group;
  }
  if (ts.isCallExpression(node) && node.expression.getText(source) === 'test') {
    const name = group + '/' + node.arguments[0]?.text;
    if (names.includes(name)) {
      assert.ok(!callbacks.has(name));
      callbacks.set(name, node.arguments[1]);
    }
  }
  ts.forEachChild(node, child => visit(child, group));
}
visit(source);

// Exact source and translated traces, including reads that must not be retried.
function environment(mode) {
  const trace = [];
  let queries = 0, now = 0;
  const input = {
    getAttribute(name) {
      trace.push(['attribute-read', name]);
      return mode === 'wrong-value' ? 'email' : 'username';
    },
  };
  const target = {
    shadowRoot: mode === 'no-shadow' ? null : {
      querySelector(selector) {
        trace.push(['shadow-query', selector]);
        return mode === 'no-input' ? null : input;
      },
    },
    setSelectionRange(value) {
      trace.push(['selection', JSON.parse(JSON.stringify(value))]);
    },
  };
  function matches(selector) {
    assert.equal(selector, '#target');
    queries++;
    if (mode === 'duplicate') return [target, target];
    if (mode === 'missing' || (mode === 'delayed' && queries === 1)) return [];
    return [target];
  }
  const page = {
    locator(selector) {
      return {
        async evaluate(fn) {
          const deadline = now + 30000;
          for (;;) {
            const found = matches(selector);
            if (found.length > 1) throw new Error('strictness');
            if (found.length === 1) return fn(found[0]);
            if (now >= deadline) throw new Error('attachment');
            now += 15000;
          }
        },
      };
    },
  };
  return {
    trace,
    page,
    document: {
      fonts: { ready: Promise.resolve() },
      querySelectorAll: matches,
    },
    Date: { now: () => now },
    requestAnimationFrame(fn) {
      now += 15000;
      fn();
    },
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
    },
    wait: async ms => {
      trace.push(['wait', ms]);
    },
    getTitle: titles => titles.slice(-2).join('/'),
    test: {
      skip(condition) {
        if (condition) throw new Error('skipped');
      },
    },
    expect(actual) {
      return {
        toBe(expected) {
          assert.equal(actual, expected);
        },
      };
    },
    gotoWebComponentPage: async (_page, fixture) => {
      trace.push(['goto', '${elementsUrl}tests/fixtures/' + fixture + '.html']);
    },
    diffScreenShot: async (_page, title, subcase) => {
      trace.push(['pixels', {
        suite: 'web-elements',
        baseline: title + '/' + subcase,
      }]);
    },
  };
}
function runSource(name, env, browserName = 'chromium') {
  const callback = runInNewContext(
    ts.transpile('(' + callbacks.get(name).getText(source) + ')', {
      target: ts.ScriptTarget.ES2022,
    }),
    env,
  );
  return callback({ page: env.page, browserName }, {
    titlePath: ['suite', ...name.split('/')],
  });
}
async function runYaml(item, env) {
  for (const step of item.steps) {
    assert.equal(Object.keys(step).length, 1);
    if (step.recordToReport) continue;
    if (step.gotoUrl) env.trace.push(['goto', step.gotoUrl]);
    else if (step.javascript) await runInNewContext(step.javascript, env);
    else if (step['web.pixels']) env.trace.push(['pixels', step['web.pixels']]);
    else assert.fail('Unexpected action: ' + Object.keys(step)[0]);
  }
}
test('input batch maps only the two original source contracts', () => {
  assert.deepEqual([...callbacks.keys()], names);
  assert.deepEqual(
    cases.map(item => item.name),
    names.map(name => 'web-elements/' + name),
  );
});
for (const name of names) {
  test(
    name + ' preserves the original operation and single-read failure sequence',
    async () => {
      for (
        const mode of [
          'present',
          'delayed',
          'missing',
          'duplicate',
          'no-shadow',
          'no-input',
          'wrong-value',
        ]
      ) {
        const original = environment(mode), translated = environment(mode);
        const passed = action => action.then(() => true, () => false);
        assert.equal(
          await passed(runYaml(
            cases.find(item => item.name === 'web-elements/' + name),
            translated,
          )),
          await passed(runSource(name, original)),
          mode,
        );
        assert.deepEqual(translated.trace, original.trace, mode);
      }
    },
  );
}
test('textarea retains the original alias, Firefox guard and original PNG', async () => {
  await assert.rejects(
    runSource(names[1], environment(), 'firefox'),
    /skipped/,
  );
  await runSource(names[1], environment(), 'webkit');
  const item = cases[1];
  assert.equal(
    item.steps[0].gotoUrl,
    '${elementsUrl}tests/fixtures/x-input/method.html',
  );
  assert.ok(existsSync(
    new URL(
      '../../../web-elements/tests/web-elements.spec.ts-snapshots/x-textarea/method-setSelectionRange/select-ll-chromium-linux.png',
      import.meta.url,
    ),
  ));
});
