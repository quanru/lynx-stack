# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/web-core.test.ts >> web core tests >> api-get-i18n-resource-by-mts
- Location: tests/web-core.test.ts:741:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  664 |       );
  665 |     });
  666 |     await page.evaluate(() => {
  667 |       globalThis.runtime._I18nResourceTranslation({
  668 |         locale: 'en',
  669 |         channel: '2',
  670 |         fallback_url: '',
  671 |       });
  672 |     });
  673 |     await wait(500);
  674 |     success = await page.evaluate<boolean>(() => {
  675 |       return success;
  676 |     });
  677 |     expect(success).toBeTruthy();
  678 |   });
  679 |   test('api-update-i18n-resources', async ({ page, browserName }) => {
  680 |     // firefox dose not support this.
  681 |     test.skip(browserName === 'firefox');
  682 |     await goto(page);
  683 |     const first = await page.evaluate(() => {
  684 |       if (
  685 |         globalThis.runtime._I18nResourceTranslation({
  686 |           locale: 'en',
  687 |           channel: '2',
  688 |           fallback_url: '',
  689 |         }) === undefined
  690 |       ) {
  691 |         return true;
  692 |       }
  693 |     });
  694 |     await wait(500);
  695 |     await page.evaluate(() => {
  696 |       (document.querySelector('lynx-view') as any)?.updateI18nResources([
  697 |         {
  698 |           options: {
  699 |             locale: 'en',
  700 |             channel: '1',
  701 |             fallback_url: '',
  702 |           },
  703 |           resource: {
  704 |             hello: 'hello',
  705 |             lynx: 'lynx web platform1',
  706 |           },
  707 |         },
  708 |         {
  709 |           options: {
  710 |             locale: 'en',
  711 |             channel: '2',
  712 |             fallback_url: '',
  713 |           },
  714 |           resource: {
  715 |             hello: 'hello',
  716 |             lynx: 'lynx web platform2',
  717 |           },
  718 |         },
  719 |       ], {
  720 |         locale: 'en',
  721 |         channel: '2',
  722 |         fallback_url: '',
  723 |       });
  724 |     });
  725 |     await wait(500);
  726 |     const second = await page.evaluate(() => {
  727 |       if (
  728 |         JSON.stringify(globalThis.runtime._I18nResourceTranslation({
  729 |           locale: 'en',
  730 |           channel: '2',
  731 |           fallback_url: '',
  732 |         })) === '{"hello":"hello","lynx":"lynx web platform2"}'
  733 |       ) {
  734 |         return true;
  735 |       }
  736 |     });
  737 |     await wait(500);
  738 |     expect(first).toBeTruthy();
  739 |     expect(second).toBeTruthy();
  740 |   });
  741 |   test('api-get-i18n-resource-by-mts', async ({ page, browserName }) => {
  742 |     // firefox dose not support this.
  743 |     test.skip(browserName === 'firefox');
  744 |     await goto(page);
  745 | 
  746 |     await wait(500);
  747 |     const backWorker = await getBackgroundThreadWorker(page);
  748 |     const first = await backWorker?.evaluate(() =>
  749 |       globalThis.runtime.lynx.getNativeLynx().getI18nResource() === undefined
  750 |     );
  751 |     await wait(500);
  752 |     await page.evaluate(() => {
  753 |       globalThis.runtime._I18nResourceTranslation({
  754 |         locale: 'en',
  755 |         channel: '1',
  756 |         fallback_url: '',
  757 |       });
  758 |     });
  759 |     const second = await backWorker?.evaluate(() =>
  760 |       JSON.stringify(globalThis.runtime.lynx.getNativeLynx().getI18nResource())
  761 |         === '{"hello":"hello","lynx":"lynx web platform1"}'
  762 |     );
  763 |     expect(first).toBeTruthy();
> 764 |     expect(second).toBeTruthy();
      |                    ^ Error: expect(received).toBeTruthy()
  765 |   });
  766 |   test('api-get-i18n-resource-by-lynx-update', async ({ page, browserName }) => {
  767 |     // firefox dose not support this.
  768 |     test.skip(browserName === 'firefox');
  769 |     await goto(page);
  770 | 
  771 |     await wait(500);
  772 |     const backWorker = await getBackgroundThreadWorker(page);
  773 |     const first = await backWorker?.evaluate(() =>
  774 |       globalThis.runtime.lynx.getNativeLynx().getI18nResource() === undefined
  775 |     );
  776 |     await wait(500);
  777 |     await page.evaluate(() => {
  778 |       (document.querySelector('lynx-view') as any)?.updateI18nResources([
  779 |         {
  780 |           options: {
  781 |             locale: 'en',
  782 |             channel: '1',
  783 |             fallback_url: '',
  784 |           },
  785 |           resource: {
  786 |             hello: 'hello',
  787 |             lynx: 'lynx web platform1',
  788 |           },
  789 |         },
  790 |         {
  791 |           options: {
  792 |             locale: 'en',
  793 |             channel: '2',
  794 |             fallback_url: '',
  795 |           },
  796 |           resource: {
  797 |             hello: 'hello',
  798 |             lynx: 'lynx web platform2',
  799 |           },
  800 |         },
  801 |       ], {
  802 |         locale: 'en',
  803 |         channel: '2',
  804 |         fallback_url: '',
  805 |       });
  806 |     });
  807 |     await wait(500);
  808 |     const second = await backWorker?.evaluate(() =>
  809 |       JSON.stringify(globalThis.runtime.lynx.getNativeLynx().getI18nResource())
  810 |         === '{"hello":"hello","lynx":"lynx web platform2"}'
  811 |     );
  812 |     expect(first).toBeTruthy();
  813 |     expect(second).toBeTruthy();
  814 |   });
  815 |   test('api-onI18nResourceReady-by-mts', async ({ page, browserName }) => {
  816 |     // firefox dose not support this.
  817 |     test.skip(browserName === 'firefox');
  818 |     await goto(page);
  819 | 
  820 |     await wait(500);
  821 |     let success = false;
  822 |     await page.on('console', async (message) => {
  823 |       if (message.text() === 'onI18nResourceReady') {
  824 |         success = true;
  825 |       }
  826 |     });
  827 |     const backWorker = await getBackgroundThreadWorker(page);
  828 |     await backWorker?.evaluate(() => {
  829 |       globalThis.runtime.GlobalEventEmitter.addListener(
  830 |         'onI18nResourceReady',
  831 |         () => {
  832 |           console.log('onI18nResourceReady');
  833 |         },
  834 |       );
  835 |     });
  836 |     await wait(500);
  837 |     await page.evaluate(() => {
  838 |       globalThis.runtime._I18nResourceTranslation({
  839 |         locale: 'en',
  840 |         channel: '1',
  841 |         fallback_url: '',
  842 |       });
  843 |     });
  844 |     await wait(500);
  845 |     expect(success).toBeTruthy();
  846 |   });
  847 |   test('api-onI18nResourceReady-by-lynx-update', async ({ page, browserName }) => {
  848 |     // firefox dose not support this.
  849 |     test.skip(browserName === 'firefox');
  850 |     await goto(page);
  851 | 
  852 |     await wait(500);
  853 |     let success = false;
  854 |     await page.on('console', async (message) => {
  855 |       if (message.text() === 'onI18nResourceReady') {
  856 |         success = true;
  857 |       }
  858 |     });
  859 |     const backWorker = await getBackgroundThreadWorker(page);
  860 |     await backWorker?.evaluate(() => {
  861 |       globalThis.runtime.GlobalEventEmitter.addListener(
  862 |         'onI18nResourceReady',
  863 |         () => {
  864 |           console.log('onI18nResourceReady');
```