import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';
import {
  expectWebPixels,
  originalPixelOptions,
  pixelOptions,
} from '../web-pixels.ts';

const names = [
  'api-exposure-basic',
  'api-exposure-dynamic-screen-margin',
  'api-exposure-dynamic-ui-margin',
];
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
const callbacks = new Map(), helpers = new Map();
function visit(node) {
  if (
    ts.isVariableDeclaration(node)
    && ['goto', 'wait', 'diffScreenShot'].includes(node.name.getText(source))
  ) {
    helpers.set(node.name.getText(source), node.initializer);
  }
  if (
    ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    && names.includes(node.arguments[0]?.text)
  ) {
    assert.ok(!callbacks.has(node.arguments[0].text));
    callbacks.set(node.arguments[0].text, node.arguments[1]);
  }
  ts.forEachChild(node, visit);
}
visit(source);
const cases = YAML.parse(
  readFileSync(
    new URL('../cases/web-pixels/exposure-viewport.yaml', import.meta.url),
    'utf8',
  ),
).cases;
const compile = node =>
  ts.transpile('(' + node.getText(source) + ')', {
    target: ts.ScriptTarget.ES2022,
  });

function environment(mode = 'present') {
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
              scrollTo(value) {
                trace.push([
                  'scrollTo',
                  inner,
                  JSON.parse(JSON.stringify(value)),
                ]);
              },
              set scrollTop(value) {
                trace.push(['scrollTop', inner, value]);
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
    module: 'exposure',
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
    },
    test: {
      skip(condition) {
        if (condition) throw new Error('skipped');
      },
    },
    expect(actual) {
      assert.equal(actual, page);
      return {
        async toHaveScreenshot(path, options) {
          trace.push([
            'pixels',
            path.join('/').replace(/\.png$/, ''),
            JSON.parse(JSON.stringify(options)),
          ]);
        },
      };
    },
  };
}
function runSource(name, env, browserName = 'chromium') {
  for (const [key, node] of helpers) {
    env[key] = runInNewContext(compile(node), env);
  }
  return runInNewContext(compile(callbacks.get(name)), env)({
    page: env.page,
    browserName,
  }, { title: name });
}
async function runYaml(item, env) {
  for (const step of item.steps) {
    assert.equal(Object.keys(step).length, 1);
    if (step.recordToReport) continue;
    if (step.gotoUrl) {
      await env.page.goto(step.gotoUrl.replace('${shellUrl}', '/'), {
        waitUntil: 'load',
      });
    } else if (step.javascript) await runInNewContext(step.javascript, env);
    else if (step['web.pixels']) {
      assert.deepEqual(Object.keys(step['web.pixels']), ['baseline']);
      const baseline = step['web.pixels'].baseline;
      const { maxDiffPixelRatio, fullPage, animations } = originalPixelOptions(
        baseline,
      );
      env.trace.push(['pixels', baseline, {
        maxDiffPixelRatio,
        fullPage,
        animations,
      }]);
    } else assert.fail('Unexpected node');
  }
}
test('exposure viewport batch retains three complete source callbacks and thirteen checkpoints', () => {
  assert.deepEqual([...callbacks.keys()], names);
  assert.deepEqual(cases.map(item => item.name), names);
  assert.equal(
    cases.flatMap(item => item.steps).filter(step => step['web.pixels']).length,
    13,
  );
  assert.equal(
    cases.flatMap(item => item.steps).filter(step =>
      step.javascript?.includes('setTimeout')
    ).length,
    23,
  );
});
for (const name of names) {
  test(
    name
      + ' preserves all original helper options, operation arguments and waits',
    async () => {
      for (
        const mode of [
          'present',
          'missing-host',
          'missing-shadow',
          'missing-target',
        ]
      ) {
        const original = environment(mode), translated = environment(mode);
        const outcome = action =>
          action.then(() => 'passed', error => error.name);
        assert.equal(
          await outcome(runYaml(
            cases.find(item => item.name === name),
            translated,
          )),
          await outcome(runSource(name, original)),
          mode,
        );
        assert.deepEqual(translated.trace, original.trace, mode);
      }
    },
  );
}
test('only basic excludes Firefox; the two dynamic callbacks preserve every original browser', async () => {
  await assert.rejects(
    runSource(names[0], environment(), 'firefox'),
    /skipped/,
  );
  for (const name of names) {
    await runSource(name, environment(), 'webkit');
    if (name !== names[0]) await runSource(name, environment(), 'firefox');
  }
});
test('viewport-only options are exact source checkpoints and never cross suite boundaries', async () => {
  const originals = [];
  for (const name of names) {
    const env = environment();
    await runSource(name, env);
    originals.push(...env.trace.filter(row => row[0] === 'pixels'));
  }
  assert.equal(originals.filter(row => !row[2].fullPage).length, 10);
  for (const [, baseline, options] of originals) {
    assert.deepEqual(originalPixelOptions(baseline), {
      ...pixelOptions,
      ...options,
    });
    assert.deepEqual(
      originalPixelOptions(baseline, 'web-elements'),
      pixelOptions,
    );
    assert.deepEqual(originalPixelOptions(baseline + '-other'), pixelOptions);
    const mutable = originalPixelOptions(baseline);
    mutable.fullPage = !options.fullPage;
    assert.equal(originalPixelOptions(baseline).fullPage, options.fullPage);
  }
  assert.deepEqual(
    originalPixelOptions('exposure/api-exposure-basic/unknown'),
    pixelOptions,
  );
});
test('all thirteen real baseline bytes and original options reach the pinned screenshot backend', async () => {
  const calls = [];
  const page = {
    async _expectScreenshot(options) {
      calls.push(options);
      return {};
    },
  };
  for (const name of names) {
    const env = environment();
    await runSource(name, env);
    for (
      const [, baseline, options] of env.trace.filter(row =>
        row[0] === 'pixels'
      )
    ) {
      const expected = readFileSync(
        new URL(
          '../../tests/reactlynx.spec.ts-snapshots/' + baseline
            + '-chromium-linux.png',
          import.meta.url,
        ),
      );
      await expectWebPixels(page, baseline, 'exposure-contract');
      assert.deepEqual(calls.at(-1), { ...pixelOptions, ...options, expected });
    }
  }
  assert.equal(calls.length, 13);
});
