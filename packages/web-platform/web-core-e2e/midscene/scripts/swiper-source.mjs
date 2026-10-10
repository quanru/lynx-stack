import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

export const redPanelClick =
  'Click once in the center of the red panel with a black border at the top of the page. Do not swipe or perform another action.';
export const rightPanelClick =
  'Click once in the center of the RIGHT-HAND colored panel with a black border at the top of the page, to the RIGHT of the green panel. The two panels are side by side, not stacked. Do not click the left panel, swipe, or perform another action.';
export const listClick =
  'Click the visible text "scrollToPosition" once. Do not scroll manually or perform another action.';

export async function originalSwiperPixels() {
  const ast = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL(
        '../../tests/reactlynx.spec.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const targets = new Map([
    ...['normal', 'carousel', 'coverflow', 'flat-coverflow'].map(mode => [
      'basic-element-x-swiper-mode-' + mode,
      [mode, redPanelClick],
    ]),
    ['basic-element-x-swiper-current', ['swiper-1', rightPanelClick]],
    ['basic-element-list-scroll-to-position', ['#scrollToPosition', listClick]],
  ]);
  const callbacks = new Map();
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && targets.has(node.arguments[0]?.text)
    ) {
      callbacks.set(node.arguments[0].text, node.arguments[1]);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(callbacks.size, targets.size);
  const cases = [];
  for (const [name, [selector, prompt]] of targets) {
    const steps = [];
    const context = {
      browserName: 'chromium',
      elementName: 'list',
      test: {
        skip: condition =>
          assert.equal(
            condition,
            false,
            'Never enable an original disabled case',
          ),
      },
      goto: async (_page, title) => {
        assert.equal(title, name);
        steps.push({ gotoUrl: '${shellUrl}?casename=' + title }, {
          javascript: 'document.fonts.ready.then(() => true)',
        });
      },
      wait: async duration =>
        steps.push({
          javascript:
            `new Promise(resolve => setTimeout(() => resolve(true), ${duration}))`,
        }),
      diffScreenShot: async (
        _page,
        category,
        title,
        label = 'index',
        overrides = {},
      ) => {
        // Accept only identical original helper defaults, never drop an override.
        for (const [key, value] of Object.entries(overrides)) {
          assert.ok(
            (key === 'animations' && value === 'allow')
              || (key === 'fullPage' && value === true),
          );
        }
        steps.push({
          'web.pixels': { baseline: [category, title, label].join('/') },
        });
      },
    };
    const locator = target => {
      assert.equal(target, selector);
      return {
        click: async () =>
          steps.push({
            aiAct: { prompt, options: { deepLocate: true, cacheable: false } },
          }),
      };
    };
    const callback = runInNewContext(
      ts.transpile('(' + callbacks.get(name).getText(ast) + ')', {
        target: ts.ScriptTarget.ES2022,
      }),
      context,
    );
    await callback({
      page: { getByTestId: locator, locator },
      browserName: 'chromium',
    }, { title: name });
    cases.push({ name, steps });
  }
  return cases;
}
