import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import YAML from 'yaml';
import { originalScopedPixels } from './elements-scoped-source.mjs';

test('nine web-elements API callbacks retain their actual public methods, fixture aliases and every PNG', async () => {
  const original = await originalScopedPixels('api');
  const migrated = YAML.parse(
    readFileSync(
      new URL('../cases/web-pixels/elements-api.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(original.length, 9);
  assert.deepEqual(migrated.cases, original);
  assert.ok(migrated.afterEach[0].recordToReport);
  for (const item of original) {
    const fixture = item.steps[0].gotoUrl.slice(
      '${elementsUrl}tests/fixtures/'.length,
    );
    assert.ok(
      existsSync(
        new URL(
          '../../../web-elements/tests/fixtures/' + fixture,
          import.meta.url,
        ),
      ),
    );
    for (const step of item.steps) {
      if (!step['web.pixels']) continue;
      assert.equal(step['web.pixels'].suite, 'web-elements');
      assert.ok(
        existsSync(
          new URL(
            '../../../web-elements/tests/web-elements.spec.ts-snapshots/'
              + step['web.pixels'].baseline + '-chromium-linux.png',
            import.meta.url,
          ),
        ),
      );
    }
  }
});

test('input/textarea API argument order and the original shared input fixture are unchanged', async () => {
  const cases = await originalScopedPixels('api');
  for (const suite of ['x-input', 'x-textarea']) {
    for (
      const [method, expected] of [
        ['method-addText', [['addText', { text: 'add-text' }]]],
        ['method-setValue', [['setValue', { value: 'add-text', index: 3 }], [
          'addText',
          { text: '3' },
        ]]],
        ['method-sendDelEvent', [['sendDelEvent', { action: 1 }], [
          'sendDelEvent',
          { action: 0, length: 2 },
        ]]],
        ['attribute-maxlength-change-do-not-change-value', [[
          'setAttribute',
          'maxlength',
          '5',
        ], ['setAttribute', 'value', '12345678']]],
      ]
    ) {
      const item = cases.find(c =>
        c.name === `web-elements/${suite}/${method}`
      );
      if (method.startsWith('method-')) {
        assert.ok(item.steps[0].gotoUrl.endsWith('x-input/method.html'));
      }
      const events = [];
      const target = Object.fromEntries(
        ['addText', 'setValue', 'sendDelEvent', 'setAttribute'].map(
          key => [key, (...args) => events.push([key, ...args])],
        ),
      );
      for (const step of item.steps) {
        if (!step.javascript?.includes('document.querySelector')) continue;
        await runInNewContext(step.javascript, {
          document: {
            querySelector: selector => {
              assert.equal(selector, '#target');
              return target;
            },
          },
        });
      }
      assert.deepEqual(JSON.parse(JSON.stringify(events)), expected);
    }
  }
});
