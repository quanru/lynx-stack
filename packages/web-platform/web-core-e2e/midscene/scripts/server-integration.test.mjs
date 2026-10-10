import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';

test('the original server HTML snapshot runner executes once without snapshot updates', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const jobs = Object.values(workflow.jobs);
  const steps = jobs.flatMap(job => job.steps ?? []);
  const matching = steps.filter(step =>
    step.name === 'Validate original server-rendering HTML snapshots'
  );
  assert.equal(matching.length, 1);
  assert.equal(matching[0].if, 'matrix.shard == 1');
  assert.equal(
    matching[0]['working-directory'],
    'packages/web-platform/web-core-e2e',
  );
  assert.equal(matching[0].run, 'pnpm exec rstest --config rstest.config.ts');
  assert.ok(
    jobs.some(job =>
      job.container?.env?.CI === '1' && job.steps?.includes(matching[0])
    ),
  );
  const config = readFileSync(
    new URL('../../rstest.config.ts', import.meta.url),
    'utf8',
  );
  assert.ok(config.includes('include: [\'server-tests/**/*.test.ts\']'));
  const source = readFileSync(
    new URL('../../server-tests/server-e2e.test.ts', import.meta.url),
    'utf8',
  );
  assert.equal(source.match(/^test\('/gm)?.length, 17);
  assert.ok(source.includes('expect(formatted).toMatchSnapshot()'));
});

test('the original worker/runtime API suite retains its runner and disabled case', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const matching = Object.values(workflow.jobs).flatMap(job => job.steps ?? [])
    .filter(step =>
      step.name === 'Validate original worker and runtime API contracts'
    );
  assert.equal(matching.length, 1);
  assert.equal(matching[0].if, 'matrix.shard == 1');
  assert.equal(
    matching[0]['working-directory'],
    'packages/web-platform/web-core-e2e',
  );
  assert.equal(
    matching[0].run,
    'pnpm exec playwright test tests/web-core.test.ts --project chromium --reporter line',
  );
  const source = readFileSync(
    new URL('../../tests/web-core.test.ts', import.meta.url),
    'utf8',
  );
  assert.ok(
    source.includes(
      'test.skip(); // https://github.com/microsoft/playwright/issues/34774',
    ),
  );
  assert.ok(source.includes('getBackgroundThreadWorker'));
});

test('performance integration retains original CDP budgets rather than visual substitutes', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const matching = Object.values(workflow.jobs).flatMap(job => job.steps ?? [])
    .filter(step =>
      step.name === 'Validate original layout and style performance budgets'
    );
  assert.equal(matching.length, 1);
  assert.equal(matching[0].if, 'matrix.shard == 1');
  assert.equal(
    matching[0]['working-directory'],
    'packages/web-platform/web-elements',
  );
  assert.equal(matching[0].env.PORT, '3081');
  assert.equal(
    matching[0].run,
    'pnpm exec playwright test tests/performance.test.ts --project chromium --reporter line',
  );
  const source = readFileSync(
    new URL('../../../web-elements/tests/performance.test.ts', import.meta.url),
    'utf8',
  );
  assert.ok(source.includes('cdpSession.send(\'Performance.getMetrics\')'));
  assert.ok(source.includes('mode: \'serial\', retries: 5'));
  for (const limit of [3, 4, 100]) {
    assert.ok(source.includes(`toBeLessThanOrEqual(${limit})`));
  }
});

test('SVG selection and iframe integration preserves original deterministic runners', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const matching = Object.values(workflow.jobs).flatMap(job => job.steps ?? [])
    .filter(step =>
      step.name === 'Validate original SVG selection and iframe API contracts'
    );
  assert.equal(matching.length, 1);
  assert.equal(matching[0].if, 'matrix.shard == 1');
  assert.equal(
    matching[0]['working-directory'],
    'packages/web-platform/web-elements',
  );
  assert.equal(matching[0].env.PORT, '3081');
  assert.equal(
    matching[0].run,
    'pnpm exec playwright test tests/x-svg-inline.spec.ts tests/x-text-selection.spec.ts tests/x-webview.spec.ts --project chromium --reporter line',
  );
  for (
    const file of [
      'x-svg-inline.spec.ts',
      'x-text-selection.spec.ts',
      'x-webview.spec.ts',
    ]
  ) {
    const source = readFileSync(
      new URL('../../../web-elements/tests/' + file, import.meta.url),
      'utf8',
    );
    assert.ok(source.includes('from \'@lynx-js/playwright-fixtures\''));
    assert.ok(
      !source.includes('toHaveScreenshot'),
      'Do not create missing platform PNGs via retained API runners',
    );
  }
});
