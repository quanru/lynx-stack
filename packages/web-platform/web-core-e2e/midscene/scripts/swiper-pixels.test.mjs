import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalSwiperPixels } from './swiper-source.mjs';

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
