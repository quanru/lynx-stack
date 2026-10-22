# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/reactlynx.spec.ts >> reactlynx3 tests >> elements >> x-swiper >> basic-element-x-swiper-autoplay
- Location: tests/reactlynx.spec.ts:4469:7

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  13361 pixels (ratio 0.06 of all image pixels) are different.

  Snapshot: x-swiper/autoplay-5/index.png

Call log:
  - Expect "toHaveScreenshot(x-swiper/autoplay-5/index.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded
  - 13361 pixels (ratio 0.06 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 13361 pixels (ratio 0.06 of all image pixels) are different.

```

# Test source

```ts
  1   | // Copyright 2024 The Lynx Authors. All rights reserved.
  2   | // Licensed under the Apache License Version 2.0 that can be found in the
  3   | // LICENSE file in the root directory of this source tree.
  4   | import { test, expect, swipe, dragAndHold } from '@lynx-js/playwright-fixtures';
  5   | import type { Locator, Page } from '@playwright/test';
  6   | import type { LynxViewElement } from '@lynx-js/web-core/client';
  7   | const isSSR = !!process.env['ENABLE_SSR'];
  8   | 
  9   | const wait = async (ms: number) => {
  10  |   await new Promise((resolve) => {
  11  |     setTimeout(resolve, ms);
  12  |   });
  13  | };
  14  | 
  15  | const diffScreenShot = async (
  16  |   page: Page,
  17  |   caseName: string,
  18  |   subcaseName: string,
  19  |   label: string = 'index',
  20  |   screenshotOptions?: Parameters<
  21  |     ReturnType<typeof expect<Page>>['toHaveScreenshot']
  22  |   >[0],
  23  | ) => {
> 24  |   await expect(page).toHaveScreenshot([
      |                      ^ Error: expect(page).toHaveScreenshot(expected) failed
  25  |     `${caseName}`,
  26  |     `${subcaseName}`,
  27  |     `${label}.png`,
  28  |   ], {
  29  |     maxDiffPixelRatio: 0,
  30  |     fullPage: true,
  31  |     animations: 'allow',
  32  |     ...screenshotOptions,
  33  |   });
  34  | };
  35  | 
  36  | const scrollSwiperToCurrent = async (page: Page, testId: string) => {
  37  |   await page.getByTestId(testId).evaluate((element) => {
  38  |     const current = Number(element.getAttribute('current'));
  39  |     if (!Number.isFinite(current)) {
  40  |       return;
  41  |     }
  42  |     (
  43  |       element as HTMLElement & {
  44  |         scrollTo(options: { index: number; smooth: boolean }): void;
  45  |       }
  46  |     ).scrollTo({ index: current, smooth: false });
  47  |   });
  48  | };
  49  | 
  50  | const expectHasText = async (page: Page, text: string) => {
  51  |   await expect(page.getByText(text)).toHaveCount(1);
  52  | };
  53  | 
  54  | const expectNoText = async (page: Page, text: string) => {
  55  |   await expect(page.getByText(text)).toHaveCount(0);
  56  | };
  57  | 
  58  | const getInShadowCSS = (locator: Locator) => {
  59  |   return locator.evaluate(async (element) => {
  60  |     const shadowRoot = element.shadowRoot!;
  61  |     const inlineCSS = Array.from(
  62  |       shadowRoot.querySelectorAll('style'),
  63  |       style => style.textContent ?? '',
  64  |     );
  65  |     const linkedCSS = await Promise.all(
  66  |       Array.from(
  67  |         shadowRoot.querySelectorAll<HTMLLinkElement>(
  68  |           'link[rel="stylesheet"]',
  69  |         ),
  70  |         link => fetch(link.href).then(response => response.text()),
  71  |       ),
  72  |     );
  73  |     return inlineCSS.concat(linkedCSS).join('\n');
  74  |   });
  75  | };
  76  | 
  77  | const goto = async (
  78  |   page: Page,
  79  |   testname: string,
  80  |   testname2?: string,
  81  |   hasDir?: boolean,
  82  | ) => {
  83  |   let url = isSSR ? `/ssr?casename=${testname}` : `/?casename=${testname}`;
  84  |   if (hasDir) {
  85  |     url += '&hasdir=true';
  86  |   }
  87  |   if (testname2) {
  88  |     url += `&casename2=${testname2}`;
  89  |   }
  90  |   await page.goto(url, {
  91  |     waitUntil: 'load',
  92  |   });
  93  |   await page.evaluate(() => document.fonts.ready);
  94  |   if (isSSR) await wait(300);
  95  | };
  96  | 
  97  | test.describe('reactlynx3 tests', () => {
  98  |   test.describe('CSS inheritance', () => {
  99  |     for (const setting of ['true', 'false', 'default']) {
  100 |       test(`config-css-inheritance-${setting}`, async ({ page }, { title }) => {
  101 |         await goto(page, title);
  102 |         const enabled = setting === 'true';
  103 |         const pageElement = page.locator('[part="page"]');
  104 |         if (enabled) {
  105 |           await expect(pageElement).toHaveAttribute(
  106 |             'lynx-enable-css-inheritance',
  107 |             'true',
  108 |           );
  109 |         } else {
  110 |           await expect(pageElement).not.toHaveAttribute(
  111 |             'lynx-enable-css-inheritance',
  112 |           );
  113 |         }
  114 |         for (const id of ['solid-text', 'wrapped-text', 'nested-text']) {
  115 |           await expect(page.locator(`#${id}`)).toHaveCSS(
  116 |             'color',
  117 |             enabled ? 'rgb(255, 0, 0)' : 'rgb(0, 0, 0)',
  118 |           );
  119 |         }
  120 |         const gradient = page.locator('#gradient-text');
  121 |         await expect(page.locator('#wrapped-gradient')).toHaveCSS(
  122 |           'background-image',
  123 |           enabled ? 'linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))' : 'none',
  124 |         );
```