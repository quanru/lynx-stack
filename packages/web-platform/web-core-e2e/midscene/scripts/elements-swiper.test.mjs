import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalElementsSwiper } from './elements-swiper-source.mjs';
import { originalPixelOptions, pixelOptions } from '../web-pixels.ts';

test('seven elements swiper callbacks preserve every attribute, fixed wait, browser skip and original PNG option', async () => {
  const source = await originalElementsSwiper();
  const migrated = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/elements-swiper.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(source.cases.length, 7);
  assert.deepEqual(migrated.cases, source.cases);
  assert.ok(migrated.afterEach[0].recordToReport);
  for (const { baseline, overrides } of source.options) {
    assert.deepEqual(originalPixelOptions(baseline, 'web-elements'), {
      ...pixelOptions,
      ...overrides,
    });
    assert.ok(
      existsSync(
        new URL(
          '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
            + baseline + '-chromium-linux.png',
          import.meta.url,
        ),
      ),
    );
  }
  for (const item of source.cases) {
    assert.ok(
      existsSync(
        new URL(
          '../../../web-elements/tests/fixtures/'
            + item.name.slice('web-elements/'.length) + '.html',
          import.meta.url,
        ),
      ),
    );
  }
});

test('original indicator clipping cannot leak to other labels or suites and caller mutation cannot change it', () => {
  const baseline = 'x-swiper/x-swiper-indicator-basic/initial';
  const first = originalPixelOptions(baseline, 'web-elements');
  first.clip.x = 999;
  assert.equal(originalPixelOptions(baseline, 'web-elements').clip.x, 50);
  assert.deepEqual(originalPixelOptions(baseline), pixelOptions);
  assert.deepEqual(
    originalPixelOptions(baseline + '-other', 'web-elements'),
    pixelOptions,
  );
});
