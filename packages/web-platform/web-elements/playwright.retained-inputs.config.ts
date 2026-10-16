import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import original from './playwright.config.js';
import { retainedInputGrep } from '../web-core-e2e/midscene/scripts/retained-input-selection.mjs';

const evidence = fileURLToPath(
  new URL('./midscene-original-results/retained-inputs/', import.meta.url),
);

// Playwright captures this attachment during teardown, after the unchanged
// source callback. Do not insert screenshots/model calls into its sample windows.
export default defineConfig({
  ...original,
  testMatch: '**/tests/web-elements.spec.ts',
  grep: retainedInputGrep,
  outputDir: `${evidence}results`,
  use: { ...original.use, screenshot: 'on' },
  reporter: [
    ['line'],
    ['html', { outputFolder: `${evidence}html`, open: 'never' }],
    ['json', { outputFile: `${evidence}report.json` }],
  ],
});
