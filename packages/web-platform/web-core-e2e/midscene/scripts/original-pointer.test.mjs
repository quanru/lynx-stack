import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';

const workflow = YAML.parse(
  readFileSync(
    new URL(
      '../../../../../.github/workflows/midscene-web.yml',
      import.meta.url,
    ),
    'utf8',
  ),
);
const steps = workflow.jobs['web-shell-ai-e2e'].steps;
const ast = ts.createSourceFile(
  'original.ts',
  readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
const originals = new Map();
function visit(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) originals.set(node.arguments[0].text, node.arguments[1].getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
const names = [
  'basic-mts-bindtouchstart',
  'basic-bindmouse',
  'basic-bindwheel-view',
].sort();

test('three pointer contracts run unchanged in CSR and SSR with all original browser profiles', () => {
  for (const mode of ['CSR', 'SSR']) {
    const matches = steps.filter(step =>
      step.name === `Validate original pointer event contracts (${mode})`
    );
    assert.equal(matches.length, 1);
    const step = matches[0];
    assert.equal(step.if, 'matrix.shard == 1');
    assert.equal(
      step['working-directory'],
      'packages/web-platform/web-core-e2e',
    );
    assert.equal(step.env.ENABLE_SSR, mode === 'SSR' ? '1' : '');
    assert.match(
      step.run,
      /pnpm exec playwright test tests\/reactlynx.spec.ts /,
    );
    const filter = new RegExp(step.run.match(/--grep '([^']+)'/)[1]);
    assert.deepEqual(
      [...originals.keys()].filter(name => filter.test(name)).sort(),
      names,
    );
    assert.deepEqual(
      [...step.run.matchAll(/--project (\w+)/g)].map(match => match[1]),
      ['chromium', 'firefox', 'webkit'],
    );
    assert.match(step.run, /--workers=2/);
    assert.match(
      step.run,
      new RegExp(
        '--output midscene-original-results/pointer-' + mode.toLowerCase(),
      ),
    );
    assert.doesNotMatch(
      step.run,
      /--(?:retries|timeout|update-snapshots|config)(?:[=\s]|$)/,
    );
    assert.ok(
      step.run.indexOf('ulimit -Sn "$(ulimit -Hn)"')
        < step.run.indexOf('pnpm exec playwright'),
    );
    assert.ok(
      steps.indexOf(step)
        < steps.findIndex(item => item.name === 'Start web-core-e2e dev shell'),
    );
  }
});

test('both CI triggers cover original tests, browser profiles, fixtures and PNG baselines', () => {
  assert.deepEqual(workflow.on.pull_request.paths, workflow.on.push.paths);
  for (
    const path of [
      'packages/web-platform/web-core-e2e/**',
      'packages/web-platform/playwright-fixtures/**',
      'packages/web-platform/web-core/**',
      'packages/web-platform/web-elements/**',
    ]
  ) {
    assert.ok(workflow.on.push.paths.includes(path), path);
  }
});

test('source touch, mouse and wheel inputs retain their distinct protocols and browser exclusions', () => {
  const touch = originals.get('basic-mts-bindtouchstart');
  assert.match(touch, /browserName !== 'chromium'/);
  assert.match(touch, /context.newCDPSession\(page\)/);
  assert.match(
    touch,
    /swipe\(cdpSession, \{\s*x: 20,\s*y: 20,\s*xDistance: 10,\s*yDistance: 0,/,
  );
  assert.equal([...touch.matchAll(/\.toHaveCSS\(/g)].length, 4);
  const mouse = originals.get('basic-bindmouse');
  assert.match(mouse, /browserName !== 'chromium'/);
  assert.ok(mouse.indexOf('.hover()') < mouse.indexOf('page.mouse.down()'));
  assert.ok(
    mouse.indexOf('page.mouse.down()') < mouse.indexOf('page.mouse.up()'),
  );
  assert.equal([...mouse.matchAll(/\.toHaveCSS\(/g)].length, 3);
  const wheel = originals.get('basic-bindwheel-view');
  assert.match(wheel, /browserName === 'webkit'/);
  assert.ok(
    wheel.indexOf('.hover()') < wheel.indexOf('page.mouse.wheel(0, 100)'),
  );
  assert.match(wheel, /toHaveText\('wheel'\)/);
  assert.match(wheel, /'rgb\(0, 128, 0\)'/);
});
