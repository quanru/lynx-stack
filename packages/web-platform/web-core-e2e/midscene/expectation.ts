import type { Locator } from 'playwright';

export interface ExpectInput {
  selector: string;
  text?: string;
  value?: string;
  attribute?: string;
  equals?: string;
  contains?: string;
  timeoutMs?: number;
}

// Match the original assertion's value source and comparison, without trimming
// event payloads or substituting a visual approximation.
export async function expectWebValue(locator: Locator, input: ExpectInput) {
  const {
    selector,
    text,
    value,
    attribute,
    equals,
    contains,
    timeoutMs = 15_000,
  } = input;
  const modes = [
    text !== undefined,
    value !== undefined,
    attribute !== undefined,
  ];
  if (
    modes.filter(Boolean).length !== 1
    || (attribute !== undefined
      ? typeof attribute !== 'string' || !attribute
        || Number(equals !== undefined) + Number(contains !== undefined) !== 1
      : equals !== undefined || contains !== undefined)
    || !Number.isFinite(timeoutMs) || timeoutMs <= 0
  ) {
    throw new Error(
      'web.expect requires one text, value, or attribute assertion and a positive timeout.',
    );
  }
  const expected = text ?? value ?? equals ?? contains;
  if (typeof expected !== 'string') {
    throw new Error('web.expect requires a string expected value.');
  }
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const actual = await (
      attribute !== undefined
        ? locator.getAttribute(attribute)
        : value !== undefined
        ? locator.inputValue()
        : locator.innerText()
    );
    const matches = text !== undefined
      ? actual === text
      : contains !== undefined
      ? actual !== null && actual.includes(contains)
      : actual === expected;
    if (matches) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `web.expect ${selector} ${
          attribute ?? (value !== undefined ? 'value' : 'text')
        } timed out; expected ${contains !== undefined ? 'to contain ' : ''}${
          JSON.stringify(expected)
        }, got ${JSON.stringify(actual)}`,
      );
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(200, timeoutMs))
    );
  }
}
