import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';

const source = ts.createSourceFile(
  'original.ts',
  readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
const originals = new Map();
const helpers = new Map();
function visit(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) originals.set(node.arguments[0].text, node.arguments[1]);
  if (ts.isVariableDeclaration(node) && node.initializer) {
    helpers.set(node.name.getText(source), node.initializer.getText(source));
  }
  ts.forEachChild(node, visit);
}
visit(source);
const workflow = YAML.parse(readFileSync(
  new URL('../../../../../.github/workflows/midscene-web.yml', import.meta.url),
  'utf8',
));
const steps = workflow.jobs['web-shell-ai-e2e'].steps;

test('animation timing follows the upstream render matrix with three original browser profiles', () => {
  const upstream = YAML.parse(readFileSync(
    new URL('../../../../../.github/workflows/test.yml', import.meta.url),
    'utf8',
  ));
  const modes = upstream.jobs['web-core-e2e'].strategy.matrix.render;
  for (const event of ['push', 'pull_request']) {
    assert.ok(workflow.on[event].paths.includes('.github/workflows/test.yml'));
  }
  assert.deepEqual(
    modes,
    ['CSR'],
    'Review pixel eligibility if upstream enables SSR',
  );
  assert.equal(
    steps.filter(step =>
      step.name?.startsWith('Validate original animation sampling')
    ).length,
    modes.length,
  );
  for (const mode of modes) {
    const matches = steps.filter(step =>
      step.name === `Validate original animation sampling (${mode})`
    );
    assert.equal(matches.length, 1);
    const step = matches[0];
    assert.equal(step.if, undefined);
    assert.equal(
      step['working-directory'],
      'packages/web-platform/web-core-e2e',
    );
    assert.deepEqual(step.env, { ENABLE_SSR: mode === 'SSR' ? '1' : '' });
    assert.equal(
      step.run,
      `pnpm exec playwright test tests/reactlynx.spec.ts --project chromium --project firefox --project webkit --workers=2 --grep 'api-animate$' --output midscene-original-results/animation-${mode.toLowerCase()} --reporter line`,
    );
    const filter = new RegExp(step.run.match(/--grep '([^']+)'/)[1]);
    assert.deepEqual(
      [...originals.keys()].filter(name => filter.test(name)),
      ['api-animate'],
    );
    assert.ok(
      steps.indexOf(step)
        < steps.findIndex(item => item.name === 'Start web-core-e2e dev shell'),
    );
  }
});

test('animation source keeps its physical click, ordered waits and exact original PNG matcher', () => {
  assert.deepEqual(
    originals.get('api-animate').body.statements.map(node =>
      node.getText(source)
    ),
    [
      'await goto(page, title);',
      'await wait(500);',
      'await diffScreenShot(page, title, \'initial\');',
      'await page.locator(\'#target\').click();',
      'await wait(2000);',
      'await diffScreenShot(page, title, \'animate\');',
    ],
  );
  assert.match(helpers.get('wait'), /setTimeout\(resolve, ms\)/);
  const goto = helpers.get('goto');
  assert.match(goto, /waitUntil: 'load'/);
  assert.match(goto, /await page.evaluate\(\(\) => document.fonts.ready\)/);
  assert.match(goto, /if \(isSSR\) await wait\(300\)/);
  const matcher = helpers.get('diffScreenShot');
  assert.match(matcher, /maxDiffPixelRatio: 0,/);
  assert.match(matcher, /fullPage: true,/);
  assert.match(matcher, /animations: 'allow',/);
  assert.match(matcher, /\.\.\.screenshotOptions,/);
  for (const browser of ['chromium', 'firefox', 'webkit']) {
    for (const checkpoint of ['initial', 'animate']) {
      const bytes = readFileSync(
        new URL(
          `../../tests/reactlynx.spec.ts-snapshots/api-animate/${checkpoint}/index-${browser}-linux.png`,
          import.meta.url,
        ),
      );
      assert.deepEqual([...bytes.subarray(0, 8)], [
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10,
      ]);
    }
  }
});
