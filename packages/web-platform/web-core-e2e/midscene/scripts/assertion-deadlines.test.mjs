import assert from 'node:assert/strict';
import test from 'node:test';
import { expectWebCount, expectWebValue } from '../expectation.ts';

function fakeClock(t) {
  const clock = { now: 0 };
  t.mock.method(Date, 'now', () => clock.now);
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    clock.now += delay;
    queueMicrotask(callback);
    return 0;
  });
  return clock;
}

test('count assertions reject values that appear after the original five-second default', async t => {
  const clock = fakeClock(t);
  await assert.rejects(
    expectWebCount(async () => clock.now >= 6000 ? 1 : 0, {
      matchingText: 'callback',
      count: 1,
    }),
    /expected count 1/,
  );
  assert.equal(clock.now, 5000);
});

test('CSS assertions use the original five-second default for attachment and polling', async t => {
  const clock = fakeClock(t);
  let attachmentTimeout;
  await assert.rejects(
    expectWebValue({
      async waitFor(options) {
        attachmentTimeout = options.timeout;
      },
      async evaluate() {
        return clock.now >= 6000 ? 'green' : 'pink';
      },
    }, { selector: '#result', css: 'background-color', equals: 'green' }),
    /timed out/,
  );
  assert.equal(attachmentTimeout, 5000);
  assert.equal(clock.now, 5000);
});

test('attachment time consumes the same assertion budget instead of starting a second window', async t => {
  const clock = fakeClock(t);
  const readTimeouts = [];
  await assert.rejects(
    expectWebValue({
      async waitFor() {
        clock.now = 4000;
      },
      async evaluate(_fn, _arg, options) {
        readTimeouts.push(options?.timeout);
        return clock.now >= 6000 ? 'green' : 'pink';
      },
    }, {
      selector: '#result',
      css: 'background-color',
      equals: 'green',
      timeoutMs: 5000,
    }),
    /timed out/,
  );
  assert.equal(clock.now, 5000);
  assert.equal(readTimeouts[0], 1000);
  assert.ok(readTimeouts.every(timeout => timeout > 0 && timeout <= 1000));
});

test('a matching count or CSS value returned after the deadline cannot pass', async t => {
  const clock = fakeClock(t);
  await assert.rejects(
    expectWebCount(async () => {
      clock.now = 6000;
      return 1;
    }, {
      matchingText: 'callback',
      count: 1,
    }),
    /expected count 1/,
  );
  clock.now = 0;
  await assert.rejects(
    expectWebValue({
      async waitFor() {},
      async evaluate() {
        clock.now = 6000;
        return 'green';
      },
    }, { selector: '#result', css: 'background-color', equals: 'green' }),
    /timed out/,
  );
});

test('explicit longer source budgets and immediate single reads retain their semantics', async t => {
  const clock = fakeClock(t);
  for (const options of [{ timeoutMs: 10000 }, { immediate: true }]) {
    clock.now = 0;
    let countReads = 0;
    await expectWebCount(async () => {
      countReads++;
      clock.now = 6000;
      return 1;
    }, {
      matchingText: 'callback',
      count: 1,
      ...options,
    });
    assert.equal(countReads, 1);
    clock.now = 0;
    let valueReads = 0;
    await expectWebValue({
      async waitFor() {},
      async evaluate() {
        valueReads++;
        clock.now = 6000;
        return 'green';
      },
    }, {
      selector: '#result',
      css: 'background-color',
      equals: 'green',
      ...options,
    });
    assert.equal(valueReads, 1);
  }
});

test('individual locator reads receive only the remaining source assertion budget', async t => {
  const clock = fakeClock(t);
  let readOptions;
  await expectWebValue({
    async waitFor() {
      clock.now = 4000;
    },
    async evaluate(_fn, _arg, options) {
      readOptions = options;
      return 'green';
    },
  }, {
    selector: '#result',
    css: 'background-color',
    equals: 'green',
    timeoutMs: 5000,
  });
  assert.deepEqual(readOptions, { timeout: 1000 });
});

test('immediate text and input value assertions read hidden targets once without waiting into a pass', async () => {
  for (const mode of ['text', 'textContains', 'value']) {
    let reads = 0;
    const read = async () => ++reads === 1 ? 'wrong' : 'expected';
    const locator = {
      async waitFor() {
        throw new Error('A raw read must not wait for visibility');
      },
      innerText: read,
      inputValue: read,
    };
    await assert.rejects(
      expectWebValue(locator, {
        selector: '.result',
        [mode]: 'expected',
        immediate: true,
      }),
      /timed out/,
    );
    assert.equal(reads, 1);
    reads = 0;
    const correct = async () => {
      reads++;
      return 'expected';
    };
    await expectWebValue({
      ...locator,
      innerText: correct,
      inputValue: correct,
    }, {
      selector: '.result',
      [mode]: 'expected',
      immediate: true,
    });
    assert.equal(reads, 1);
  }
});
