import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalSSRNoJS } from './ssr-source.mjs';

test('four SSR no-JavaScript cases preserve complete original loops, attributes, CSS and load navigation without client waits/actions', async () => {
  const original = await originalSSRNoJS();
  const migrated = YAML.parse(
    readFileSync(
      new URL('../cases/web-ssr-no-js/contracts.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(original.length, 4);
  assert.deepEqual(migrated.cases, original);
  assert.ok(migrated.afterEach[0].recordToReport);
  for (const item of original) {
    assert.ok(item.name.startsWith('ssr-no-js/'));
    assert.ok(
      item.steps.every(step =>
        Object.keys(step)[0] === 'gotoUrl'
        || Object.keys(step)[0] === 'web.expect'
      ),
    );
  }
});
