import type { Locator } from 'playwright';

export interface ExpectInput {
  selector?: string;
  matchingText?: string;
  count?: number;
  index?: number;
  text?: string;
  textContains?: string;
  value?: string;
  attribute?: string;
  css?: string;
  bounds?: 'width' | 'height';
  equals?: string | number;
  greaterThan?: number;
  immediate?: boolean;
  contains?: string;
  not?: boolean;
  timeoutMs?: number;
}

// Match the original assertion's value source and comparison, without trimming
// event payloads or substituting a visual approximation.
export async function expectWebValue(locator: Locator, input: ExpectInput) {
  if (input.matchingText !== undefined || input.count !== undefined) {
    const { matchingText, count, timeoutMs = 15_000 } = input;
    if (
      typeof matchingText !== 'string' || !Number.isInteger(count) || count! < 0
      || !Number.isFinite(timeoutMs) || timeoutMs <= 0
      || Object.keys(input).some(key =>
        !['matchingText', 'count', 'timeoutMs'].includes(key)
      )
    ) {
      throw new Error(
        'web.expect requires matchingText and a nonnegative integer count only.',
      );
    }
    // Match upstream page.getByText(text).toHaveCount(n), including hidden
    // matches and duplicate elements. No nth(), visibility gate or innerText.
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const actual = await locator.count();
      if (actual === count) return;
      if (Date.now() >= deadline) {
        throw new Error(
          `web.expect text ${
            JSON.stringify(matchingText)
          } expected count ${count}, got ${actual}`,
        );
      }
      await new Promise(resolve =>
        setTimeout(resolve, Math.min(200, timeoutMs))
      );
    }
  }
  const {
    selector,
    text,
    textContains,
    value,
    attribute,
    css,
    bounds,
    equals,
    greaterThan,
    contains,
    timeoutMs = 15_000,
  } = input;
  const modes = [
    text !== undefined,
    textContains !== undefined,
    value !== undefined,
    attribute !== undefined,
    css !== undefined,
    bounds !== undefined,
  ];
  if (
    modes.filter(Boolean).length !== 1
    || !selector
    || (input.index !== undefined
      && (!Number.isInteger(input.index) || input.index < 0))
    || (input.not !== undefined
      && (typeof input.not !== 'boolean'
        || (css === undefined && attribute === undefined)))
    || (input.immediate !== undefined
      && (typeof input.immediate !== 'boolean' || bounds === undefined))
    || (greaterThan !== undefined && bounds === undefined)
    || (attribute !== undefined
      ? typeof attribute !== 'string' || !attribute
        || Number(equals !== undefined) + Number(contains !== undefined) !== 1
      : css !== undefined
      ? typeof css !== 'string' || !css || typeof equals !== 'string'
        || contains !== undefined
      : bounds !== undefined
      ? !['width', 'height'].includes(bounds)
        || Number(equals !== undefined) + Number(greaterThan !== undefined)
          !== 1
        || !Number.isFinite(equals ?? greaterThan) || contains !== undefined
      : equals !== undefined || contains !== undefined)
    || !Number.isFinite(timeoutMs) || timeoutMs <= 0
  ) {
    throw new Error(
      'web.expect requires one valid text, value, attribute, CSS, or bounds assertion and a positive timeout.',
    );
  }
  const expected = text ?? textContains ?? value ?? equals ?? contains;
  if (bounds === undefined && typeof expected !== 'string') {
    throw new Error('web.expect requires a string expected value.');
  }
  if (!input.immediate) {
    await locator.waitFor({
      state: css !== undefined || attribute !== undefined
        ? 'attached'
        : 'visible',
      timeout: timeoutMs,
    });
  }
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const actual = await (
      css !== undefined
        ? locator.evaluate(
          (element, property) =>
            getComputedStyle(element).getPropertyValue(property),
          css,
        )
        : bounds !== undefined
        ? locator.boundingBox().then((box) => box?.[bounds] ?? null)
        : attribute !== undefined
        ? locator.getAttribute(attribute)
        : value !== undefined
        ? locator.inputValue()
        : locator.innerText()
    );
    const substring = textContains ?? contains;
    const matches = greaterThan !== undefined
      ? typeof actual === 'number' && actual > greaterThan
      : text !== undefined
      ? actual === text
      : substring !== undefined
      ? typeof actual === 'string' && actual.includes(substring)
      : actual === expected;
    // Playwright's not.toHaveAttribute passes for an absent attribute on an
    // existing element. Missing CSS/bounding data must still fail closed.
    if (
      input.not
        ? (attribute !== undefined || actual !== null) && !matches
        : matches
    ) return;
    if (input.immediate || Date.now() >= deadline) {
      throw new Error(
        `web.expect ${selector} ${
          css ?? bounds ?? attribute ?? (value !== undefined ? 'value' : 'text')
        } timed out; expected ${input.not ? 'not ' : ''}${
          substring !== undefined ? 'to contain ' : ''
        }${
          greaterThan !== undefined
            ? 'greater than ' + greaterThan
            : JSON.stringify(expected)
        }, got ${JSON.stringify(actual)}`,
      );
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(200, timeoutMs))
    );
  }
}
