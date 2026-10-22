# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/reactlynx.spec.ts >> reactlynx3 tests >> elements >> x-textarea >> basic-element-x-textarea-bindselection
- Location: tests/reactlynx.spec.ts:5196:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "2-5"
Received: ""
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - textbox [ref=e6]: bindselection
  - generic [ref=e9]:
    - generic: 2-5
```

# Test source

```ts
  5110 |             // manually find it from the JSHandle.
  5111 |             const dataset = await (
  5112 |               await (await msg.args()[0]!.getProperty('target')).getProperty(
  5113 |                 'dataset',
  5114 |               )
  5115 |             ).jsonValue();
  5116 |             if (
  5117 |               event.type === 'focus'
  5118 |               && dataset.testid === 'textarea'
  5119 |               && event.detail.value === ''
  5120 |             ) {
  5121 |               bindfocus = true;
  5122 |             }
  5123 | 
  5124 |             if (
  5125 |               event.type === 'blur'
  5126 |               && dataset.testid === 'textarea'
  5127 |               && event.detail.value === ''
  5128 |             ) {
  5129 |               bindblur = true;
  5130 |             }
  5131 | 
  5132 |             if (
  5133 |               event.type === 'input'
  5134 |               && dataset.testid === 'textarea'
  5135 |               && event.detail.value === 'value'
  5136 |               && event.detail.selectionStart === 5
  5137 |               && event.detail.selectionEnd === 5
  5138 |             ) {
  5139 |               bindinput = true;
  5140 |             }
  5141 |           });
  5142 |           await wait(100);
  5143 |           await page.locator('textarea')?.click({ force: true });
  5144 |           await wait(50);
  5145 |           await page.locator('textarea')?.blur();
  5146 |           await wait(50);
  5147 |           await page.locator('textarea')?.fill('value');
  5148 |           await wait(100);
  5149 |           expect(bindblur).toBeTruthy();
  5150 |           expect(bindfocus).toBeTruthy();
  5151 |           expect(bindinput).toBeTruthy();
  5152 |         },
  5153 |       );
  5154 |       // x-textarea/bindinput test-case end
  5155 |       test(
  5156 |         'basic-element-x-textarea-getValue',
  5157 |         async ({ page, browserName }, { title }) => {
  5158 |           test.skip(browserName === 'webkit');
  5159 |           await goto(page, title);
  5160 |           await wait(200);
  5161 |           let val = false;
  5162 |           let selectionBegin = false;
  5163 |           let selectionEnd = false;
  5164 |           await page.on('console', async (msg) => {
  5165 |             const event = await msg.args()[0]?.evaluate((e) => ({
  5166 |               ...e,
  5167 |             }));
  5168 |             if (!event) return;
  5169 |             if (event.value === 'hello') {
  5170 |               val = true;
  5171 |             }
  5172 |             if (event.selectionBegin === 2) {
  5173 |               selectionBegin = true;
  5174 |             }
  5175 |             if (event.selectionEnd === 5) {
  5176 |               selectionEnd = true;
  5177 |             }
  5178 |           });
  5179 |           await page.evaluate(() => {
  5180 |             const inputDom = document.querySelector('lynx-view')?.shadowRoot
  5181 |               ?.querySelector('x-textarea')?.shadowRoot?.querySelector(
  5182 |                 'textarea',
  5183 |               );
  5184 |             inputDom?.focus();
  5185 |             inputDom?.setSelectionRange(2, 5);
  5186 |             document.querySelector('lynx-view')?.shadowRoot?.querySelector(
  5187 |               '#target',
  5188 |             )?.click();
  5189 |           });
  5190 |           await wait(200);
  5191 |           expect(val).toBe(true);
  5192 |           expect(selectionBegin).toBe(true);
  5193 |           expect(selectionEnd).toBe(true);
  5194 |         },
  5195 |       );
  5196 |       test(
  5197 |         'basic-element-x-textarea-bindselection',
  5198 |         async ({ page }, { title }) => {
  5199 |           await goto(page, title);
  5200 |           await wait(200);
  5201 |           await page.evaluate(() => {
  5202 |             const textareaDom = document.querySelector('lynx-view')?.shadowRoot
  5203 |               ?.querySelector('x-textarea')?.shadowRoot?.querySelector(
  5204 |                 'textarea',
  5205 |               );
  5206 |             textareaDom?.focus();
  5207 |             textareaDom?.setSelectionRange(2, 5);
  5208 |           });
  5209 |           const result = await page.locator('.result').first().innerText();
> 5210 |           expect(result).toBe('2-5');
       |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  5211 |         },
  5212 |       );
  5213 | 
  5214 |       test(
  5215 |         'basic-element-x-textarea-input-filter',
  5216 |         async ({ page }, { title }) => {
  5217 |           await goto(page, title);
  5218 |           await page.locator('textarea').press('Enter');
  5219 |           await wait(200);
  5220 |           await page.locator('textarea').fill('foobar!@#)');
  5221 |           await wait(200);
  5222 |           const result = await page.locator('.result').first().innerText();
  5223 |           expect(result).toBe('foobar');
  5224 |         },
  5225 |       );
  5226 |       test(
  5227 |         'basic-element-x-textarea-color',
  5228 |         async ({ page }, { title }) => {
  5229 |           await goto(page, title);
  5230 |           await wait(500);
  5231 |           await diffScreenShot(page, 'x-textarea', title, 'initial');
  5232 |         },
  5233 |       );
  5234 |     });
  5235 |     test.describe('x-audio-tt', () => {
  5236 |       test('basic-element-x-audio-tt-play', async ({ page }, { title }) => {
  5237 |         // test.skip(true, 'lynx.createSelectorQuery is not supported'); // FIXME
  5238 |       });
  5239 |     });
  5240 | 
  5241 |     test.describe('list', () => {
  5242 |       const elementName = 'list';
  5243 |       test(
  5244 |         'basic-element-list-basic',
  5245 |         async ({ page, browserName }, { title }) => {
  5246 |           let scrolled = false;
  5247 |           let scrollend = false;
  5248 |           await page.on('console', async (msg) => {
  5249 |             const event = await msg.args()[0]?.evaluate((e) => ({
  5250 |               type: e.type,
  5251 |             }));
  5252 |             if (!event) return;
  5253 |             if (event.type === 'scroll') {
  5254 |               scrolled = true;
  5255 |             }
  5256 |             if (event.type === 'scrollend') {
  5257 |               scrollend = true;
  5258 |             }
  5259 |           });
  5260 | 
  5261 |           await goto(page, title);
  5262 |           await diffScreenShot(page, elementName, title);
  5263 |           await page.evaluate(() => {
  5264 |             document.querySelector('lynx-view')!.shadowRoot!.querySelector(
  5265 |               'x-list',
  5266 |             )?.shadowRoot?.querySelector(
  5267 |               '#content',
  5268 |             )
  5269 |               ?.scrollTo(0, 500);
  5270 |           });
  5271 |           await wait(1000);
  5272 |           expect(scrolled).toBeTruthy();
  5273 |           expect(scrollend).toBeTruthy();
  5274 |         },
  5275 |       );
  5276 |       test(
  5277 |         'basic-element-list-bindwheel',
  5278 |         async ({ page, browserName }, { title }) => {
  5279 |           test.skip(
  5280 |             browserName === 'webkit',
  5281 |             'mouse wheel unsupported on webkit',
  5282 |           );
  5283 |           await goto(page, title);
  5284 |           await wait(300);
  5285 |           await page.locator('#target').hover();
  5286 |           await page.mouse.wheel(0, 100);
  5287 |           await expect(page.locator('#result')).toHaveText('wheel');
  5288 |           await expect(page.locator('#indicator')).toHaveCSS(
  5289 |             'background-color',
  5290 |             'rgb(0, 128, 0)',
  5291 |           );
  5292 |         },
  5293 |       );
  5294 |       test(
  5295 |         'basic-element-list-basic-size',
  5296 |         async ({ page, browserName }, { title }) => {
  5297 |           let scrolled = false;
  5298 |           let scrollend = false;
  5299 |           await page.on('console', async (msg) => {
  5300 |             const event = await msg.args()[0]?.evaluate((e) => ({
  5301 |               type: e.type,
  5302 |             }));
  5303 |             if (!event) return;
  5304 |             if (event.type === 'scroll') {
  5305 |               scrolled = true;
  5306 |             }
  5307 |             if (event.type === 'scrollend') {
  5308 |               scrollend = true;
  5309 |             }
  5310 |           });
```