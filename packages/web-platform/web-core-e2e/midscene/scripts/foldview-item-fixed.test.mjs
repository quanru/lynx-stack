import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const name = 'x-foldview-ng/item-fixed';
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
const helpers = new Map();
let callback;
function visit(node) {
  if (
    ts.isVariableDeclaration(node)
    && ['gotoWebComponentPage', 'diffScreenShot', 'wait'].includes(
      node.name.getText(source),
    )
  ) {
    helpers.set(node.name.getText(source), node.initializer);
  }
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
const cases = YAML.parse(readFileSync(
  new URL(
    '../cases/web-pixels/foldview-item-fixed.yaml',
    import.meta.url,
  ),
  'utf8',
)).cases;
const compile = node =>
  ts.transpile('(' + node.getText(source) + ')', {
    target: ts.ScriptTarget.ES2022,
  });

function environment(missing) {
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
      return missing
        ? null
        : { scrollBy: (...args) => trace.push(['scrollBy', ...args]) };
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
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
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
test('foldview preserves the original helper and callback trace including missing host behavior', async () => {
  assert.deepEqual(cases.map(item => item.name), ['web-elements/' + name]);
  for (const missing of [false, true]) {
    const original = environment(missing), translated = environment(missing);
    for (const [key, node] of helpers) {
      original[key] = runInNewContext(compile(node), original);
    }
    await runInNewContext(compile(callback), original)(
      { page: original.page },
      { title: name },
    );
    for (const step of cases[0].steps) {
      assert.equal(Object.keys(step).length, 1);
      if (step.recordToReport) continue;
      if (step.gotoUrl) {
        await translated.page.goto(
          step.gotoUrl.replace('${elementsUrl}', '/'),
          { waitUntil: 'load' },
        );
      } else if (step.javascript) {
        await runInNewContext(step.javascript, translated);
      } else if (step['web.pixels']) {
        translated.trace.push(['pixels', step['web.pixels'].baseline, {
          maxDiffPixelRatio: 0,
          fullPage: true,
          animations: 'allow',
        }]);
      } else assert.fail('Unexpected node');
    }
    assert.deepEqual(translated.trace, original.trace);
  }
});
test('foldview uses both unchanged Chromium Linux PNGs', () => {
  const pixels = cases[0].steps.filter(step => step['web.pixels']);
  assert.equal(pixels.length, 2);
  for (const step of pixels) {
    assert.equal(step['web.pixels'].suite, 'web-elements');
    assert.ok(existsSync(
      new URL(
        '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
          + step['web.pixels'].baseline + '-chromium-linux.png',
        import.meta.url,
      ),
    ));
  }
});
