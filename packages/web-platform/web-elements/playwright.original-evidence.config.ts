import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import original from './playwright.config.js';
import { originalEvidenceConfig } from '../web-core-e2e/midscene/scripts/original-runner-catalog.mjs';

export default defineConfig(originalEvidenceConfig(
  original,
  'web-elements',
  fileURLToPath(new URL('.', import.meta.url)),
));
