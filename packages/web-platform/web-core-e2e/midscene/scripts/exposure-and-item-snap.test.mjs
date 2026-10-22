import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const definitions = [
  {
    name: 'api-exposure-area',
    sourcePath: '../../tests/reactlynx.spec.ts',
    suite: 'web-core',
    goto: 'goto',
  },
  {
    name: 'web-elements/x-list/item-snap',
    sourcePath: '../../../web-elements/tests/web-elements.spec.ts',
    suite: 'web-elements',
    goto: 'gotoWebComponentPage',
  },
];
const cases = YAML.parse(readFileSync(
  new URL(
    '../cases/web-pixels/exposure-and-item-snap.yaml',
    import.meta.url,
  ),
  'utf8',
)).cases;
const compile = node =>
  ts.transpile('(' + node.getText() + ')', { target: ts.ScriptTarget.ES2022 });
for (const definition of definitions) {
  const source = ts.createSourceFile(
    definition.sourcePath,
    readFileSync(
      new URL(
        definition.sourcePath,
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const helpers = new Map();
  let callback;
  function visit(node, group = '') {
    if (
      ts.isCallExpression(node)
      && node.expression.getText(source) === 'test.describe'
    ) {
      group = node.arguments[0]?.text ?? group;
    }
    if (
      ts.isVariableDeclaration(node)
      && [definition.goto, 'diffScreenShot', 'wait'].includes(
        node.name.getText(source),
      )
    ) {
      helpers.set(node.name.getText(source), node.initializer);
    }
    if (
      ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    ) {
      const title = node.arguments[0]?.text;
      if (
        title === definition.name
        || (group === 'x-list' && title === 'item-snap')
      ) {
        assert.ok(!callback);
        callback = node.arguments[1];
      }
    }
    ts.forEachChild(node, child => visit(child, group));
  }
  visit(source);
  assert.ok(callback);
  definition.callback = callback;
  definition.helpers = helpers;
}
function environment(mode, suite) {
  const trace = [];
  const content = {
    scrollTo: value =>
      trace.push(['scrollTo', JSON.parse(JSON.stringify(value))]),
    scrollBy: (...args) => trace.push(['scrollBy', ...args]),
  };
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
            return mode === 'missing-content' ? null : content;
          },
        },
      };
    },
  };
  const page = {
    goto: async (url, options) => {
      trace.push(['goto', url, JSON.parse(JSON.stringify(options))]);
    },
    evaluate: fn => fn(),
  };
  return {
    trace,
    document,
    page,
    module: 'exposure',
    isSSR: false,
    getTitle: titles => titles.slice(-2).join('/'),
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
    },
    test: {
      skip() {
        throw new Error('skipped');
      },
    },
    expect(actual) {
      assert.equal(actual, page);
      return {
        async toHaveScreenshot(path, options) {
          trace.push([
            'pixels',
            suite,
            path.join('/').replace(/\.png$/, ''),
            JSON.parse(JSON.stringify(options)),
          ]);
        },
      };
    },
  };
}
async function runOriginal(definition, env, browserName = 'chromium') {
  for (const [name, node] of definition.helpers) {
    env[name] = runInNewContext(compile(node), env);
  }
  return runInNewContext(compile(definition.callback), env)({
    page: env.page,
    browserName,
  }, { title: definition.name, titlePath: ['suite', 'x-list', 'item-snap'] });
}
async function runYaml(item, env) {
  for (const step of item.steps) {
    assert.equal(Object.keys(step).length, 1);
    if (step.recordToReport) continue;
    if (step.gotoUrl) {
      const url = step.gotoUrl.replace('${shellUrl}', '/').replace(
        '${elementsUrl}',
        '/',
      );
      await env.page.goto(url, { waitUntil: 'load' });
    } else if (step.javascript) await runInNewContext(step.javascript, env);
    else if (step['web.pixels']) {
      const pixel = step['web.pixels'];
      env.trace.push(['pixels', pixel.suite ?? 'web-core', pixel.baseline, {
        maxDiffPixelRatio: 0,
        fullPage: true,
        animations: 'allow',
      }]);
    } else assert.fail('Unexpected node: ' + Object.keys(step)[0]);
  }
}
test('programmatic scroll batch contains two originals and six unchanged Linux PNGs', () => {
  assert.deepEqual(
    cases.map(item => item.name),
    definitions.map(item => item.name),
  );
  const pixels = cases.flatMap(item => item.steps).filter(step =>
    step['web.pixels']
  );
  assert.equal(pixels.length, 6);
  for (const step of pixels) {
    const pixel = step['web.pixels'];
    const prefix = pixel.suite === 'web-elements'
      ? '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
      : '../../tests/reactlynx.spec.ts-snapshots/';
    assert.ok(
      existsSync(
        new URL(
          prefix + pixel.baseline + '-chromium-linux.png',
          import.meta.url,
        ),
      ),
    );
  }
});
for (const definition of definitions) {
  test(
    definition.name
      + ' retains helper behavior, exact scrolling, waits and snapshots',
    async () => {
      for (
        const mode of [
          'present',
          'missing-host',
          'missing-shadow',
          'missing-content',
        ]
      ) {
        const original = environment(mode, definition.suite),
          translated = environment(mode, definition.suite);
        const outcome = promise =>
          promise.then(() => 'passed', error => error.name);
        assert.equal(
          await outcome(runYaml(
            cases.find(item => item.name === definition.name),
            translated,
          )),
          await outcome(runOriginal(definition, original)),
          mode,
        );
        assert.deepEqual(translated.trace, original.trace, mode);
      }
    },
  );
}
test('item-snap retains its original WebKit skip', async () => {
  await assert.rejects(
    runOriginal(
      definitions[1],
      environment('present', 'web-elements'),
      'webkit',
    ),
    /skipped/,
  );
  await runOriginal(
    definitions[1],
    environment('present', 'web-elements'),
    'firefox',
  );
});
