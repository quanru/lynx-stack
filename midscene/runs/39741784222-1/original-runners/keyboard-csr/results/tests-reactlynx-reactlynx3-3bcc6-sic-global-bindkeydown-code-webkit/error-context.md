# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/reactlynx.spec.ts >> reactlynx3 tests >> basic >> basic-global-bindkeydown-code
- Location: tests/reactlynx.spec.ts:315:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "KeyA"
Received: "none"
```

# Page snapshot

```yaml
- generic [ref=e7]:
  - generic: KeyA
```

# Test source

```ts
  221 |       });
  222 |     }
  223 |   });
  224 |   test.describe('basic', () => {
  225 |     test('basic-pink-rect', async ({ page }, { title }) => {
  226 |       await goto(page, title);
  227 |       await wait(100);
  228 |       const target = await page.locator('#target');
  229 |       await expect(target).toHaveCSS('height', '100px');
  230 |       await expect(target).toHaveCSS('width', '100px');
  231 |       await expect(target).toHaveCSS('background-color', 'rgb(255, 192, 203)');
  232 |     });
  233 | 
  234 |     test('basic-reload', async ({ page }, { title }) => {
  235 |       await goto(page, title);
  236 |       await wait(100);
  237 |       const target = page.locator('#target');
  238 |       await target.click();
  239 |       await wait(100);
  240 |       await expect(await target.getAttribute('style')).toContain('green');
  241 |       await page.evaluate(() => {
  242 |         (document.querySelector('lynx-view') as LynxViewElement).reload();
  243 |       });
  244 |       await wait(100);
  245 |       await expect(await target.getAttribute('style')).toContain('pink');
  246 |     });
  247 |     test('basic-reload-page-only-one', async ({ page }) => {
  248 |       await goto(page, 'basic-reload');
  249 |       await wait(100);
  250 |       await page.evaluate(() => {
  251 |         (document.querySelector('lynx-view') as LynxViewElement).reload();
  252 |       });
  253 |       await wait(100);
  254 |       expect(
  255 |         await page.evaluate(() =>
  256 |           Array.from(
  257 |             document.querySelector('lynx-view')?.shadowRoot?.children || [],
  258 |           )
  259 |             .filter(i => i.getAttribute('part') === 'page').length
  260 |         ),
  261 |       ).toBe(1);
  262 |     });
  263 |     test('basic-bindtap', async ({ page }, { title }) => {
  264 |       await goto(page, title);
  265 |       await wait(100);
  266 |       const target = page.locator('#target');
  267 |       await target.click();
  268 |       await wait(100);
  269 |       await expect(await target.getAttribute('style')).toContain('green');
  270 |       await target.click();
  271 |       await wait(100);
  272 |       await expect(await target.getAttribute('style')).toContain('pink');
  273 |     });
  274 |     test('basic-global-bind', async ({ page }, { title }) => {
  275 |       await goto(page, title);
  276 |       await wait(100);
  277 |       const target = page.locator('#target');
  278 |       const observer = page.locator('#observer');
  279 | 
  280 |       await target.click();
  281 |       await wait(100);
  282 |       await expect(await observer.getAttribute('style')).toContain('green');
  283 |       await target.click();
  284 |       await wait(100);
  285 |       await expect(await observer.getAttribute('style')).toContain('pink');
  286 |     });
  287 |     test('basic-global-bindkeydown', async ({ page }, { title }) => {
  288 |       await goto(page, title);
  289 |       await wait(100);
  290 |       const observer = page.locator('#observer');
  291 |       await page.keyboard.press('a');
  292 |       await wait(100);
  293 |       await expect(await observer.getAttribute('style')).toContain('green');
  294 |     });
  295 |     test('basic-global-bindkeyup', async ({ page }, { title }) => {
  296 |       await goto(page, title);
  297 |       await wait(100);
  298 |       const observer = page.locator('#observer');
  299 |       await page.keyboard.down('a');
  300 |       await wait(100);
  301 |       // keyup hasn't fired yet — observer should still be pink.
  302 |       await expect(await observer.getAttribute('style')).toContain('pink');
  303 |       await page.keyboard.up('a');
  304 |       await wait(100);
  305 |       await expect(await observer.getAttribute('style')).toContain('green');
  306 |     });
  307 |     test('basic-global-bindkeydown-key', async ({ page }, { title }) => {
  308 |       await goto(page, title);
  309 |       await wait(100);
  310 |       const observer = page.locator('#observer');
  311 |       await page.keyboard.press('Enter');
  312 |       await wait(100);
  313 |       await expect(await observer.getAttribute('data-key')).toBe('Enter');
  314 |     });
  315 |     test('basic-global-bindkeydown-code', async ({ page }, { title }) => {
  316 |       await goto(page, title);
  317 |       await wait(100);
  318 |       const observer = page.locator('#observer');
  319 |       await page.keyboard.press('a');
  320 |       await wait(100);
> 321 |       await expect(await observer.getAttribute('data-code')).toBe('KeyA');
      |                                                              ^ Error: expect(received).toBe(expected) // Object.is equality
  322 |     });
  323 |     test('basic-global-bindkeydown-shift', async ({ page }, { title }) => {
  324 |       await goto(page, title);
  325 |       await wait(100);
  326 |       const observer = page.locator('#observer');
  327 |       await page.keyboard.press('Shift+a');
  328 |       await wait(100);
  329 |       await expect(await observer.getAttribute('style')).toContain('green');
  330 |     });
  331 |     test('basic-bindkeydown-out-of-view-noop', async ({ page }, { title }) => {
  332 |       await goto(page, title);
  333 |       await wait(100);
  334 |       const observer = page.locator('#observer');
  335 |       await page.keyboard.press('a');
  336 |       await wait(100);
  337 |       // Non-global `bindKeydown` must NOT fire for an out-of-view keypress.
  338 |       await expect(await observer.getAttribute('style')).toContain('pink');
  339 |     });
  340 |     test('basic-bindtap-detail', async ({ page }, { title }) => {
  341 |       await goto(page, title);
  342 |       await wait(100);
  343 |       const target = page.locator('#target');
  344 |       await target.click();
  345 |       await wait(100);
  346 |       await expect(await target.getAttribute('style')).toContain('green');
  347 |       await target.click();
  348 |       await wait(100);
  349 |       await expect(await target.getAttribute('style')).toContain('pink');
  350 |     });
  351 |     test('basic-element-x-webview-bindmessage', async ({ page }, { title }) => {
  352 |       test.skip(isSSR, 'x-webview iframe messaging runs on the client');
  353 |       await goto(page, title);
  354 |       await expect(page.locator('#webview-message')).toHaveText(
  355 |         'hello from iframe',
  356 |       );
  357 |     });
  358 |     test('basic-event-target-id', async ({ page }, { title }) => {
  359 |       await goto(page, title);
  360 |       await wait(100);
  361 |       const target = page.locator('#target');
  362 |       await target.click();
  363 |       await wait(100);
  364 |       await expect(await target.getAttribute('style')).toContain('green');
  365 |       await target.click();
  366 |       await wait(100);
  367 |       await expect(await target.getAttribute('style')).toContain('pink');
  368 |     });
  369 |     test('basic-class-selector', async ({ page }, { title }) => {
  370 |       await goto(page, title);
  371 |       await wait(100);
  372 |       const computedStyle = await page.locator('#target').evaluate((dom) => {
  373 |         const style = getComputedStyle(dom);
  374 |         const height = style.height;
  375 |         const width = style.width;
  376 |         const backgroundColor = style.backgroundColor;
  377 |         return {
  378 |           height,
  379 |           width,
  380 |           backgroundColor,
  381 |         };
  382 |       });
  383 |       expect(computedStyle.height).toBe('100px');
  384 |       expect(computedStyle.width).toBe('100px');
  385 |       expect(computedStyle.backgroundColor).toBe('rgb(255, 192, 203)');
  386 |     });
  387 |     test('basic-setstate-in-constructor', async ({ page }, { title }) => {
  388 |       await goto(page, title);
  389 |       await wait(200);
  390 |       const target = page.locator('#target');
  391 |       await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  392 |     });
  393 |     test('basic-setsate-with-cb', async ({ page }, { title }) => {
  394 |       await goto(page, title);
  395 |       await wait(400);
  396 |       await expectHasText(page, 'awesome');
  397 |       await expectNoText(page, 'success');
  398 |     });
  399 |     test('basic-globalProps', async ({ page }, { title }) => {
  400 |       await goto(page, title);
  401 |       await wait(100);
  402 |       expect(await page.locator('#target').getAttribute('style')).toContain(
  403 |         'pink',
  404 |       );
  405 |     });
  406 |     test('basic-dataprocessor', async ({ page }, { title }) => {
  407 |       await goto(page, title);
  408 |       await wait(100);
  409 |       expect(await page.locator('#target').getAttribute('style')).toContain(
  410 |         'green',
  411 |       );
  412 |     });
  413 |     test('basic-globalProps-reload', async ({ page }, {}) => {
  414 |       await goto(page, 'basic-globalProps');
  415 |       await wait(100);
  416 |       expect(await page.locator('#target').getAttribute('style')).toContain(
  417 |         'pink',
  418 |       );
  419 |       await page.evaluate(() => {
  420 |         (document.querySelector('lynx-view') as LynxViewElement)
  421 |           ?.updateGlobalProps({
```