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
    '../cases/web-pixels/elements-selection-api.yaml',
    import.meta.url,
  ),
  'utf8',
)).cases;
const names = [
  'x-viewpager-ng/select-index-0',
  'x-input/method-select',
  'x-input/method-setSelectionRange',
  'x-text/text-maxline-with-custom-truncation-innertext-change',
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
    const title = node.arguments[0]?.text;
    const name = title?.includes('/') ? title : group + '/' + title;
    if (names.includes(name)) {
      assert.ok(!callbacks.has(name));
      callbacks.set(name, node.arguments[1]);
    }
  }
  ts.forEachChild(node, child => visit(child, group));
}
visit(source);

// These are source-contract checks, not browser or Linux PNG acceptance.
function environment(mode = 'present') {
  const trace = [];
  let now = 0;
  let queries = 0;
  const target = {
    setAttribute: (...args) => trace.push(['attribute', ...args]),
    select: () => trace.push(['select']),
    setSelectionRange: arg =>
      trace.push(['selection', JSON.parse(JSON.stringify(arg))]),
    childNodes: [{
      set data(value) {
        trace.push(['text', value]);
      },
    }],
  };
  function matches(selector) {
    assert.equal(selector, '#target');
    queries++;
    if (mode === 'duplicate') return [target, target];
    if (mode === 'missing' || (mode === 'delayed' && queries === 1)) return [];
    return [target];
  }
  const document = {
    fonts: { ready: Promise.resolve() },
    querySelectorAll: matches,
  };
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
    document,
    page,
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
    gotoWebComponentPage: async (actual, fixture) => {
      assert.equal(actual, page);
      trace.push(['goto', '${elementsUrl}tests/fixtures/' + fixture + '.html']);
    },
    diffScreenShot: async (actual, title, subcase, options) => {
      assert.equal(actual, page);
      assert.ok(options === undefined || options.animations === 'allow');
      trace.push(['pixels', {
        suite: 'web-elements',
        baseline: title + '/' + subcase,
      }]);
    },
  };
}
async function runSource(name, env, browserName = 'chromium') {
  const callback = runInNewContext(
    ts.transpile('(' + callbacks.get(name).getText(source) + ')', {
      target: ts.ScriptTarget.ES2022,
    }),
    env,
  );
  return callback({ page: env.page, browserName }, {
    title: name,
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
test('selection/API batch maps four distinct originals and six PNG checkpoints', () => {
  assert.deepEqual([...callbacks.keys()].sort(), [...names].sort());
  assert.deepEqual(
    cases.map(item => item.name),
    names.map(name => 'web-elements/' + name),
  );
  assert.equal(
    cases.flatMap(item => item.steps).filter(step => step['web.pixels']).length,
    6,
  );
  // Preserve the original screenshot defaults, not just baseline identifiers.
  const text = source.text;
  assert.match(text, /maxDiffPixelRatio: 0,/);
  assert.match(text, /fullPage: true,/);
  assert.match(text, /animations: 'allow',/);
});
for (const name of names) {
  test(
    name
      + ' preserves source operations, waits and locator attachment semantics',
    async () => {
      for (const mode of ['present', 'delayed', 'missing', 'duplicate']) {
        const original = environment(mode), translated = environment(mode);
        const outcome = action =>
          action.then(() => 'passed', error => error.name);
        assert.equal(
          await outcome(runYaml(
            cases.find(item => item.name === 'web-elements/' + name),
            translated,
          )),
          await outcome(runSource(name, original)),
        );
        assert.deepEqual(translated.trace, original.trace);
      }
    },
  );
}
test('selection source browser guards remain explicit acceptance boundaries', async () => {
  await assert.rejects(
    runSource('x-input/method-select', environment(), 'webkit'),
    /skipped/,
  );
  await assert.rejects(
    runSource('x-input/method-setSelectionRange', environment(), 'firefox'),
    /skipped/,
  );
  await runSource('x-input/method-setSelectionRange', environment(), 'webkit');
});

test('all six checkpoints reference unchanged Chromium Linux baselines', () => {
  for (const item of cases) {
    for (const step of item.steps) {
      if (!step['web.pixels']) continue;
      assert.ok(
        existsSync(
          new URL(
            '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
              + step['web.pixels'].baseline + '-chromium-linux.png',
            import.meta.url,
          ),
        ),
        step['web.pixels'].baseline,
      );
    }
  }
});
