import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import YAML from 'yaml';
import { originalScrollEnd } from './elements-scrollend-source.mjs';

function fixture(events) {
  const delays = [];
  const offsets = [];
  const listeners = [];
  const target = {
    addEventListener(type, listener) {
      assert.equal(type, 'lynxscrollend');
      listeners.push(listener);
    },
    set scrollTop(value) {
      offsets.push(value);
      for (const event of events) {
        for (const listener of listeners) listener(event);
      }
    },
  };
  return {
    delays,
    offsets,
    context: {
      document: {
        querySelectorAll: () => [target],
        querySelector: () => target,
      },
      setTimeout: (callback, ms) => {
        delays.push(ms);
        callback();
      },
    },
  };
}

test('scrollend migration executes the whole original callback and keeps one immediate event read after 300 ms', async () => {
  const original = originalScrollEnd();
  const translated = YAML.parse(
    readFileSync(
      new URL('../cases/web-elements/scrollend.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(translated.cases, [original]);
  assert.equal(translated.afterEach.length, 1);
  const detail = {
    scrollTop: 200,
    scrollLeft: 0,
    scrollHeight: 500,
    scrollWidth: 300,
    isDragging: false,
  };
  const f = fixture([{ detail }]);
  assert.equal(
    await vm.runInNewContext(original.steps[2].javascript, f.context),
    true,
  );
  assert.deepEqual(f.offsets, [200]);
  assert.deepEqual(f.delays, [300]);
  assert.equal(
    (original.steps[2].javascript.match(/await events\.jsonValue\(\)/g) || [])
      .length,
    1,
  );
});

test('extra or missing scrollend events and every missing original detail field fail without polling', async () => {
  const detail = {
    scrollTop: 200,
    scrollLeft: 0,
    scrollHeight: 500,
    scrollWidth: 300,
    isDragging: false,
  };
  const javascript = originalScrollEnd().steps[2].javascript;
  for (
    const events of [
      [],
      [{ detail }, { detail }],
      [{}],
      ...Object.keys(detail).map(key => {
        const partial = { ...detail };
        delete partial[key];
        return [{ detail: partial }];
      }),
    ]
  ) {
    const f = fixture(events);
    await assert.rejects(vm.runInNewContext(javascript, f.context), /should/);
    assert.deepEqual(f.offsets, [200]);
    assert.deepEqual(f.delays, [300]);
  }
  const f = fixture([{ detail }]);
  f.context.document.querySelectorAll = () => [{}, {}];
  await assert.rejects(vm.runInNewContext(javascript, f.context), /strictness/);
  assert.deepEqual(f.offsets, []);
  const missing = fixture([]);
  missing.context.document.querySelectorAll = () => [];
  let now = 0;
  missing.context.Date = { now: () => now };
  missing.context.requestAnimationFrame = callback => {
    now += 1000;
    callback();
  };
  await assert.rejects(
    vm.runInNewContext(javascript, missing.context),
    /attachment timed out/,
  );
  assert.deepEqual(missing.offsets, []);
  assert.deepEqual(missing.delays, []);
});
