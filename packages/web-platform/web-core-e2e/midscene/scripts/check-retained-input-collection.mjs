// Explicit collection-only check AFTER the root Turbo build. No browser/server
// starts. Keep out of *.test.mjs: external-fork checks do not build the workspace.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { retainedInputEvidence } from './retained-input-evidence.mjs';

// Use the workspace test runner, not Midscene's independent npm installation.
const require = createRequire(
  new URL('../../../web-elements/playwright.config.ts', import.meta.url),
);
const cwd = fileURLToPath(new URL('../../../web-elements/', import.meta.url));
const report = JSON.parse(execFileSync(process.execPath, [
  path.join(
    path.dirname(require.resolve('@playwright/test/package.json')),
    'cli.js',
  ),
  'test',
  '--config',
  'playwright.retained-inputs.config.ts',
  '--list',
  '--reporter',
  'json',
], {
  cwd,
  env: {
    ...process.env,
    CI: '1',
    PORT: '3081',
    PLAYWRIGHT_JSON_OUTPUT_FILE: '',
    PLAYWRIGHT_JSON_OUTPUT_NAME: '',
  },
  encoding: 'utf8',
  timeout: 30000,
}));
const root = mkdtempSync(path.join(os.tmpdir(), 'retained-collection-'));
try {
  const manifest = retainedInputEvidence(report, root);
  assert.equal(manifest.cases.length, 42);
  assert.ok(
    manifest.cases.every(row => row.line !== null && row.status === 'not-run'),
  );
  assert.equal(manifest.runnerErrorCount, 0);
  console.log(
    'Collected 14 retained source declarations across 3 original profiles (42 executions); no browsers launched.',
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
