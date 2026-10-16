# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/reactlynx.spec.ts >> reactlynx3 tests >> apis >> api-sendGlobalEvent
- Location: tests/reactlynx.spec.ts:2197:5

# Error details

```
Error: expect(locator).toHaveCSS(expected) failed

Locator:  locator('#target')
Expected: "rgb(0, 128, 0)"
Received: "rgb(255, 192, 203)"
Timeout:  5000ms

Call log:
  - Expect "toHaveCSS" with timeout 5000ms
  - waiting for locator('#target')
    14 × locator resolved to <x-view id="target"></x-view>
       - unexpected value "rgb(255, 192, 203)"

```

# Test source

```ts
  2107 |             fullPage: false,
  2108 |           });
  2109 |         },
  2110 |       );
  2111 |       test('api-exposure-dynamic-ui-margin', async ({ page }, { title }) => {
  2112 |         await goto(page, title);
  2113 |         await wait(100);
  2114 |         await diffScreenShot(page, module, title, '0-initial', {
  2115 |           fullPage: true,
  2116 |         });
  2117 |         await wait(100);
  2118 |         await page.evaluate(() => {
  2119 |           document.querySelector('lynx-view')!.shadowRoot!.querySelector('#y')!
  2120 |             .scrollTop = 200;
  2121 |         });
  2122 |         await wait(100);
  2123 |         await diffScreenShot(page, module, title, '1-orange-half-do-trigger', {
  2124 |           fullPage: false,
  2125 |         });
  2126 |         await wait(100);
  2127 |         await page.evaluate(() => {
  2128 |           document.querySelector('lynx-view')!.shadowRoot!.querySelector('#y')!
  2129 |             .scrollTop = 800;
  2130 |         });
  2131 |         await wait(100);
  2132 |         await diffScreenShot(page, module, title, '2-green-half-not-trigger', {
  2133 |           fullPage: false,
  2134 |         });
  2135 |         await wait(100);
  2136 |         await page.evaluate(() => {
  2137 |           document.querySelector('lynx-view')!.shadowRoot!.querySelector('#y')!
  2138 |             .scrollTop = 1000;
  2139 |         });
  2140 |         await wait(100);
  2141 |         await diffScreenShot(page, module, title, '3-green-half-do-trigger', {
  2142 |           fullPage: false,
  2143 |         });
  2144 |       });
  2145 |       test('api-exposure-stop-events-has-complex-dataset', async ({ page }, {
  2146 |         title,
  2147 |       }) => {
  2148 |         await goto(page, title);
  2149 |         const message: string[] = [];
  2150 |         await wait(200);
  2151 |         await page.on('console', (msg) => {
  2152 |           const text = msg.text();
  2153 |           if (text.startsWith('pass')) {
  2154 |             message.push(msg.text());
  2155 |           }
  2156 |         });
  2157 |         await page.locator('#button').click();
  2158 |         await wait(300);
  2159 |         expect(message).toContain('pass:dataset2');
  2160 |       });
  2161 |       test('api-exposure-stop-events-has-dataset', async ({ page }, {
  2162 |         title,
  2163 |       }) => {
  2164 |         const message: string[] = [];
  2165 |         page.on('console', (msg) => {
  2166 |           const text = msg.text();
  2167 |           if (text.startsWith('pass')) {
  2168 |             message.push(msg.text());
  2169 |           }
  2170 |         });
  2171 |         await goto(page, title);
  2172 |         await page.locator('#button').click();
  2173 |         await wait(200);
  2174 |         expect(message).toContain('pass:dataset1');
  2175 |         expect(message).toContain('pass:dataset2');
  2176 |       });
  2177 |       test(
  2178 |         'api-exposure-stop-exposure',
  2179 |         async ({ page, browserName }, { title }) => {
  2180 |           if (browserName === 'webkit') test.skip();
  2181 |           await goto(page, title);
  2182 |           await wait(300);
  2183 |           page.getByText('lynx.stopExposure()').first().click();
  2184 |           await wait(500);
  2185 |           expect(await page.getByText('disexposure').count()).toBe(1);
  2186 |           page.getByText('lynx.stopExposure({sendEvent: false})').first()
  2187 |             .click();
  2188 |           await wait(500);
  2189 |           expect(await page.getByText('none').count()).toBe(1);
  2190 |           page.getByText('lynx.stopExposure({sendEvent: true})').first()
  2191 |             .click();
  2192 |           await wait(500);
  2193 |           expect(await page.getByText('disexposure').count()).toBe(1);
  2194 |         },
  2195 |       );
  2196 |     });
  2197 |     test('api-sendGlobalEvent', async ({ page }, { title }) => {
  2198 |       await goto(page, title);
  2199 |       await wait(100);
  2200 |       const target = page.locator('#target');
  2201 |       await expect(target).toHaveCSS('background-color', 'rgb(255, 192, 203)'); // pink
  2202 |       await page.evaluate(() => {
  2203 |         (document.querySelector('lynx-view') as LynxViewElement)
  2204 |           .sendGlobalEvent('event-test', ['change']);
  2205 |       });
  2206 |       await wait(200);
> 2207 |       await expect(target).toHaveCSS(
       |                            ^ Error: expect(locator).toHaveCSS(expected) failed
  2208 |         'background-color',
  2209 |         'rgb(0, 128, 0)',
  2210 |       ); // green;
  2211 |     });
  2212 |     test('api-devtool-event', async ({ page }, { title }) => {
  2213 |       await goto(page, title);
  2214 |       const target = page.locator('#target');
  2215 |       await expect(target).toHaveText('ready');
  2216 | 
  2217 |       const data = JSON.stringify({ key: 'value' });
  2218 |       const detail = await page.evaluate((data) => {
  2219 |         const lynxView = document.querySelector(
  2220 |           'lynx-view',
  2221 |         ) as LynxViewElement;
  2222 |         const devtoolMessage = new Promise((resolve) => {
  2223 |           lynxView.addEventListener(
  2224 |             'devtoolMessage',
  2225 |             (event) => resolve((event as CustomEvent).detail),
  2226 |             { once: true },
  2227 |           );
  2228 |         });
  2229 |         lynxView.sendDevtoolEvent('eventname', data);
  2230 |         return devtoolMessage;
  2231 |       }, data);
  2232 | 
  2233 |       await expect(target).toHaveText(data);
  2234 |       expect(detail).toEqual({
  2235 |         type: 'PreactDevtools',
  2236 |         data,
  2237 |       });
  2238 |     });
  2239 |     test('api-invoke-success', async ({ page }, { title }) => {
  2240 |       await goto(page, title);
  2241 |       await wait(100);
  2242 |       const result = page.locator('#result');
  2243 |       await expect(result).toHaveCSS('background-color', 'rgb(255, 192, 203)'); // pink
  2244 |       await page.locator('#target').click();
  2245 |       await wait(100);
  2246 |       await expect(result).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2247 |     });
  2248 |     test('api-invoke-fail', async ({ page }, { title }) => {
  2249 |       await goto(page, title);
  2250 |       await wait(100);
  2251 |       const result = page.locator('#result');
  2252 |       await expect(result).toHaveCSS('background-color', 'rgb(255, 192, 203)'); // pink
  2253 |       await page.locator('#target').click();
  2254 |       await wait(100);
  2255 |       await expect(result).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2256 |     });
  2257 |     test(
  2258 |       'api-queueMicrotask',
  2259 |       async ({ page }, { title }) => {
  2260 |         await goto(page, title);
  2261 |         await wait(200);
  2262 |         const target = page.locator('#target');
  2263 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2264 |       },
  2265 |     );
  2266 |     test(
  2267 |       'api-animate',
  2268 |       async ({ page }, { title }) => {
  2269 |         await goto(page, title);
  2270 |         await wait(500);
  2271 |         await diffScreenShot(page, title, 'initial');
  2272 |         await page.locator('#target').click();
  2273 |         await wait(2000);
  2274 |         await diffScreenShot(page, title, 'animate');
  2275 |       },
  2276 |     );
  2277 |     test(
  2278 |       'api-updateGlobalProps',
  2279 |       async ({ page }, { title }) => {
  2280 |         await goto(page, title);
  2281 |         await wait(200);
  2282 |         await diffScreenShot(page, title, 'initial');
  2283 |         await page.evaluate(() => {
  2284 |           (document.querySelector('lynx-view') as any)?.updateGlobalProps({
  2285 |             backgroundColor: 'blue',
  2286 |           });
  2287 |         });
  2288 |         await wait(500);
  2289 |         await diffScreenShot(page, title, 'blue');
  2290 |       },
  2291 |     );
  2292 |     test(
  2293 |       'api-global-disallowed-vars',
  2294 |       async ({ page }, { title }) => {
  2295 |         let mts = false;
  2296 |         let bts = false;
  2297 |         page.on('console', (message) => {
  2298 |           if (message.text() === 'main thread: undefined, undefined') {
  2299 |             mts = true;
  2300 |           }
  2301 |           if (message.text() === 'background thread: undefined, undefined') {
  2302 |             bts = true;
  2303 |           }
  2304 |         });
  2305 |         await goto(page, title);
  2306 |         await wait(200);
  2307 |         !isSSR && expect(mts).toBe(true);
```