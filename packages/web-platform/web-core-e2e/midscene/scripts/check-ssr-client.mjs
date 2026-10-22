// Real browser initialization guard, not an AI interaction or snapshot update.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { originalChromiumProfile } from '../web-pixels.ts';

const profile = originalChromiumProfile();
const browser = await chromium.launch(profile.launch);
try {
  const page = await browser.newPage(profile.context);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = new URL(
    'ssr?casename=config-css-inheritance-true',
    process.env.WEB_SHELL_URL ?? 'http://localhost:3080/',
  );
  await page.goto(url.href, { waitUntil: 'load' });
  assert.deepEqual(errors, [], 'SSR module must execute without page errors');
  await page.waitForFunction(
    () =>
      !!customElements.get('lynx-view')
      && !document.querySelector('lynx-view')?.hasAttribute('ssr'),
    undefined,
    { timeout: 5000 },
  );
  assert.deepEqual(
    errors,
    [],
    'SSR registration must not conceal module errors',
  );
  console.log(
    'SSR client module executes and registers the original LynxView for hydration.',
  );
} finally {
  await browser.close();
}
