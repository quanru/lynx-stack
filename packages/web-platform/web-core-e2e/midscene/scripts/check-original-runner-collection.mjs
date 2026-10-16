// Requires the root Turbo build; --list does not launch browsers or servers.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { originalRunnerCatalog } from './original-runner-catalog.mjs';
import { retainedInputEvidence } from './retained-input-evidence.mjs';

let count = 0;
for (const catalog of originalRunnerCatalog) {
  const cwd = fileURLToPath(
    new URL(`../../../${catalog.package}/`, import.meta.url),
  );
  const require = createRequire(path.join(cwd, 'package.json'));
  const report = JSON.parse(execFileSync(process.execPath, [
    path.join(
      path.dirname(require.resolve('@playwright/test/package.json')),
      'cli.js',
    ),
    'test',
    ...(catalog.files ?? [catalog.file]),
    '--config',
    'playwright.original-evidence.config.ts',
    ...(catalog.grep ? ['--grep', catalog.grep] : []),
    ...(catalog.grepInvert ? ['--grep-invert', catalog.grepInvert] : []),
    ...catalog.browsers.flatMap(browser => ['--project', browser]),
    '--list',
    '--reporter',
    'json',
  ], {
    cwd,
    env: {
      ...process.env,
      CI: '1',
      PORT: catalog.package === 'web-elements' ? '3081' : '3080',
      ENABLE_SSR: catalog.mode === 'SSR' ? '1' : '',
      ORIGINAL_EVIDENCE_RUNNER: catalog.id,
      PLAYWRIGHT_JSON_OUTPUT_FILE: '',
      PLAYWRIGHT_JSON_OUTPUT_NAME: '',
    },
    encoding: 'utf8',
    timeout: 30000,
  }));
  const root = mkdtempSync(path.join(os.tmpdir(), 'original-collection-'));
  try {
    const manifest = retainedInputEvidence(report, root, catalog);
    assert.equal(manifest.runnerErrorCount, 0);
    assert.ok(
      manifest.cases.every(row =>
        row.line !== null && row.status === 'not-run'
      ),
    );
    if (catalog.sources) {
      const identities = new Map();
      for (const row of manifest.cases) {
        const identity = `${row.sourceFile}::${row.sourceId}`;
        const location = `${row.sourceFile}:${row.line}`;
        if (identities.has(identity)) {
          assert.equal(identities.get(identity), location);
        }
        identities.set(identity, location);
      }
      assert.equal(identities.size, manifest.sourceDeclarations);
      assert.equal(
        new Set(identities.values()).size,
        manifest.sourceDeclarations,
      );
    }
    count += manifest.cases.length;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
assert.equal(count, 1835);
console.log(
  'Collected eighteen original runners: 701 unique source declarations, 1835 browser/render executions; no browsers launched.',
);
