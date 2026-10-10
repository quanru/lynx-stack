import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';
import { originalCSSInheritance } from './css-inheritance-source.mjs';
import { expectWebValue } from '../expectation.ts';

test('all three templated CSS inheritance cases preserve complete original callback branches and one ordinary Update click', async () => {
  const original = await originalCSSInheritance();
  const migrated = YAML.parse(
    readFileSync(
      new URL('../cases/web/css-inheritance.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(migrated.cases, original);
  assert.equal(original.length, 3);
  for (const item of original) {
    assert.equal(item.steps.filter(step => step.aiAct).length, 1);
    assert.ok(item.steps.filter(step => step['web.expect']).length >= 15);
    assert.ok(
      item.steps.filter(step => step['web.expect']).every(step =>
        step['web.expect'].timeoutMs === 5000
      ),
    );
  }
});

test('attribute equals null requires actual absence, not a false/empty/undefined value', async () => {
  const input = {
    selector: '[part="page"]',
    attribute: 'lynx-enable-css-inheritance',
    equals: null,
    timeoutMs: 1,
  };
  for (const value of ['', 'false', 'true', undefined]) {
    await assert.rejects(
      expectWebValue({
        waitFor: async () => {},
        getAttribute: async () => value,
      }, input),
      /expected/,
    );
  }
  await expectWebValue({
    waitFor: async () => {},
    getAttribute: async () => null,
  }, input);
});

test('missing elements cannot pass an absent-attribute assertion and CSS does not accept null', async () => {
  await assert.rejects(
    expectWebValue({
      waitFor: async () => {
        throw new Error('missing element');
      },
    }, {
      selector: '#missing',
      attribute: 'x',
      equals: null,
      timeoutMs: 1,
    }),
    /missing element/,
  );
  await assert.rejects(
    expectWebValue({}, { selector: '#target', css: 'color', equals: null }),
    /requires/,
  );
});
