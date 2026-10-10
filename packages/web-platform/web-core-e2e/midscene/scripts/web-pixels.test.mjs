import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
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

test('twelve component pixels retain scoped baseline names, original waits and only identical matcher options', () => {
  const document = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/components.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(document.cases.length, 12);
  assert.deepEqual(document.afterEach, [{
    recordToReport: 'Original component pixel contract result',
  }]);
  for (const item of document.cases) {
    const body = originals.get(item.name);
    assert.ok(body);
    const steps = [{ gotoUrl: '${shellUrl}?casename=' + item.name }, {
      javascript: 'document.fonts.ready.then(() => true)',
    }];
    assert.equal(body.statements[0].getText(ast), 'await goto(page, title);');
    let cursor = 1;
    const next = body.statements[cursor].expression.expression;
    if (next.expression.getText(ast) === 'wait') {
      assert.equal(next.arguments.length, 1);
      assert.ok(ts.isNumericLiteral(next.arguments[0]));
      steps.push({
        javascript: 'new Promise(resolve => setTimeout(() => resolve(true), '
          + next.arguments[0].text + '))',
      });
      cursor++;
    }
    assert.equal(
      body.statements.length,
      cursor + 1,
      'No action/skip/assertion may be dropped',
    );
    const call = body.statements[cursor].expression.expression;
    assert.equal(call.expression.getText(ast), 'diffScreenShot');
    assert.equal(call.arguments[0].getText(ast), 'page');
    assert.ok(call.arguments.length >= 3 && call.arguments.length <= 5);
    function scopedLiteral(arg) {
      if (ts.isStringLiteral(arg)) return arg.text;
      if (arg.getText(ast) === 'title') return item.name;
      assert.ok(['elementName', 'module'].includes(arg.getText(ast)));
      for (let scope = call.parent; scope; scope = scope.parent) {
        if (!ts.isBlock(scope)) continue;
        for (const statement of scope.statements) {
          if (!ts.isVariableStatement(statement)) continue;
          for (const declaration of statement.declarationList.declarations) {
            if (declaration.name.getText(ast) === arg.getText(ast)) {
              assert.ok(ts.isStringLiteral(declaration.initializer));
              return declaration.initializer.text;
            }
          }
        }
      }
      assert.fail('Missing original scoped snapshot name');
    }
    const parts = [
      scopedLiteral(call.arguments[1]),
      scopedLiteral(call.arguments[2]),
    ];
    const label = call.arguments[3];
    parts.push(
      !label || label.getText(ast) === 'undefined'
        ? 'index'
        : scopedLiteral(label),
    );
    if (call.arguments[4]) {
      assert.ok(ts.isObjectLiteralExpression(call.arguments[4]));
      for (const property of call.arguments[4].properties) {
        assert.ok(ts.isPropertyAssignment(property));
        const key = property.name.getText(ast);
        assert.ok(key === 'fullPage' || key === 'animations');
        assert.equal(
          property.initializer.getText(ast),
          key === 'fullPage' ? 'true' : '\'allow\'',
        );
        assert.equal(pixelOptions[key], key === 'fullPage' ? true : 'allow');
      }
    }
    const baseline = parts.join('/');
    assert.ok(
      existsSync(
        new URL(
          '../../tests/reactlynx.spec.ts-snapshots/' + baseline
            + '-chromium-linux.png',
          import.meta.url,
        ),
      ),
      baseline,
    );
    steps.push({ 'web.pixels': { baseline } });
    assert.deepEqual(item.steps, steps);
  }
});

test('twenty element pixel translations retain every original statement and unchanged baseline', () => {
  const document = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/elements.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(document.cases.length, 20);
  assert.deepEqual(document.afterEach, [{
    recordToReport: 'Original text, image, SVG and input pixel contract result',
  }]);
  for (const item of document.cases) {
    const body = originals.get(item.name);
    assert.ok(body, 'Must be an enabled literal source test');
    const steps = [{ gotoUrl: '${shellUrl}?casename=' + item.name }, {
      javascript: 'document.fonts.ready.then(() => true)',
    }];
    assert.equal(body.statements[0].getText(ast), 'await goto(page, title);');
    let cursor = 1;
    const next = body.statements[cursor].expression.expression;
    if (next.expression.getText(ast) === 'wait') {
      assert.equal(next.arguments.length, 1);
      assert.ok(ts.isNumericLiteral(next.arguments[0]));
      steps.push({
        javascript: 'new Promise(resolve => setTimeout(() => resolve(true), '
          + next.arguments[0].text + '))',
      });
      cursor++;
    }
    assert.equal(
      body.statements.length,
      cursor + 1,
      'No skipped/action/numeric assertion may be dropped',
    );
    const call = body.statements[cursor].expression.expression;
    assert.equal(call.expression.getText(ast), 'diffScreenShot');
    assert.equal(call.arguments[0].getText(ast), 'page');
    assert.ok(
      call.arguments.length === 3 || call.arguments.length === 4,
      'Custom matcher options require explicit support',
    );
    const parts = [...call.arguments].slice(1).map(arg => {
      if (ts.isStringLiteral(arg)) return arg.text;
      assert.equal(arg.getText(ast), 'title');
      return item.name;
    });
    if (parts.length === 2) parts.push('index');
    const baseline = parts.join('/');
    assert.ok(
      existsSync(
        new URL(
          '../../tests/reactlynx.spec.ts-snapshots/' + baseline
            + '-chromium-linux.png',
          import.meta.url,
        ),
      ),
    );
    steps.push({ 'web.pixels': { baseline } });
    assert.deepEqual(item.steps, steps);
  }
});

