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
    'pnpm exec playwright test tests/web-core.test.ts --project chromium --project firefox --project webkit --workers=2 --reporter line',
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
    'pnpm exec playwright test tests/performance.test.ts --project chromium --workers=2 --reporter line',
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
    'pnpm exec playwright test tests/x-svg-inline.spec.ts tests/x-text-selection.spec.ts tests/x-webview.spec.ts --project chromium --project firefox --project webkit --workers=2 --reporter line',
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

test('retained Markdown API runner excludes the migrated user-click flow', () => {
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
      step.name === 'Validate original Markdown rendering and API contracts'
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
    'pnpm exec playwright test tests/x-markdown.spec.ts --project chromium --project firefox --project webkit --workers=2 --grep-invert \'should fire bindlink and bindimageTap events\' --reporter line',
  );
});

test('original Playwright runners own servers before persistent Midscene fixtures start', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const steps =
    Object.values(workflow.jobs).find(job =>
      job.steps?.some(step =>
        step.name === 'Validate original worker and runtime API contracts'
      )
    ).steps;
  const start = steps.findIndex(step =>
    step.name === 'Start web-core-e2e dev shell'
  );
  assert.ok(start >= 0);
  for (
    const step of steps.filter(step =>
      step.name?.startsWith('Validate original')
      && step.run?.includes('playwright test')
    )
  ) {
    assert.ok(
      steps.indexOf(step) < start,
      `${step.name} must run before persistent servers occupy original ports`,
    );
  }
});

test('retained browser variants bound workers without replacing original profiles or skip rules', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const runners = Object.values(workflow.jobs).flatMap(job => job.steps ?? [])
    .filter(step =>
      step.name?.startsWith('Validate original')
      && step.run?.includes('playwright test')
    );
  assert.equal(runners.length, 6);
  for (const step of runners) {
    assert.ok(
      step.run.includes('--workers=2'),
      'Never rely on machine-dependent default browser concurrency',
    );
    assert.ok(
      !/--(?:retries|timeout|update-snapshots|config)(?:[=\s]|$)/.test(
        step.run,
      ),
      'Keep original retry, timing, snapshots and profiles',
    );
    const projects = [...step.run.matchAll(/--project (\w+)/g)].map(match =>
      match[1]
    );
    assert.deepEqual(
      projects,
      step.name.includes('performance')
        || step.name.includes('template consistency')
        ? ['chromium']
        : ['chromium', 'firefox', 'webkit'],
    );
  }
  const config = readFileSync(
    new URL(
      '../../../playwright-fixtures/src/playwright.common.ts',
      import.meta.url,
    ),
    'utf8',
  );
  for (
    const profile of [
      'devices[\'iPhone 12 Pro\']',
      'devices[\'Pixel 5\']',
      'devices[\'Desktop Firefox HiDPI\']',
      'reuseExistingServer: !isCI',
    ]
  ) assert.ok(config.includes(profile));
  const markdown = readFileSync(
    new URL('../../../web-elements/tests/x-markdown.spec.ts', import.meta.url),
    'utf8',
  );
  assert.ok(markdown.includes('browserName === \'webkit\''));
  assert.ok(
    markdown.includes(
      'test.skip(browserName !== \'chromium\', \'selection automation is flaky\')',
    ),
  );
});

test('pointer coalescing and template consistency keep exact non-visual source contracts', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const steps = Object.values(workflow.jobs).flatMap(job => job.steps ?? []);
  const pointer = steps.find(step =>
    step.name === 'Validate original pointer event coalescing contract'
  );
  const template = steps.find(step =>
    step.name === 'Validate original Rust and TypeScript template consistency'
  );
  for (const step of [pointer, template]) {
    assert.equal(step.if, 'matrix.shard == 1');
    assert.equal(
      step['working-directory'],
      'packages/web-platform/web-elements',
    );
    assert.equal(step.env.PORT, '3081');
  }
  assert.equal(
    pointer.run,
    'pnpm exec playwright test tests/scroll-view-mouse-drag.spec.ts --project chromium --project firefox --project webkit --workers=2 --grep \'coalesces pointer moves and flushes the latest position on pointerup\' --reporter line',
  );
  assert.equal(
    template.run,
    'pnpm exec playwright test tests/template.spec.ts --project chromium --workers=2 --reporter line',
  );
  const source = readFileSync(
    new URL(
      '../../../web-elements/tests/scroll-view-mouse-drag.spec.ts',
      import.meta.url,
    ),
    'utf8',
  );
  for (
    const field of [
      'callsAfterMicrotask: 1',
      'callsAfterPointerUp: 1',
      'callsBeforePointerUp: 0',
      'scrollTop: 60',
      'dispatchPointer(\'pointerup\', 40, 0)',
    ]
  ) assert.ok(source.includes(field));
  const templates = readFileSync(
    new URL('../../../web-elements/tests/template.spec.ts', import.meta.url),
    'utf8',
  );
  assert.ok(templates.includes('test(\'sync between rust and ts\''));
  assert.ok(templates.includes('../src/template.rs'));
  assert.ok(
    templates.includes('expect(templates.templateXSvg()).toBe(svgRsMatch[1])'),
  );
  assert.ok(templates.includes('templateXImage'));
});

test('retained original failure diagnostics are archived separately without inflating AI case reports', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const steps = Object.values(workflow.jobs).flatMap(job => job.steps ?? []);
  const step = steps.find(item =>
    item.name === 'Upload retained original runner diagnostics'
  );
  assert.equal(step.if, 'always() && matrix.shard == 1');
  assert.equal(
    step.with.name,
    'midscene-original-runner-diagnostics-${{ github.run_attempt }}',
  );
  assert.deepEqual(step.with.path.trim().split('\n'), [
    'packages/web-platform/web-core-e2e/test-results',
    'packages/web-platform/web-elements/test-results',
  ]);
  assert.equal(step.with['if-no-files-found'], 'ignore');
  assert.ok(!step.with.name.startsWith('midscene-ai-e2e-web-shard-'));
});
