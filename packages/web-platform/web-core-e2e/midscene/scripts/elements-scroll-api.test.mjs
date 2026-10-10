import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import YAML from 'yaml';
import { originalScrollPixels } from './elements-scroll-pixels-source.mjs';
import { originalPixelOptions } from '../web-pixels.ts';

test('seven complete scroll method callbacks retain their API arguments and fourteen exact PNG checkpoints', async () => {
  const cases = await originalScrollPixels(true);
  assert.deepEqual(cases.map(item => item.name), [
    'web-elements/scroll-view/method-auto-scroll',
    'web-elements/scroll-view/scroll-to',
    'web-elements/scroll-view/scroll-into-view-basic',
    'web-elements/scroll-view/scroll-into-view-basic-x',
    'web-elements/scroll-view/scroll-into-view-text',
    'web-elements/scroll-view/scroll-into-view-text-x',
    'web-elements/scroll-view/scroll-into-view-nested-scroll-view',
  ]);
  const translated = YAML.parse(
    readFileSync(
      new URL(
        '../cases/web-pixels/elements-scroll-methods.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  assert.deepEqual(translated.cases, cases);
  assert.equal(translated.afterEach.length, 1);
  const calls = [];
  const waits = [];
  const context = {
    setTimeout: (callback, ms) => {
      waits.push(ms);
      callback();
    },
    document: {
      fonts: { ready: Promise.resolve() },
      querySelectorAll: selector => [{
        autoScroll: options =>
          calls.push([
            selector,
            'autoScroll',
            JSON.parse(JSON.stringify(options)),
          ]),
        scrollTo: options =>
          calls.push([
            selector,
            'scrollTo',
            JSON.parse(JSON.stringify(options)),
          ]),
        scrollIntoView: options =>
          calls.push([
            selector,
            'scrollIntoView',
            JSON.parse(JSON.stringify(options)),
          ]),
        set scrollTop(value) {
          calls.push([selector, 'scrollTop', value]);
        },
      }],
    },
  };
  const expected = [
    ['scroll-view', 'autoScroll', { start: true, rate: 50 }],
    ['scroll-view', 'autoScroll', { start: false, rate: 100 }],
    ['scroll-view', 'autoScroll', { start: true, rate: 100 }],
    ['scroll-view', 'autoScroll', { start: false, rate: 100 }],
    ['scroll-view', 'scrollTo', { index: 2 }],
    ['scroll-view', 'scrollTo', { index: 0 }],
    ['scroll-view', 'scrollTo', { offset: 50 }],
    ['scroll-view', 'scrollTo', { offset: 50, index: 2 }],
  ];
  for (const tag of ['x-view:nth-child(3)', 'x-text']) {
    for (const axis of ['block', 'inline']) {
      for (const position of ['start', 'center', 'end']) {
        expected.push([`#${position} > ${tag}`, 'scrollIntoView', {
          scrollIntoViewOptions: { [axis]: position },
        }]);
      }
    }
  }
  expected.push(['#target > x-view:nth-child(3)', 'scrollIntoView', {
    scrollIntoViewOptions: { inline: 'start' },
  }], ['#outer', 'scrollTop', 200]);
  let pixels = 0;
  for (const item of cases) {
    for (const step of item.steps) {
      if (step.javascript) await vm.runInNewContext(step.javascript, context);
      if (step['web.pixels']) {
        pixels++;
        const { baseline } = step['web.pixels'];
        assert.ok(
          existsSync(
            new URL(
              '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
                + baseline + '-chromium-linux.png',
              import.meta.url,
            ),
          ),
        );
        assert.equal(
          originalPixelOptions(baseline, 'web-elements').maxDiffPixelRatio,
          0,
        );
      }
    }
  }
  assert.equal(pixels, 14);
  assert.deepEqual(calls, expected);
  assert.deepEqual(waits, [500, 500, 100, 100, 100, 100, 100]);
});

test('autoScroll preserves Chromium-only source guard and both original 500ms waits', async () => {
  const chromium = await originalScrollPixels(true);
  const autoScroll = chromium[0];
  assert.equal(autoScroll.name, 'web-elements/scroll-view/method-auto-scroll');
  assert.equal(
    autoScroll.steps.filter(step => step.javascript?.includes('setTimeout'))
      .length,
    2,
  );
  for (const browserName of ['firefox', 'webkit']) {
    assert.deepEqual(
      await originalScrollPixels(true, browserName),
      chromium.slice(1),
    );
  }
  await assert.rejects(originalScrollPixels(true, 'unknown'));
});

test('two programmatic scroll API callbacks preserve whole originals and all five original PNGs', async () => {
  const original = await originalScrollPixels();
  assert.equal(original.length, 2);
  const translated = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/elements-scroll-api.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(translated.cases, original);
  assert.equal(translated.afterEach.length, 1);
  const baselines = original.flatMap(item =>
    item.steps.filter(step => step['web.pixels']).map(step =>
      step['web.pixels'].baseline
    )
  );
  assert.equal(baselines.length, 5);
  for (const baseline of baselines) {
    assert.ok(
      existsSync(
        new URL(
          '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
            + baseline + '-chromium-linux.png',
          import.meta.url,
        ),
      ),
    );
    assert.equal(
      originalPixelOptions(baseline, 'web-elements').maxDiffPixelRatio,
      0,
    );
  }
});

test('scroll API values remain 300/99/101 and locator ambiguity or missing attachment cannot pass', async () => {
  const cases = await originalScrollPixels();
  const values = [];
  const target = {
    set scrollTop(value) {
      values.push(value);
    },
  };
  const context = {
    document: {
      fonts: { ready: Promise.resolve() },
      querySelector: () => target,
      querySelectorAll: () => [target],
    },
  };
  for (const item of cases) {
    for (const step of item.steps.filter(step => step.javascript)) {
      await vm.runInNewContext(step.javascript, context);
    }
  }
  assert.deepEqual(values, [300, 99, 101]);
  const locatorStep = cases[1].steps.find(step =>
    step.javascript?.includes('querySelectorAll')
  );
  await assert.rejects(
    vm.runInNewContext(locatorStep.javascript, {
      document: { querySelectorAll: () => [target, target] },
    }),
    /strictness violation/,
  );
  let now = 0;
  await assert.rejects(
    vm.runInNewContext(locatorStep.javascript, {
      document: { querySelectorAll: () => [] },
      Date: { now: () => now },
      requestAnimationFrame: callback => {
        now += 1000;
        callback();
      },
    }),
    /attachment timed out/,
  );
  assert.deepEqual(values, [300, 99, 101]);
});
