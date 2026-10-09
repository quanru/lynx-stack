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
    evaluate: (_fn, name) => read('css', name),
    boundingBox: () => read('bounds'),
  };
}

test('text count preserves zero and duplicate matches without visibility or nth selection', async () => {
  for (const count of [0, 1, 2]) {
    await expectWebValue({ count: async () => count }, {
      matchingText: 'hello-from-external',
      count,
    });
  }
  for (const count of [0, 2]) {
    await assert.rejects(
      expectWebValue({ count: async () => count }, {
        matchingText: 'hello-from-external',
        count: 1,
        timeoutMs: 1,
      }),
      /expected count 1/,
    );
  }
  for (
    const input of [
      { matchingText: 'x' },
      { count: 1 },
      { matchingText: 'x', count: -1 },
      { matchingText: 'x', count: 0.5 },
      { matchingText: 'x', count: 1, selector: '#target' },
      { matchingText: 'x', count: 1, text: 'x' },
      { matchingText: 'x', count: 1, timeoutMs: 0 },
    ]
  ) {
    await assert.rejects(
      expectWebValue({
        count: async () => {
          throw new Error('must not read');
        },
      }, input),
      /web.expect requires/,
    );
  }
});

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

test('immediate attributes retain a single raw read without waiting into a pass', async () => {
  const input = {
    selector: '#target',
    attribute: 'style',
    contains: 'green',
    immediate: true,
  };
  await expectWebValue(locatorFor(['background:green;']), input);
  for (const value of [null, '', 'background:pink;']) {
    const locator = locatorFor([value, 'background:green;']);
    locator.waitFor = async () => {
      throw new Error('must not add a wait');
    };
    await assert.rejects(expectWebValue(locator, input), /timed out/);
    assert.deepEqual(locator.calls, [['attribute', 'style']]);
  }
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
      { css: 'width', equals: 100 },
      { css: '', equals: '100px' },
      { css: 'width', equals: '100px', contains: '100' },
      { bounds: 'width', equals: '100' },
      { bounds: 'left', equals: 100 },
      { bounds: 'width', equals: NaN },
      { bounds: 'width', greaterThan: '0' },
      { bounds: 'width', greaterThan: 0, equals: 100 },
      { css: 'width', equals: '100px', greaterThan: 0 },
      { text: 'x', immediate: true },
      { text: 'x', not: true },
      { text: 'x', index: -1 },
      { text: 'x', index: 0.5 },
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

test('original negative attributes accept absence but reject the forbidden exact value', async () => {
  for (const value of [null, '', '100px']) {
    await expectWebValue(locatorFor([value]), {
      selector: '#target',
      attribute: 'height',
      equals: 'auto',
      not: true,
    });
  }
  await assert.rejects(
    expectWebValue(locatorFor(['auto']), {
      selector: '#target',
      attribute: 'height',
      equals: 'auto',
      not: true,
      timeoutMs: 1,
    }),
    /timed out/,
  );
});

test('immediate numeric bounds do not round, coerce, wait, or retry into a pass', async () => {
  const input = {
    selector: '#target',
    bounds: 'height',
    greaterThan: 0,
    immediate: true,
  };
  await expectWebValue(locatorFor([{ height: 0.1 }]), input);
  for (const box of [null, { height: 0 }, { height: -1 }, { height: '1' }]) {
    const locator = locatorFor([box, { height: 1 }]);
    locator.waitFor = async () => {
      throw new Error('must not add a visibility wait');
    };
    await assert.rejects(expectWebValue(locator, input), /timed out/);
    assert.equal(locator.calls.length, 1);
  }
});

test('computed CSS preserves exact strings and explicit negation', async () => {
  const locator = locatorFor(['rgb(0, 128, 0)']);
  await expectWebValue(locator, {
    selector: '#target',
    css: 'background-color',
    equals: 'rgb(0, 128, 0)',
  });
  assert.deepEqual(locator.calls[0], ['css', 'background-color']);
  await expectWebValue(locatorFor(['rgba(0, 0, 0, 0)']), {
    selector: '.container',
    css: 'background-color',
    equals: 'rgb(255, 165, 0)',
    not: true,
  });
  for (const actual of ['green', ' rgb(0, 128, 0) ']) {
    await assert.rejects(
      expectWebValue(locatorFor([actual]), {
        selector: '#target',
        css: 'background-color',
        equals: 'rgb(0, 128, 0)',
        timeoutMs: 1,
      }),
      /timed out/,
    );
  }
  await assert.rejects(
    expectWebValue(locatorFor(['rgb(255, 165, 0)']), {
      selector: '.container',
      css: 'background-color',
      equals: 'rgb(255, 165, 0)',
      not: true,
      timeoutMs: 1,
    }),
    /timed out/,
  );
});

test('bounds retain numeric equality without rounding or CSS substitution', async () => {
  await expectWebValue(locatorFor([{ width: 100, height: 360 }]), {
    selector: '#container',
    bounds: 'height',
    equals: 360,
  });
  for (const box of [null, { width: 99.9 }, { width: '100' }]) {
    await assert.rejects(
      expectWebValue(locatorFor([box]), {
        selector: '#target',
        bounds: 'width',
        equals: 100,
        timeoutMs: 1,
      }),
      /timed out/,
    );
  }
});

test('textContains is explicit and does not alter exact text assertions', async () => {
  await expectWebValue(
    locatorFor(['https://example.test/dist/api-frame-inner.web.bundle']),
    { selector: '#url', textContains: '/dist/api-frame-inner.web.bundle' },
  );
  await assert.rejects(
    expectWebValue(locatorFor(['wrong']), {
      selector: '#url',
      textContains: '/dist/api-frame-inner.web.bundle',
      timeoutMs: 1,
    }),
    /timed out/,
  );
});
