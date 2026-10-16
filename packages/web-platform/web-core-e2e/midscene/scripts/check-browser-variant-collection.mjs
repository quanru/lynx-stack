// Browser-free collection only. Reuse the verified full repository Turbo build.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  browserCoreSources,
  browserElementSources,
} from './browser-variant-sources.mjs';

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (
  const [pkg, sources, expectedSources] of [
    ['web-core-e2e', browserCoreSources, 271],
    ['web-elements', browserElementSources, 190],
  ]
) {
  const cwd = fileURLToPath(new URL('../../../' + pkg + '/', import.meta.url));
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
  const report = JSON.parse(execFileSync(process.execPath, [
    cli,
    'test',
    ...new Set(sources.map(item => item.file)),
    '--config',
    'playwright.config.ts',
    '--project',
    'firefox',
    '--project',
    'webkit',
    '--grep',
    '(?:' + sources.map(item => escape(item.fullTitle)).join('|') + ')$',
    '--list',
    '--reporter',
    'json',
  ], { cwd, env, encoding: 'utf8', timeout: 30000, maxBuffer: 20_000_000 }));
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
        'firefox',
        'webkit',
      ]);
      assert.ok(spec.tests.every(item => item.results.length === 0));
    }
    for (const child of suite.suites ?? []) visit(child, titles);
  }
  for (const suite of report.suites) visit(suite);
  assert.equal(seen.size, sources.length);
  assert.equal(
    new Set(sources.map(item => item.file + '::' + item.sourceId)).size,
    expectedSources,
  );
  const skips = sources.reduce((n, item) => n + item.skipBrowsers.length, 0);
  console.log(
    `${pkg}: ${expectedSources} declarations / ${seen.size} titles / ${
      seen.size * 2
    } collected Firefox-WebKit items (${skips} original skips). No browsers launched; no optional hydrated SSR selected.`,
  );
}
