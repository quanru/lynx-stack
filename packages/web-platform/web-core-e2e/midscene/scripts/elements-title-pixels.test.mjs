import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalTitlePixels } from './elements-title-pixels-source.mjs';
import { originalPixelOptions } from '../web-pixels.ts';

test('17 nested-title pixel callbacks preserve complete originals and exact unflattened Linux PNG paths', async () => {
  const original = await originalTitlePixels();
  const translated = YAML.parse(
    readFileSync(
      new URL(
        '../cases/web-pixels/elements-title-static.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  assert.equal(original.length, 17);
  assert.deepEqual(translated.cases, original);
  assert.equal(translated.afterEach.length, 1);
  assert.ok(translated.afterEach[0].recordToReport);
  for (const item of original) {
    const title = item.name.slice('web-elements/'.length);
    assert.ok(
      existsSync(
        new URL(
          '../../../web-elements/tests/fixtures/' + title + '.html',
          import.meta.url,
        ),
      ),
    );
    const baseline = item.steps.at(-1)['web.pixels'].baseline;
    assert.equal(baseline, title + '/' + title);
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
    assert.ok(
      item.steps.every(step =>
        !step.aiAct && !step.aiAssert && !step.aiWaitFor
      ),
    );
  }
});
