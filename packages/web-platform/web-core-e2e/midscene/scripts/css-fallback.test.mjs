import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalCSSFallback } from './css-fallback-source.mjs';

for (const ssr of [false, true]) {
  test(`CSS fallback ${ssr ? 'SSR' : 'client'} preserves entire original helpers, callbacks, waits and assertion timeouts`, async () => {
    const source = await originalCSSFallback(ssr);
    const migrated = YAML.parse(
      readFileSync(
        new URL(
          `../cases/web/css-fallback${ssr ? '-ssr' : ''}.yaml`,
          import.meta.url,
        ),
        'utf8',
      ),
    );
    assert.deepEqual(migrated.cases, source);
    assert.ok(migrated.afterEach[0].recordToReport);
    for (const item of source) {
      assert.equal(item.steps[0].gotoUrl.includes('ssr?'), ssr);
      const waits = item.steps.filter(step =>
        step.javascript?.startsWith('new Promise')
      );
      assert.equal(waits.length, ssr ? 2 : 1);
      assert.ok(waits.at(-1).javascript.includes('100'));
      if (ssr) assert.ok(waits[0].javascript.includes('300'));
      assert.equal(item.steps.at(-1)['web.expect'].timeoutMs, 5000);
    }
  });
}
