# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/reactlynx.spec.ts >> reactlynx3 tests >> elements >> x-input >> basic-element-x-input-bindfocus
- Location: tests/reactlynx.spec.ts:3723:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "bindfocus"
Received: ""
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - textbox [ref=e6]: bindfocus
  - generic [ref=e9]:
    - generic: bindfocus
```

# Test source

```ts
  3629 |             'select-index',
  3630 |           );
  3631 |         },
  3632 |       );
  3633 |       test(
  3634 |         'basic-element-x-viewpager-ng-bindchange-select-tab',
  3635 |         async ({ page, browserName }, { title }) => {
  3636 |           let changeCalledCount = 0;
  3637 |           let currentIndex = 0;
  3638 |           await page.on('console', async (msg) => {
  3639 |             const event = await msg.args()[0]?.evaluate((e) => {
  3640 |               return {
  3641 |                 type: e.type,
  3642 |                 current: e.detail?.index,
  3643 |               };
  3644 |             });
  3645 |             if (!event) {
  3646 |               return;
  3647 |             }
  3648 |             if (event.type === 'change') {
  3649 |               changeCalledCount++;
  3650 |               currentIndex = event.current;
  3651 |             }
  3652 |           });
  3653 |           await goto(page, title);
  3654 |           await wait(1000);
  3655 | 
  3656 |           await page.getByTestId('last').click();
  3657 |           await wait(1000);
  3658 |           expect(changeCalledCount).toBe(1);
  3659 |           if (browserName !== 'webkit') {
  3660 |             expect(currentIndex).toBe(5);
  3661 |           }
  3662 |           await page.getByTestId('first').click();
  3663 |           await wait(1000);
  3664 |           expect(changeCalledCount).toBe(2);
  3665 |           if (browserName !== 'webkit') {
  3666 |             expect(currentIndex).toBe(0);
  3667 |           }
  3668 |         },
  3669 |       );
  3670 |     });
  3671 | 
  3672 |     test.describe('x-input', () => {
  3673 |       // input/placeholder test-case start
  3674 |       test('basic-element-x-input-placeholder', async ({ page }, { title }) => {
  3675 |         await goto(page, title);
  3676 |         await wait(100);
  3677 |         await diffScreenShot(page, 'x-input', 'placeholder');
  3678 |       });
  3679 |       // input/placeholder test-case end
  3680 |       test(
  3681 |         'basic-element-x-input-placeholder-pseudo-element',
  3682 |         async ({ page }, { title }) => {
  3683 |           await goto(page, title);
  3684 |           await wait(100);
  3685 |           await diffScreenShot(page, 'x-input', 'placeholder-pseudo-element');
  3686 |         },
  3687 |       );
  3688 | 
  3689 |       // input/type test-case start
  3690 |       test('basic-element-x-input-type', async ({ page }, { title }) => {
  3691 |         await goto(page, title);
  3692 |         await wait(100);
  3693 |         await diffScreenShot(page, 'x-input', 'type');
  3694 |       });
  3695 |       // input/type test-case end
  3696 | 
  3697 |       // input/blur test-case start
  3698 |       test('basic-element-x-input-blur', async ({ page }, { title }) => {
  3699 |         await goto(page, title);
  3700 |         await page.locator('.blur').click();
  3701 |         await wait(100);
  3702 |         const result = await page.locator('.result').first().innerText();
  3703 |         await diffScreenShot(page, 'x-input', 'blur');
  3704 |       });
  3705 |       // input/blur test-case end
  3706 | 
  3707 |       // input/focus test-case start
  3708 |       test(
  3709 |         'basic-element-x-input-focus',
  3710 |         async ({ page, browserName }, { title }) => {
  3711 |           test.skip(browserName === 'firefox', 'flaky');
  3712 |           await goto(page, title);
  3713 |           await wait(100);
  3714 |           await page.locator('.focus').click({ force: true });
  3715 |           await expect(page.locator('.result').first()).toHaveText(
  3716 |             'bindfocus',
  3717 |           );
  3718 |         },
  3719 |       );
  3720 |       // input/focus test-case end
  3721 | 
  3722 |       // input/bindfocus test-case start
  3723 |       test('basic-element-x-input-bindfocus', async ({ page }, { title }) => {
  3724 |         await goto(page, title);
  3725 |         await wait(100);
  3726 |         await page.locator('input').click({ force: true });
  3727 |         await wait(100);
  3728 |         const result = await page.locator('.result').first().innerText();
> 3729 |         expect(result).toBe('bindfocus');
       |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  3730 |       });
  3731 |       // input/bindfocus test-case end
  3732 | 
  3733 |       // input/bindconfirm test-case start
  3734 |       test('basic-element-x-input-bindconfirm', async ({ page }, { title }) => {
  3735 |         await goto(page, title);
  3736 |         await wait(100);
  3737 |         await page.locator('input').press('Enter');
  3738 |         await wait(100);
  3739 |         const result = await page.locator('.result').first().innerText();
  3740 |         expect(result).toBe('bindconfirm');
  3741 |       });
  3742 |       // input/bindconfirm test-case end
  3743 | 
  3744 |       // input/bindinput test-case start
  3745 |       test('basic-element-x-input-bindinput', async ({ page }, { title }) => {
  3746 |         await goto(page, title);
  3747 |         const input = page.locator('input');
  3748 |         const result = page.locator('.result').first();
  3749 | 
  3750 |         // Firefox CI can be slower to finish mounting/binding handlers; wait for initial render first.
  3751 |         await expect(input).toBeVisible();
  3752 |         await expect(input).toHaveValue('bindinput');
  3753 | 
  3754 |         await input.press('Enter');
  3755 |         await input.fill('foobar');
  3756 |         await expect(result).toHaveText('foobar-6-6');
  3757 |       });
  3758 |       // input/bindinput test-case start for <input>
  3759 |       test('basic-element-input-bindinput', async ({ page }, { title }) => {
  3760 |         await goto(page, title);
  3761 |         await page.locator('input').press('Enter');
  3762 |         await wait(200);
  3763 |         await page.locator('input').fill('foobar');
  3764 |         await wait(200);
  3765 |         const result = await page.locator('.result').first().innerText();
  3766 |         expect(result).toBe('foobar-6-6');
  3767 |       });
  3768 |       // input/bindinput test-case start for <x-input-ng>
  3769 |       test(
  3770 |         'basic-element-x-input-ng-bindinput',
  3771 |         async ({ page }, { title }) => {
  3772 |           await goto(page, title);
  3773 |           await page.locator('input').press('Enter');
  3774 |           await wait(200);
  3775 |           await page.locator('input').fill('foobar');
  3776 |           await wait(200);
  3777 |           const result = await page.locator('.result').first().innerText();
  3778 |           expect(result).toBe('foobar-6-6');
  3779 |         },
  3780 |       );
  3781 |       // input/bindinput test-case end
  3782 |       test(
  3783 |         'basic-element-x-input-getValue',
  3784 |         async ({ page }, { title }) => {
  3785 |           await goto(page, title);
  3786 |           await wait(200);
  3787 |           let val = false;
  3788 |           let selectionBegin = false;
  3789 |           let selectionEnd = false;
  3790 |           await page.on('console', async (msg) => {
  3791 |             const event = await msg.args()[0]?.evaluate((e) => ({
  3792 |               ...e,
  3793 |             }));
  3794 |             if (!event) return;
  3795 |             if (event.value === 'hello') {
  3796 |               val = true;
  3797 |             }
  3798 |             if (event.selectionBegin === 2) {
  3799 |               selectionBegin = true;
  3800 |             }
  3801 |             if (event.selectionEnd === 5) {
  3802 |               selectionEnd = true;
  3803 |             }
  3804 |           });
  3805 |           await page.evaluate(() => {
  3806 |             const inputDom = document.querySelector('lynx-view')?.shadowRoot
  3807 |               ?.querySelector('x-input')?.shadowRoot?.querySelector('input');
  3808 |             inputDom?.focus();
  3809 |             inputDom?.setSelectionRange(2, 5);
  3810 |             document.querySelector('lynx-view')?.shadowRoot
  3811 |               ?.querySelector(
  3812 |                 '#target',
  3813 |               )?.click();
  3814 |           });
  3815 |           await wait(200);
  3816 |           expect(val).toBe(true);
  3817 |           expect(selectionBegin).toBe(true);
  3818 |           expect(selectionEnd).toBe(true);
  3819 |         },
  3820 |       );
  3821 |       test(
  3822 |         'basic-element-x-input-bindselection',
  3823 |         async ({ page }, { title }) => {
  3824 |           await goto(page, title);
  3825 |           await wait(200);
  3826 |           await page.evaluate(() => {
  3827 |             const inputDom = document.querySelector('lynx-view')?.shadowRoot
  3828 |               ?.querySelector('x-input')?.shadowRoot?.querySelector('input');
  3829 |             inputDom?.focus();
```