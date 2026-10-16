// Collection only after the repository Turbo build: no server or browser starts.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  bulkReactSources,
  bulkElementSources,
} from './bulk-candidate-sources.mjs';

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (
  const [pkg, mode, sources] of [
    ['web-core-e2e', 'CSR', bulkReactSources],
    ['web-core-e2e', 'SSR', bulkReactSources],
    ['web-elements', 'component', bulkElementSources],
  ]
) {
  const cwd = fileURLToPath(
    new URL(
      pkg === 'web-core-e2e' ? '../../' : '../../../web-elements/',
      import.meta.url,
    ),
  );
  const require = createRequire(path.join(cwd, 'package.json'));
  const cli = path.join(
    path.dirname(require.resolve('@playwright/test/package.json')),
    'cli.js',
  );
  const env = {
    ...process.env,
    CI: '1',
    PORT: '3081',
    PLAYWRIGHT_JSON_OUTPUT_FILE: '',
    PLAYWRIGHT_JSON_OUTPUT_NAME: '',
  };
  delete env.ENABLE_SSR;
  if (mode === 'SSR') env.ENABLE_SSR = 'true';
  const report = JSON.parse(execFileSync(process.execPath, [
    cli,
    'test',
    '--config',
    'playwright.config.ts',
    '--grep',
    '(?:' + sources.map(item => escape(item.fullTitle)).join('|') + ')$',
    '--list',
    '--reporter',
    'json',
  ], { cwd, env, encoding: 'utf8', timeout: 30000, maxBuffer: 10_000_000 }));
  assert.deepEqual(report.errors, []);
  const seen = new Set();
  function visit(suite, parents = []) {
    const titles = [...parents, suite.title];
    for (const spec of suite.specs ?? []) {
      const candidates = sources.filter(item =>
        item.title === spec.title && item.file === spec.file
        && item.line === spec.line
      );
      assert.equal(candidates.length, 1, spec.title);
      const descriptor = candidates[0];
      assert.ok(
        [...titles, spec.title].join(' ').endsWith(descriptor.fullTitle),
      );
      assert.ok(!seen.has(descriptor.key));
      seen.add(descriptor.key);
      assert.deepEqual(spec.tests.map(item => item.projectName).sort(), [
        'chromium',
        'firefox',
        'webkit',
      ]);
      assert.ok(spec.tests.every(item => item.results.length === 0));
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  }
  for (const suite of report.suites) visit(suite);
  assert.equal(seen.size, sources.length);
  const skipped = sources.reduce(
    (count, item) =>
      count + (item.skipBrowsersByMode?.[mode] ?? item.skipBrowsers).length,
    0,
  );
  const returned = sources.reduce(
    (count, item) =>
      count
      + (item.earlyReturnBrowsersByMode?.[mode] ?? item.earlyReturnBrowsers)
        .length,
    0,
  );
  console.log(
    `${pkg} ${mode}: ${seen.size} source titles / ${
      seen.size * 3
    } collected items; source guards: ${skipped} skips / ${returned} early returns. No browsers launched.`,
  );
}
