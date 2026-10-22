import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

export async function originalElementsSwiper() {
  const names = [
    'x-swiper-set-current',
    'x-swiper-indicator-basic',
    'x-swiper-indicator-color',
    'x-swiper-indicator-active-color',
    'x-swiper-basic-autoplay',
    'x-swiper-basic-circular-autoplay',
    'x-swiper-basic-autoplay-interval',
  ].map(name => 'x-swiper/' + name);
  const ast = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL(
        '../../../web-elements/tests/web-elements.spec.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const callbacks = new Map();
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && names.includes(node.arguments[0]?.text)
    ) callbacks.set(node.arguments[0].text, node.arguments[1]);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(callbacks.size, names.length);
  const cases = [];
  const options = [];
  for (const name of names) {
    const steps = [];
    const run = vm.runInNewContext(
      ts.transpile('(' + callbacks.get(name).getText(ast) + ')', {
        target: ts.ScriptTarget.ES2022,
      }),
      {
        test: {
          skip: condition =>
            assert.equal(
              condition,
              false,
              'Do not activate disabled/browser-skipped originals',
            ),
        },
        async gotoWebComponentPage(_page, title) {
          assert.equal(title, name);
          steps.push({
            gotoUrl: '${elementsUrl}tests/fixtures/' + name + '.html',
          }, { javascript: 'document.fonts.ready.then(() => true)' });
        },
        async wait(ms) {
          assert.ok(Number.isFinite(ms) && ms >= 0);
          steps.push({
            javascript:
              `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
          });
        },
        async diffScreenShot(_page, title, label, overrides = {}) {
          assert.equal(title, name);
          const baseline = name + '/' + label;
          const actual = JSON.parse(JSON.stringify(overrides));
          assert.ok(Object.keys(actual).every(key => key === 'clip'));
          if (actual.clip) {
            assert.deepEqual(actual.clip, {
              x: 50,
              width: 100,
              y: 170,
              height: 30,
            });
          }
          options.push({ baseline, overrides: actual });
          steps.push({ 'web.pixels': { suite: 'web-elements', baseline } });
        },
      },
    );
    await run({
      browserName: 'chromium',
      page: {
        locator(selector) {
          assert.ok(['x-swiper', '#target'].includes(selector));
          return {
            async evaluate(callback) {
              // Only original public attribute setters, never a scripted UI action.
              const calls = [];
              callback({ setAttribute: (...args) => calls.push(args) });
              assert.equal(calls.length, 1);
              assert.ok(
                ['current', 'indicator-color', 'indicator-active-color']
                  .includes(calls[0][0]),
              );
              steps.push({
                javascript: `(${callback.toString()})(document.querySelector(${
                  JSON.stringify(selector)
                }))`,
              });
            },
          };
        },
      },
    }, { title: name });
    cases.push({ name: 'web-elements/' + name, steps });
  }
  return { cases, options };
}
