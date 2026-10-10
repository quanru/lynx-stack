import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';
import {
  assertPixelEnvironment,
  pixelLaunchArgs,
  pixelOptions,
  expectWebPixels,
} from '../web-pixels.ts';

const require = createRequire(import.meta.url);
const source = readFileSync(
  new URL('../../tests/reactlynx.spec.ts', import.meta.url),
  'utf8',
);
const ast = ts.createSourceFile(
  'original.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
);
const originals = new Map();
function find(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) originals.set(node.arguments[0].text, node.arguments[1].body);
  ts.forEachChild(node, find);
}
find(ast);

test('forty layout pixel cases retain every original statement and never enable skipped tests', () => {
  const cases = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/layouts.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  assert.equal(cases.length, 40);
  for (const item of cases) {
    const body = originals.get(item.name);
    assert.ok(body, 'Must be an enabled literal test declaration');
    assert.deepEqual(body.statements.map(s => s.getText(ast)), [
      'await goto(page, title);',
      'await diffScreenShot(page, title, \'index\');',
    ]);
    assert.deepEqual(item.steps, [
      { gotoUrl: '${shellUrl}?casename=' + item.name },
      { javascript: 'document.fonts.ready.then(() => true)' },
      { recordToReport: 'Before the original layout pixel contract' },
      { 'web.pixels': { baseline: item.name + '/index/index' } },
      { recordToReport: 'Original layout baseline passed' },
    ]);
    assert.ok(
      existsSync(
        new URL(
          '../../tests/reactlynx.spec.ts-snapshots/' + item.name
            + '/index/index-chromium-linux.png',
          import.meta.url,
        ),
      ),
    );
  }
  assert.equal(
    cases.some(c => c.name === 'linear-item-use-order-affect-z-layout'),
    false,
  );
});

test('pixel translations preserve original snapshot paths and waits without replacing assertions or updating baselines', () => {
  const cases = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/static.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  assert.equal(cases.length, 8);
  for (const item of cases) {
    const body = originals.get(item.name), waits = [], baselines = [];
    function inspect(node) {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(ast);
        if (name === 'wait') waits.push(Number(node.arguments[0].getText(ast)));
        if (name === 'diffScreenShot') {
          assert.ok(
            node.arguments.length <= 4,
            'No screenshot option overrides in this batch',
          );
          const args = node.arguments.slice(1).map(a =>
            a.getText(ast) === 'title' ? item.name : a.text
          );
          if (args.length === 2) args.push('index');
          baselines.push(args.join('/'));
        }
        assert.ok(
          !/\.to[A-Z]|\.(click|fill|press)$/.test(name),
          'Do not drop another assertion/action',
        );
      }
      ts.forEachChild(node, inspect);
    }
    inspect(body);
    assert.equal(item.steps[0].gotoUrl, '${shellUrl}?casename=' + item.name);
    assert.equal(
      item.steps[1].javascript,
      'document.fonts.ready.then(() => true)',
    );
    assert.match(
      source,
      /await page\.evaluate\(\(\) => document\.fonts\.ready\)/,
    );
    assert.deepEqual(
      item.steps.filter(s =>
        s.javascript && s.javascript !== 'document.fonts.ready.then(() => true)'
      ).map(s => Number(/, (\d+)\)\)$/.exec(s.javascript)[1])),
      waits,
    );
    assert.deepEqual(
      item.steps.filter(s => s['web.pixels']).map(s =>
        s['web.pixels'].baseline
      ),
      baselines,
    );
    assert.deepEqual(item.steps.map(s => Object.keys(s)[0]), [
      'gotoUrl',
      'javascript',
      'javascript',
      'recordToReport',
      'web.pixels',
      'recordToReport',
    ]);
    for (const baseline of baselines) {
      assert.ok(
        existsSync(
          new URL(
            '../../tests/reactlynx.spec.ts-snapshots/' + baseline
              + '-chromium-linux.png',
            import.meta.url,
          ),
        ),
      );
    }
  }
});

