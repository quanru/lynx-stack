import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import YAML from 'yaml';
import { originalLayoutEvents } from './elements-layout-events-source.mjs';

test('four complete original layout callbacks preserve exact assertion tails and only replace visible clicks', () => {
  const cases = originalLayoutEvents();
  const document = YAML.parse(
    readFileSync(
      new URL('../cases/web-elements/layout-events.yaml', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(document.cases, cases);
  assert.ok(document.afterEach[0].recordToReport);
  assert.deepEqual(cases.map(item => item.name), [
    'web-elements/x-view/event-layoutchange',
    'web-elements/x-text/event-layoutchange',
    'web-elements/scroll-view/scrollable-even-inline-overflow-visible',
    'web-elements/x-foldview-ng/basic-toolbar-in-lynx-wrapper',
  ]);
  assert.equal(
    cases.flatMap(item => item.steps.filter(step => step.aiAct)).length,
    2,
  );
  for (const item of cases.slice(0, 2)) {
    const javascript = item.steps.at(-1).javascript;
    assert.match(javascript, /await wait\(100\)/);
    assert.equal(
      (javascript.match(/expect\(typeof detail\./g) ?? []).length,
      6,
    );
    assert.match(javascript, /expect\(detail.id\).toBe\('target'\)/);
    assert.doesNotMatch(javascript, /\.click\(|\.dispatchEvent\(/);
  }
});

function execute(item, detail, options = {}) {
  const waits = [], reads = { payload: 0, locator: 0 };
  let now = 0;
  const context = {
    structuredClone,
    get globalThis() {
      reads.payload++;
      return { detail };
    },
    document: {
      querySelectorAll: () => {
        reads.locator++;
        return options.targets ?? [{ style: { top: '200px' } }];
      },
    },
    getComputedStyle: () => ({ overflowY: options.overflowY ?? 'scroll' }),
    setTimeout: (fn, ms) => {
      waits.push(ms);
      now += ms;
      fn();
    },
    requestAnimationFrame: fn => {
      now += 1000;
      fn();
    },
    Date: { now: () => now },
  };
  return {
    run: vm.runInNewContext(item.steps.at(-1).javascript, context),
    waits,
    reads,
  };
}

test('layout event assertions use one payload and reject every missing field, wrong type and wrong ID', async () => {
  const fields = ['width', 'height', 'left', 'right', 'top', 'bottom'];
  const detail = Object.fromEntries(fields.map(field => [field, 0]));
  detail.id = 'target';
  for (const item of originalLayoutEvents().slice(0, 2)) {
    const good = execute(item, detail);
    await good.run;
    assert.equal(good.reads.payload, 1);
    assert.deepEqual(good.waits, [100]);
    for (const field of [...fields, 'id']) {
      const missing = { ...detail };
      delete missing[field];
      await assert.rejects(execute(item, missing).run);
      await assert.rejects(execute(item, { ...detail, [field]: 'wrong' }).run);
    }
    await assert.rejects(execute(item, undefined).run, /payload is absent/);
  }
});

test('overflow is one exact computed-style read and rejects hidden polling, ambiguity and missing elements', async () => {
  const item = originalLayoutEvents()[2];
  const good = execute(item);
  await good.run;
  assert.equal(good.reads.locator, 1);
  assert.deepEqual(good.waits, []);
  await assert.rejects(execute(item, undefined, { overflowY: 'visible' }).run);
  await assert.rejects(
    execute(item, undefined, { targets: [{}, {}] }).run,
    /strictness/,
  );
  await assert.rejects(
    execute(item, undefined, { targets: [] }).run,
    /attachment timed out/,
  );
});

test('toolbar keeps the original inline-style source, 500ms wait and default expect.poll budget', async () => {
  const item = originalLayoutEvents()[3];
  const good = execute(item);
  await good.run;
  assert.deepEqual(good.waits, [500]);
  const wrong = execute(item, undefined, {
    targets: [{ style: { top: '201px' } }],
  });
  await assert.rejects(wrong.run, /polling assertion failed/);
  assert.deepEqual(wrong.waits, [500, 100, 250, 500, 1000, 1000, 1000, 1000]);
});