test('weighted pixels retain both ordered immediate dimensions; extra font retains exact font load and readiness', async () => {
  const document = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/weights-and-fonts.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(document.cases.length, 4);
  assert.deepEqual(document.afterEach, [{
    recordToReport: 'Original pixel and numeric/font contract result',
  }]);
  for (const item of document.cases) {
    const body = originals.get(item.name), steps = item.steps;
    assert.equal(steps[0].gotoUrl, '${shellUrl}?casename=' + item.name);
    assert.equal(steps[1].javascript, 'document.fonts.ready.then(() => true)');
    const pixels = steps.find(s => s['web.pixels'])['web.pixels'].baseline;
    assert.ok(
      existsSync(
        new URL(
          '../../tests/reactlynx.spec.ts-snapshots/' + pixels
            + '-chromium-linux.png',
          import.meta.url,
        ),
      ),
    );
    if (item.name.startsWith('basic-linear-')) {
      assert.equal(body.statements.length, 6);
      assert.equal(body.statements[0].getText(ast), 'await goto(page, title);');
      assert.equal(
        body.statements[1].getText(ast),
        'await diffScreenShot(page, title, \'index\');',
      );
      assert.equal(pixels, item.name + '/index/index');
      for (
        const [offset, translated] of [[2, steps[3]['web.expect']], [
          4,
          steps[4]['web.expect'],
        ]]
      ) {
        const declaration =
          body.statements[offset].declarationList.declarations[0];
        const bounding = declaration.initializer.expression;
        assert.equal(bounding.expression.name.text, 'boundingBox');
        const locator = bounding.expression.expression;
        assert.equal(locator.expression.getText(ast), 'page.locator');
        assert.equal(locator.arguments[0].text, translated.selector);
        const assertion = body.statements[offset + 1].expression;
        assert.equal(assertion.expression.name.text, 'toEqual');
        const value = assertion.expression.expression.arguments[0];
        assert.equal(
          value.expression.expression.getText(ast),
          declaration.name.getText(ast),
        );
        assert.equal(value.name.text, translated.bounds);
        assert.equal(
          Number(assertion.arguments[0].getText(ast)),
          translated.equals,
        );
        assert.equal(translated.immediate, true);
      }
      assert.deepEqual(steps.map(s => Object.keys(s)[0]), [
        'gotoUrl',
        'javascript',
        'web.pixels',
        'web.expect',
        'web.expect',
      ]);
    } else {
      assert.equal(body.statements.length, 4);
      const evaluate = body.statements[1].expression.expression;
      assert.equal(evaluate.expression.getText(ast), 'page.evaluate');
      const callback = evaluate.arguments[0].getText(ast);
      async function calls(script) {
        const log = [];
        await runInNewContext(script, {
          document: {
            fonts: {
              async load(...args) {
                log.push(['load', ...args]);
              },
              get ready() {
                log.push(['ready']);
                return Promise.resolve();
              },
            },
          },
        });
        return log;
      }
      assert.deepEqual(
        await calls(steps[2].javascript),
        await calls('(' + callback + ')()'),
      );
      assert.deepEqual(await calls(steps[2].javascript), [[
        'load',
        '18px "Press Start 2P E2E"',
        'EXTRA FONT 0123',
      ], ['ready']]);
      assert.equal(body.statements[2].getText(ast), 'await wait(100);');
      assert.equal(
        body.statements[3].getText(ast),
        'await diffScreenShot(page, \'text\', \'extra-font-family\');',
      );
      assert.equal(
        steps[3].javascript,
        'new Promise(resolve => setTimeout(() => resolve(true), 100))',
      );
      assert.equal(pixels, 'text/extra-font-family/index');
      assert.deepEqual(steps.map(s => Object.keys(s)[0]), [
        'gotoUrl',
        'javascript',
        'javascript',
        'javascript',
        'web.pixels',
      ]);
    }
  }
});

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

test('pixel baseline resolution is independent of caller cwd, including the report publication job', () => {
  const adapter = new URL('../web-pixels.ts', import.meta.url).href;
  const baseline = new URL(
    '../../tests/reactlynx.spec.ts-snapshots/text/nest-text/index-chromium-linux.png',
    import.meta.url,
  ).href;
  for (
    const cwd of [
      fileURLToPath(new URL('../../../../../', import.meta.url)),
      '/tmp',
    ]
  ) {
    const output = execFileSync(process.execPath, [
      '--experimental-strip-types',
      '--input-type=module',
      '--eval',
      `
      import assert from 'node:assert/strict';
      import { readFileSync } from 'node:fs';
      import { expectWebPixels } from ${JSON.stringify(adapter)};
      const expected = readFileSync(new URL(${JSON.stringify(baseline)}));
      let calls = 0;
      await expectWebPixels({ _expectScreenshot: async ({expected: actual}) => {
        calls++; assert.deepEqual(actual, expected); return {};
      }}, 'text/nest-text/index', 'cwd-regression');
      assert.equal(calls, 1);
      await assert.rejects(expectWebPixels({}, 'never-present/no-baseline/index', 'cwd-regression'), /ENOENT/);
      process.stdout.write('passed');
    `,
    ], { cwd, encoding: 'utf8' });
    assert.equal(output, 'passed');
  }
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
