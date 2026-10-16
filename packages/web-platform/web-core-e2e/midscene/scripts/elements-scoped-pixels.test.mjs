import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalScopedPixels } from './elements-scoped-source.mjs';
import { originalPixelOptions } from '../web-pixels.ts';

test('54 scoped web-elements callbacks replay unchanged title resolution, PNG aliases and every original statement', async () => {
  const original = await originalScopedPixels();
  const migrated = YAML.parse(readFileSync(
    new URL(
      '../cases/web-pixels/elements-scoped-static.yaml',
      import.meta.url,
    ),
    'utf8',
  ));
  assert.equal(original.length, 54);
  assert.deepEqual(migrated.cases, original);
  assert.equal(migrated.afterEach.length, 1);
  assert.ok(migrated.afterEach[0].recordToReport);
  for (const item of original) {
    const fixture = item.name.slice('web-elements/'.length);
    assert.ok(
      existsSync(
        new URL(
          '../../../web-elements/tests/fixtures/' + fixture + '.html',
          import.meta.url,
        ),
      ),
    );
    for (const step of item.steps) {
      if (!step['web.pixels']) continue;
      const baseline = step['web.pixels'].baseline;
      assert.equal(
        originalPixelOptions(baseline, 'web-elements').maxDiffPixelRatio,
        0,
      );
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
  }
});

test('placeholder aliases and simpleTitle snapshots do not silently change to fixture names', async () => {
  const cases = await originalScopedPixels();
  for (const suite of ['filter-image', 'x-image']) {
    for (
      const mode of [
        'basic',
        'mode-aspectfit',
        'mode-aspectfill',
        'mode-center',
      ]
    ) {
      const item = cases.find(x =>
        x.name === `web-elements/${suite}/${mode}-placeholder`
      );
      assert.ok(item.steps[0].gotoUrl.endsWith(`${mode}-placeholder.html`));
      assert.equal(
        item.steps.at(-1)['web.pixels'].baseline,
        `${suite}/${mode}/index`,
      );
    }
  }
  for (const suite of ['x-input', 'x-textarea']) {
    const item = cases.find(x =>
      x.name === `web-elements/${suite}/attribute-value`
    );
    assert.equal(
      item.steps.at(-1)['web.pixels'].baseline,
      `${suite}/attribute-value/attribute-value`,
    );
  }
});
