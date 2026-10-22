import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalGuardedStaticPixels } from './elements-guarded-pixels-source.mjs';
import { originalPixelOptions } from '../web-pixels.ts';

test('four guarded static pixel callbacks preserve complete originals and all browser skips; disabled originals stay excluded', async () => {
  const { cases, matrix } = await originalGuardedStaticPixels();
  const names = [
    'x-blur-view/basic',
    'scroll-view/scroll-view-item-percentage-size',
    'x-foldview-ng/size-controlled-by-parent-flex-cross-axis',
    'x-foldview-ng/size-parent-grow-children-specific',
  ];
  assert.deepEqual(
    cases.map(item => item.name),
    names.map(name => 'web-elements/' + name),
  );
  assert.deepEqual(matrix, [
    {
      name: 'web-elements/layout/percentage-cyclic-text',
      skipped: { chromium: true, firefox: true, webkit: true },
    },
    {
      name: 'web-elements/layout/percentage-cyclic-sibling-linear',
      skipped: { chromium: true, firefox: true, webkit: true },
    },
    ...names.map((name, index) => ({
      name: 'web-elements/' + name,
      skipped: { chromium: false, firefox: index === 1, webkit: index !== 1 },
    })),
  ]);
  const translated = YAML.parse(
    readFileSync(
      new URL(
        '../cases/web-pixels/elements-guarded-static.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  assert.deepEqual(translated.cases, cases);
  assert.equal(translated.afterEach.length, 1);
  for (const item of cases) {
    const pixels = item.steps.filter(step => step['web.pixels']);
    assert.equal(pixels.length, 1);
    const baseline = pixels[0]['web.pixels'].baseline;
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
  assert.equal(
    cases[1].steps.filter(step => step.javascript?.includes('setTimeout'))
      .length,
    1,
  );
  assert.ok(cases[1].steps.some(step => step.javascript?.includes(', 100)')));
});
