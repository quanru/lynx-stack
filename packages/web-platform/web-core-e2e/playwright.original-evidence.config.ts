import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import original from './playwright.config.js';
import { originalEvidenceConfig } from './midscene/scripts/original-runner-catalog.mjs';

export default defineConfig(originalEvidenceConfig(
  original,
  'web-core-e2e',
  fileURLToPath(new URL('.', import.meta.url)),
));