test('pixel backend retains original launch args and pinned matcher defaults, rejecting unsupported environments', () => {
  const config = ts.createSourceFile(
    'config.ts',
    readFileSync(
      new URL(
        '../../../playwright-fixtures/src/playwright.common.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  let args;
  function inspect(node) {
    if (
      ts.isPropertyAssignment(node) && node.name.getText(config) === 'args'
      && ts.isArrayLiteralExpression(node.initializer)
    ) args = node.initializer.elements.map(e => e.text);
    ts.forEachChild(node, inspect);
  }
  inspect(config);
  assert.deepEqual(pixelLaunchArgs, args);
  assert.match(config.text, /\.\.\.devices\['Pixel 5'\]/);
  assert.match(config.text, /LIBGL_ALWAYS_SOFTWARE'\] = 'true'/);
  assert.match(config.text, /GALLIUM_HUD_SCALE'\] = '1'/);
  assert.match(
    source,
    /maxDiffPixelRatio: 0,\s+fullPage: true,\s+animations: 'allow'/,
  );
  assert.deepEqual(pixelOptions, {
    fullPage: true,
    animations: 'allow',
    caret: 'hide',
    scale: 'css',
    maxDiffPixelRatio: 0,
    timeout: 5000,
    isNot: false,
  });
  const matcher = readFileSync(
    resolve(dirname(require.resolve('playwright')), 'lib/matchers/expect.js'),
    'utf8',
  );
  assert.match(matcher, /caret: helper\.options\.caret \?\? "hide"/);
  assert.match(matcher, /scale: helper\.options\.scale \?\? "css"/);
  assert.match(matcher, /threshold: helper\.options\.threshold/);
  assert.match(matcher, /page\._expectScreenshot\(expectScreenshotOptions\)/);
  assertPixelEnvironment('linux', '1.61.1');
  for (const platform of ['darwin', 'win32']) {
    assert.throws(
      () => assertPixelEnvironment(platform, '1.61.1'),
      /require Linux/,
    );
  }
  assert.throws(
    () => assertPixelEnvironment('linux', '1.61.2'),
    /pinned Playwright/,
  );
});

test('pixel adapter passes original PNG bytes to the backend and never creates missing baselines', async () => {
  const baseline = 'text/nest-text/index';
  const expected = readFileSync(
    new URL(
      '../../tests/reactlynx.spec.ts-snapshots/' + baseline
        + '-chromium-linux.png',
      import.meta.url,
    ),
  );
  let called = false;
  await expectWebPixels(
    {
      async _expectScreenshot(options) {
        called = true;
        assert.deepEqual(options, { ...pixelOptions, expected });
        return {};
      },
    },
    baseline,
    'offline-contract',
  );
  assert.equal(called, true);
  await assert.rejects(
    expectWebPixels({}, baseline, 'offline-contract'),
    /backend is unavailable/,
  );
  await assert.rejects(
    expectWebPixels({}, 'not-present/never-created/index', 'offline-contract'),
    /ENOENT/,
  );
  assert.equal(
    existsSync(
      new URL(
        '../../tests/reactlynx.spec.ts-snapshots/not-present/never-created/index-chromium-linux.png',
        import.meta.url,
      ),
    ),
    false,
  );
  for (
    const bad of [
      '../text/nest-text/index',
      '/text/nest-text/index',
      'text//index',
    ]
  ) {
    await assert.rejects(
      expectWebPixels({}, bad, 'offline-contract'),
      /Invalid/,
    );
  }
  await assert.rejects(expectWebPixels({}, baseline, '../escape'), /Invalid/);
  await assert.rejects(
    expectWebPixels(
      {
        async _expectScreenshot() {
          return null;
        },
      },
      baseline,
      'offline-contract',
    ),
    /Invalid Playwright/,
  );
});
