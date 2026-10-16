# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/web-elements.spec.ts >> web-elements test suite >> x-refresh-view >> x-refresh-view/pull
- Location: tests/web-elements.spec.ts:3384:5

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  196500 pixels (ratio 0.69 of all image pixels) are different.

  Snapshot: x-refresh-view/pull/initial.png

Call log:
  - Expect "toHaveScreenshot(x-refresh-view/pull/initial.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded
  - 196500 pixels (ratio 0.69 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 196500 pixels (ratio 0.69 of all image pixels) are different.

```

# Test source

```ts
  1   | // Copyright 2024 The Lynx Authors. All rights reserved.
  2   | // Licensed under the Apache License Version 2.0 that can be found in the
  3   | // LICENSE file in the root directory of this source tree.
  4   | import { test, expect, swipe, dragAndHold } from '@lynx-js/playwright-fixtures';
  5   | import type { Page } from '@playwright/test';
  6   | import path from 'node:path';
  7   | const wait = async (ms: number) => {
  8   |   await new Promise((resolve) => {
  9   |     setTimeout(resolve, ms);
  10  |   });
  11  | };
  12  | 
  13  | const diffScreenShot = async (
  14  |   page: Page,
  15  |   caseName: string,
  16  |   subcaseName: string,
  17  |   screenshotOptions?: Parameters<
  18  |     ReturnType<typeof expect<Page>>['toHaveScreenshot']
  19  |   >[0],
  20  | ) => {
> 21  |   await expect(page).toHaveScreenshot([`${caseName}`, `${subcaseName}.png`], {
      |                      ^ Error: expect(page).toHaveScreenshot(expected) failed
  22  |     maxDiffPixelRatio: 0,
  23  |     fullPage: true,
  24  |     animations: 'allow',
  25  |     ...screenshotOptions,
  26  |   });
  27  | };
  28  | 
  29  | const gotoWebComponentPage = async (page: Page, testname: string) => {
  30  |   await page.goto(`/tests/fixtures/${testname}.html`, {
  31  |     waitUntil: 'load',
  32  |   });
  33  |   await page.evaluate(() => document.fonts.ready);
  34  | };
  35  | 
  36  | const getTitle = (titlePath: string[]) => {
  37  |   return path.join(...[titlePath.pop()!, titlePath.pop()!].reverse());
  38  | };
  39  | 
  40  | test.describe('web-elements test suite', () => {
  41  |   test.describe('layout', () => {
  42  |     test('layout/percentage-cyclic', async ({ page }, { title }) => {
  43  |       await gotoWebComponentPage(page, title);
  44  |       await diffScreenShot(page, title, 'index');
  45  |     });
  46  |     test('layout/percentage-cyclic-text', async ({ page }, { title }) => {
  47  |       test.skip(
  48  |         true,
  49  |       );
  50  |       await gotoWebComponentPage(page, title);
  51  |       await diffScreenShot(page, title, 'index');
  52  |     });
  53  | 
  54  |     test('layout/percentage-cyclic-sibling', async ({ page }, { title }) => {
  55  |       await gotoWebComponentPage(page, title);
  56  |       await diffScreenShot(page, title, 'index');
  57  |     });
  58  |     test('layout/percentage-cyclic-sibling-linear', async ({ page }, {
  59  |       title,
  60  |     }) => {
  61  |       test.skip(
  62  |         true,
  63  |       );
  64  |       await gotoWebComponentPage(page, title);
  65  |       await diffScreenShot(page, title, 'index');
  66  |     });
  67  |     test('layout/flex-lynx-computed-direction', async ({ page }, {
  68  |       title,
  69  |     }) => {
  70  |       await gotoWebComponentPage(page, title);
  71  |       await diffScreenShot(page, title, 'index');
  72  |     });
  73  |     test('layout/flex-lynx-computed-grow', async ({ page }, {
  74  |       title,
  75  |     }) => {
  76  |       await gotoWebComponentPage(page, title);
  77  |       await diffScreenShot(page, title, 'index');
  78  |     });
  79  |     test('layout/flex-lynx-computed-shrink', async ({ page }, {
  80  |       title,
  81  |     }) => {
  82  |       await gotoWebComponentPage(page, title);
  83  |       await diffScreenShot(page, title, 'index');
  84  |     });
  85  |     test('layout/lynx-display-do-not-use-flatten-tree', async ({ page }, {
  86  |       title,
  87  |     }) => {
  88  |       await gotoWebComponentPage(page, title);
  89  |       await expect(page.locator('#x-list-child')).toHaveCSS('flex-shrink', '1');
  90  |       await expect(page.locator('#x-refresh-view-child')).toHaveCSS(
  91  |         'flex-shrink',
  92  |         '1',
  93  |       );
  94  |     });
  95  |   });
  96  |   test.describe('x-view', () => {
  97  |     test('dataset-attr-false-value', async ({ page }, { titlePath }) => {
  98  |       const title = getTitle(titlePath);
  99  |       await gotoWebComponentPage(page, title);
  100 |       await expect(page.locator('#target')).toHaveCSS(
  101 |         'background-color',
  102 |         'rgb(0, 128, 0)',
  103 |       );
  104 |     });
  105 |     test('event-layoutchange', async ({ page }, { titlePath }) => {
  106 |       const title = getTitle(titlePath);
  107 |       await gotoWebComponentPage(page, title);
  108 |       await page.locator('#target').click();
  109 |       await wait(100);
  110 |       const detail = await page.evaluate(() => {
  111 |         // @ts-expect-error
  112 |         return globalThis.detail;
  113 |       });
  114 |       expect(detail).toBeTruthy();
  115 |       expect(typeof detail.width).toBe('number');
  116 |       expect(typeof detail.height).toBe('number');
  117 |       expect(typeof detail.left).toBe('number');
  118 |       expect(typeof detail.right).toBe('number');
  119 |       expect(typeof detail.top).toBe('number');
  120 |       expect(typeof detail.bottom).toBe('number');
  121 |       expect(detail.id).toBe('target');
```