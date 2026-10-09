import assert from 'node:assert/strict';
import test from 'node:test';
import { expectWebValue } from '../expectation.ts';

function locatorFor(values) {
  const calls = [];
  const read = (method, name) => {
    calls.push([method, name]);
    return Promise.resolve(values.length > 1 ? values.shift() : values[0]);
  };
  return {
    calls,
    waitFor: async () => {},
    innerText: () => read('text'),
    inputValue: () => read('value'),
    getAttribute: (name) => read('attribute', name),
  };
}

test('exact text and input values do not trim, coerce, or accept substrings', async () => {
  for (const mode of ['text', 'value']) {
    const locator = locatorFor(['foobar-6-6']);
    await expectWebValue(locator, {
      selector: '.result',
      [mode]: 'foobar-6-6',
    });
    assert.equal(locator.calls[0][0], mode);
    for (const actual of [' foobar-6-6 ', 'foobar-6-60', null]) {
      await assert.rejects(
        expectWebValue(locatorFor([actual]), {
          selector: '.result',
          [mode]: 'foobar-6-6',
          timeoutMs: 1,
        }),
        /timed out/,
      );
    }
  }
});

test('attributes preserve exact equality versus substring matching', async () => {
  const locator = locatorFor(['none', 'Enter']);
  await expectWebValue(locator, {
    selector: '#observer',
    attribute: 'data-key',
    equals: 'Enter',
    timeoutMs: 20,
  });
  assert.deepEqual(locator.calls[0], ['attribute', 'data-key']);
  await expectWebValue(locatorFor(['background:green;']), {
    selector: '#target',
    attribute: 'style',
    contains: 'green',
  });
  for (const actual of [null, 'true-ish']) {
    await assert.rejects(
      expectWebValue(locatorFor([actual]), {
        selector: '#target',
        attribute: 'data-mts-clicked',
        equals: 'true',
        timeoutMs: 1,
      }),
      /timed out/,
    );
  }
  await assert.rejects(
    expectWebValue(locatorFor([null]), {
      selector: '#target',
      attribute: 'style',
      contains: '',
      timeoutMs: 1,
    }),
    /timed out/,
  );
});

test('malformed assertions fail closed', async () => {
  for (
    const input of [
      {},
      { text: 'x', value: 'x' },
      { attribute: 'style' },
      { attribute: 'style', equals: 'x', contains: 'x' },
      { text: 'x', contains: 'x' },
      { text: 'x', timeoutMs: 0 },
      { value: 1 },
      { attribute: '', equals: 'x' },
    ]
  ) {
    const locator = locatorFor(['x']);
    await assert.rejects(
      expectWebValue(locator, { selector: '#target', ...input }),
      /web.expect requires/,
    );
    assert.equal(locator.calls.length, 0);
  }
});
