import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import YAML from 'yaml';
import { originalScrollPixels } from './elements-scroll-pixels-source.mjs';
import { originalPixelOptions } from '../web-pixels.ts';

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
