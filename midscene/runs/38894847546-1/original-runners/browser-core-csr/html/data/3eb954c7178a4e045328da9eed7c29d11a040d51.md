# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/reactlynx.spec.ts >> reactlynx3 tests >> configs >> config-mode-dev-with-all-in-one
- Location: tests/reactlynx.spec.ts:2638:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "green"
Received string:    "height:100px;width:100px;background:pink;"
```

# Test source

```ts
  2545 |     );
  2546 |     test(
  2547 |       'config-css-selector-false-remove-all',
  2548 |       async ({ page }, { title }) => {
  2549 |         await goto(page, title);
  2550 |         await wait(100);
  2551 |         const target = page.locator('#target');
  2552 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2553 |         await target.click();
  2554 |         await expect(target).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)'); // unset
  2555 |       },
  2556 |     );
  2557 |     test(
  2558 |       'config-css-selector-false-remove-css-and-reuse-css',
  2559 |       async ({ page }, { title }) => {
  2560 |         await goto(page, title);
  2561 |         await wait(100);
  2562 |         const target = page.locator('#target');
  2563 |         await expect(target).toHaveCSS('background-color', 'rgb(255, 255, 0)'); // yellow
  2564 |         await target.click();
  2565 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2566 |         await target.click();
  2567 |         await expect(target).toHaveCSS('background-color', 'rgb(255, 255, 0)'); // yellow
  2568 |       },
  2569 |     );
  2570 |     test(
  2571 |       'config-css-selector-false-remove-css-and-style-collapsed',
  2572 |       async ({ page }, { title }) => {
  2573 |         await goto(page, title);
  2574 |         await wait(100);
  2575 |         const target = page.locator('#target');
  2576 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2577 |         await target.click();
  2578 |         await expect(target).toHaveCSS('background-color', 'rgb(255, 255, 0)'); // yellow
  2579 |         await target.click();
  2580 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2581 |       },
  2582 |     );
  2583 |     test(
  2584 |       'config-css-selector-false-remove-inline-style-and-reuse-css',
  2585 |       async ({ page }, { title }) => {
  2586 |         await goto(page, title);
  2587 |         await wait(100);
  2588 |         const target = page.locator('#target');
  2589 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2590 |         await target.click();
  2591 |         await expect(target).toHaveCSS('background-color', 'rgb(255, 0, 0)'); // red
  2592 |         await target.click();
  2593 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2594 |       },
  2595 |     );
  2596 |     test(
  2597 |       'config-css-selector-false-type-selector',
  2598 |       async ({ page }, { title }) => {
  2599 |         await goto(page, title);
  2600 |         await wait(100);
  2601 |         const target = page.locator('#target');
  2602 |         await expect(target).toHaveCSS('background-color', 'rgb(255, 255, 0)'); // yellow
  2603 |         await expect(target).toHaveCSS('width', '100px');
  2604 |         await expect(target).toHaveCSS('height', '100px');
  2605 |       },
  2606 |     );
  2607 |     test(
  2608 |       'config-splitchunk-single-vendor',
  2609 |       async ({ page }, { title }) => {
  2610 |         test.skip(true, 'incorrectly implemented test case');
  2611 |         await goto(page, title, undefined, true);
  2612 |         await wait(1500);
  2613 |         const target = page.locator('#target');
  2614 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2615 |       },
  2616 |     );
  2617 |     test(
  2618 |       'config-splitchunk-split-by-experience',
  2619 |       async ({ page }, { title }) => {
  2620 |         test.skip(isSSR, 'incorrectly implemented test case');
  2621 |         await goto(page, title, undefined, true);
  2622 |         await wait(1500);
  2623 |         const target = page.locator('#target');
  2624 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2625 |       },
  2626 |     );
  2627 |     test(
  2628 |       'config-splitchunk-split-by-module',
  2629 |       async ({ page }, { title }) => {
  2630 |         test.skip(isSSR, 'incorrectly implemented test case');
  2631 |         await goto(page, title, undefined, true);
  2632 |         await wait(1500);
  2633 |         const target = page.locator('#target');
  2634 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2635 |       },
  2636 |     );
  2637 | 
  2638 |     test('config-mode-dev-with-all-in-one', async ({ page }, { title }) => {
  2639 |       test.fixme(isSSR, 'implement dev mode for SSR');
  2640 |       await goto(page, title, undefined, true);
  2641 |       await wait(100);
  2642 |       const target = page.locator('#target');
  2643 |       await target.click();
  2644 |       await wait(100);
> 2645 |       await expect(await target.getAttribute('style')).toContain('green');
       |                                                        ^ Error: expect(received).toContain(expected) // indexOf
  2646 |       await target.click();
  2647 |       await wait(100);
  2648 |       await expect(await target.getAttribute('style')).toContain('pink');
  2649 |     });
  2650 | 
  2651 |     test(
  2652 |       'config-css-default-overflow-visible-unset',
  2653 |       async ({ page }, { title }) => {
  2654 |         await goto(page, title);
  2655 |         await diffScreenShot(
  2656 |           page,
  2657 |           title,
  2658 |           'index',
  2659 |         );
  2660 |       },
  2661 |     );
  2662 | 
  2663 |     test(
  2664 |       'config-mixed-01',
  2665 |       async ({ page }, { title }) => {
  2666 |         await goto(page, title);
  2667 |         await wait(100);
  2668 |         const target = page.locator('#target');
  2669 |         await expect(target).toHaveCSS('background-color', 'rgb(0, 128, 0)'); // green
  2670 |       },
  2671 |     );
  2672 |   });
  2673 | 
  2674 |   test.describe('elements', () => {
  2675 |     test.describe('lynx-view', () => {
  2676 |       const elementName = 'lynx-view';
  2677 |       test('lynx-view styles are included in its shadow root', async ({ page }) => {
  2678 |         await goto(page, 'basic-element-lynx-view-not-auto');
  2679 |         await wait(100);
  2680 |         const inShadowCSS = await getInShadowCSS(
  2681 |           page.locator('lynx-view'),
  2682 |         );
  2683 |         expect(inShadowCSS).toMatch(/:host\s*,\s*lynx-view\s*\{/);
  2684 |       });
  2685 |       test('basic-element-lynx-view-not-auto', async ({ page }, { title }) => {
  2686 |         await goto(page, title);
  2687 |         await wait(100);
  2688 |         await page.evaluate(() => {
  2689 |           document.querySelector('lynx-view')!.removeAttribute('height');
  2690 |           document.querySelector('lynx-view')!.removeAttribute('weight');
  2691 |           document.querySelector('lynx-view')!.setAttribute(
  2692 |             'style',
  2693 |             'display:flex; width: 100vw; height: 100vh',
  2694 |           );
  2695 |         });
  2696 |         await wait(200);
  2697 |         await diffScreenShot(
  2698 |           page,
  2699 |           elementName,
  2700 |           title,
  2701 |         );
  2702 |       });
  2703 |     });
  2704 |     test.describe('view', () => {
  2705 |       const elementName = 'view';
  2706 |       test(
  2707 |         'basic-element-view-border-style-default',
  2708 |         async ({ page }, { title }) => {
  2709 |           await goto(page, title);
  2710 |           await diffScreenShot(page, elementName, title);
  2711 |         },
  2712 |       );
  2713 |     });
  2714 |     test.describe('text', () => {
  2715 |       test('basic-element-text-nest-text', async ({ page }, { title }) => {
  2716 |         await goto(page, title);
  2717 |         await wait(100);
  2718 |         await diffScreenShot(page, 'text', 'nest-text');
  2719 |       });
  2720 | 
  2721 |       test('basic-element-text-baseline', async ({ page }, { title }) => {
  2722 |         await goto(page, title);
  2723 |         await wait(100);
  2724 |         await diffScreenShot(page, 'text', 'baseline');
  2725 |       });
  2726 | 
  2727 |       test('basic-element-text-extra-font-family', async ({ page }, {
  2728 |         title,
  2729 |       }) => {
  2730 |         await goto(page, title);
  2731 |         await page.evaluate(async () => {
  2732 |           await document.fonts.load(
  2733 |             '18px "Press Start 2P E2E"',
  2734 |             'EXTRA FONT 0123',
  2735 |           );
  2736 |           await document.fonts.ready;
  2737 |         });
  2738 |         await wait(100);
  2739 |         await diffScreenShot(page, 'text', 'extra-font-family');
  2740 |       });
  2741 | 
  2742 |       test('basic-element-text-nest-image', async ({ page }, { title }) => {
  2743 |         await goto(page, title);
  2744 |         await wait(500); // for image loading
  2745 |         await diffScreenShot(page, 'text', 'nest-image');
```