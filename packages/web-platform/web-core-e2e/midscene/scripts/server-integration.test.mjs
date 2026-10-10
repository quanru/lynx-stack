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
