import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';
import { loadTestProject } from '@midscene/test/config';
import {
  expectWebPixels,
  originalPixelOptions,
  pixelOptions,
} from '../web-pixels.ts';

test('39 web-elements static pixels retain every original statement, fixture, wait and PNG without enabling skips', () => {
  const ast = ts.createSourceFile(
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
      new URL('../cases/web-pixels/elements-static.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  assert.equal(cases.length, 39);
  const originals = new Map();
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
    ) {
      originals.set(node.arguments[0].text, node.arguments[1].body);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const item of cases) {
    assert.ok(item.name.startsWith('web-elements/'));
    const name = item.name.slice('web-elements/'.length);
    const expected = [];
    for (const statement of originals.get(name).statements) {
      assert.ok(
        ts.isExpressionStatement(statement)
          && ts.isAwaitExpression(statement.expression),
        'Do not omit guards, assertions or actions',
      );
      const call = statement.expression.expression;
      assert.ok(ts.isCallExpression(call));
      const kind = call.expression.getText(ast);
      if (kind === 'gotoWebComponentPage') {
        assert.deepEqual(call.arguments.map(arg => arg.getText(ast)), [
          'page',
          'title',
        ]);
        expected.push({
          gotoUrl: '${elementsUrl}tests/fixtures/' + name + '.html',
        }, { javascript: 'document.fonts.ready.then(() => true)' });
      } else if (kind === 'wait') {
        assert.equal(call.arguments.length, 1);
        const ms = Number(call.arguments[0].getText(ast));
        assert.ok(Number.isFinite(ms) && ms >= 0);
        expected.push({
          javascript:
            `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
        });
      } else {
        assert.equal(kind, 'diffScreenShot');
        assert.equal(
          call.arguments.length,
          3,
          'No screenshot overrides silently discarded',
        );
        assert.equal(call.arguments[0].getText(ast), 'page');
        assert.equal(call.arguments[1].getText(ast), 'title');
        assert.ok(ts.isStringLiteral(call.arguments[2]));
        const baseline = name + '/' + call.arguments[2].text;
        expected.push({ 'web.pixels': { suite: 'web-elements', baseline } });
        assert.ok(
          existsSync(
            new URL(
              '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
                + baseline + '-chromium-linux.png',
              import.meta.url,
            ),
          ),
        );
        assert.equal(
          originalPixelOptions(baseline, 'web-elements').maxDiffPixelRatio,
          0,
        );
      }
    }
    assert.deepEqual(item.steps, expected);
    assert.ok(
      existsSync(
        new URL(
          '../../../web-elements/tests/fixtures/' + name + '.html',
          import.meta.url,
        ),
      ),
    );
  }
  for (
    const disabled of [
      'layout/percentage-cyclic-text',
      'layout/percentage-cyclic-sibling-linear',
    ]
  ) {
    assert.ok(!cases.some(item => item.name === 'web-elements/' + disabled));
  }
  // Original helpers preserve font readiness and zero ratio/full-page/animations defaults.
  assert.match(
    ast.text,
    /await page\.evaluate\(\(\) => document\.fonts\.ready\)/,
  );
  assert.match(
    ast.text,
    /maxDiffPixelRatio: 0,\s+fullPage: true,\s+animations: 'allow'/,
  );
});

test('both pixel suites use the same original Chromium profile but independent fixture URLs', async () => {
  for (const packageName of ['web-elements', 'web-core-e2e']) {
    const config = readFileSync(
      new URL(
        '../../../' + packageName + '/playwright.config.ts',
        import.meta.url,
      ),
      'utf8',
    );
    assert.match(
      config,
      /playwrightConfigCommon.*from '@lynx-js\/playwright-fixtures'/,
    );
    assert.match(config, /\.\.\.playwrightConfigCommon/);
  }
  const root = fileURLToPath(new URL('../', import.meta.url));
  const project = (await loadTestProject(root + 'midscene.config.ts')).projects
    .find(p => p.name === 'web-pixels');
  assert.ok(project.variables.elementsUrl);
  assert.ok(project.variables.shellUrl);
  assert.notEqual(project.variables.elementsUrl, project.variables.shellUrl);
});

test('web-elements PNG lookup never falls back to web-core or inherits its source-only tolerance exception', async () => {
  const baseline = 'layout/percentage-cyclic/index';
  const expected = readFileSync(
    new URL(
      '../../../web-elements/tests/web-elements.spec.ts-snapshots/' + baseline
        + '-chromium-linux.png',
      import.meta.url,
    ),
  );
  let calls = 0;
  const page = {
    _expectScreenshot: async options => {
      calls++;
      assert.deepEqual(options, { ...pixelOptions, expected });
      return {};
    },
  };
  await expectWebPixels(page, baseline, 'elements-contract', 'web-elements');
  assert.equal(calls, 1);
  await assert.rejects(
    expectWebPixels(page, baseline, 'wrong-suite'),
    /ENOENT/,
  );
  await assert.rejects(
    expectWebPixels(page, baseline, 'invalid-suite', '../escape'),
    /Invalid/,
  );
  assert.equal(calls, 1);
  assert.equal(
    originalPixelOptions(
      'x-textarea/placeholder-font-size/font-size/index',
      'web-elements',
    ).maxDiffPixelRatio,
    0,
  );
});
