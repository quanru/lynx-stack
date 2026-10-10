// Read-only real-fixture geometry guard for the visual action description.
// Do not click the selector or use these coordinates to drive the UI.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { originalChromiumProfile } from '../web-pixels.ts';

const profile = originalChromiumProfile();
const browser = await chromium.launch(profile.launch);
try {
  const page = await browser.newPage(profile.context);
  await page.goto(
    new URL(
      '?casename=basic-element-x-swiper-current',
      process.env.WEB_SHELL_URL ?? 'http://localhost:3080/',
    ).href,
    { waitUntil: 'load' },
  );
  await page.evaluate(() => document.fonts.ready);
  const left = await page.locator('x-swiper').first().boundingBox();
  const target = await page.getByTestId('swiper-1').boundingBox();
  assert.ok(left && target && left.width > 0 && target.width > 0);
  assert.ok(
    target.x >= left.x + left.width,
    'The original clickable swiper is the RIGHT-HAND panel',
  );
  assert.equal(
    target.y,
    left.y,
    'Panels are side by side, not vertically stacked',
  );
  console.log(
    JSON.stringify({ left, target, relation: 'right-hand panel, same row' }),
  );
} finally {
  await browser.close();
}
