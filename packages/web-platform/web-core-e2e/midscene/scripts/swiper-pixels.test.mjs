import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalSwiperPixels, redPanelClick } from './swiper-source.mjs';

test('swiper mode clicks finish after one input even when the original red target is replaced', async () => {
  assert.match(redPanelClick, /initially red panel/);
  assert.match(redPanelClick, /Finish after this single click/);
  assert.match(
    redPanelClick,
    /do not look for or click the red panel again afterward/,
  );
  const modes = (await originalSwiperPixels()).filter(item =>
    item.name.includes('-mode-')
  );
  assert.equal(modes.length, 4);
  for (const item of modes) {
    const actions = item.steps.filter(step => step.aiAct);
    assert.equal(actions.length, 1);
    assert.equal(actions[0].aiAct.prompt, redPanelClick);
    assert.deepEqual(actions[0].aiAct.options, {
      deepLocate: true,
      cacheable: false,
    });
    const pixels = item.steps.filter(step => step['web.pixels']);
    assert.equal(
      pixels.length,
      2,
      'Keep both original before/after pixel assertions',
    );
    assert.match(pixels[1]['web.pixels'].baseline, /-last-child\/index$/);
  }
});

test('six swiper/list source callbacks preserve all original waits, clicks, browser guards and Linux PNGs', async () => {
  const original = await originalSwiperPixels();
  const migrated = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/swiper-actions.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(original.length, 6);
  assert.deepEqual(migrated.cases, original);
  assert.ok(migrated.afterEach[0].recordToReport);
  for (const item of original) {
    const count = item.steps.filter(step => step.aiAct).length;
    assert.equal(count, item.name.endsWith('-current') ? 4 : 1);
    assert.ok(
      existsSync(
        new URL(
          '../../tests/reactlynx/' + item.name + '/index.jsx',
          import.meta.url,
        ),
      ),
    );
    for (const step of item.steps) {
      if (!step['web.pixels']) continue;
      assert.ok(
        existsSync(
          new URL(
            '../../tests/reactlynx.spec.ts-snapshots/'
              + step['web.pixels'].baseline + '-chromium-linux.png',
            import.meta.url,
          ),
        ),
      );
    }
  }
});
