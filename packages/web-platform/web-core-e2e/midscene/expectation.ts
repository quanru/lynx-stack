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
  property?: 'tagName' | 'scrollTop';
  shadowCssHostRule?: true;
  bounds?: 'width' | 'height';
  equals?: string | number;
  greaterThan?: number;
  immediate?: boolean;
  contains?: string;
  not?: boolean;
  timeoutMs?: number;
}

// Same value source as upstream getInShadowCSS: include both inline styles and
// fetched shadow-root stylesheets, not computed style or document-level CSS.
export async function readShadowCSS(element: Element) {
  const shadowRoot = element.shadowRoot!;
  const inlineCSS = Array.from(
    shadowRoot.querySelectorAll('style'),
    style => style.textContent ?? '',
  );
  const linkedCSS = await Promise.all(
    Array.from(
      shadowRoot.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      link => fetch(link.href).then(response => response.text()),
    ),
  );
  return inlineCSS.concat(linkedCSS).join('\n');
}

// Match the original assertion's value source and comparison, without trimming
// event payloads or substituting a visual approximation.
export async function expectWebValue(locator: Locator, input: ExpectInput) {
  if (input.shadowCssHostRule !== undefined) {
    if (
      input.shadowCssHostRule !== true || typeof input.selector !== 'string'
      || !input.selector
      || (input.index !== undefined
        && (!Number.isInteger(input.index) || input.index < 0))
      || Object.keys(input).some(key =>
        !['selector', 'index', 'shadowCssHostRule'].includes(key)
      )
    ) {
      throw new Error(
        'web.expect shadowCssHostRule requires a selector and optional index only.',
      );
    }
    // Original expect(rawString).toMatch is one read, not eventual polling.
    const actual = await locator.evaluate(readShadowCSS);
    if (!/:host\s*,\s*lynx-view\s*\{/.test(actual)) {
      throw new Error(
        'web.expect shadow CSS does not contain the original host rule.',
      );
    }
    return;
  }
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
    property,
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
    property !== undefined,
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
      && (typeof input.immediate !== 'boolean'
        || (bounds === undefined && attribute === undefined
          && property !== 'scrollTop')))
    || (greaterThan !== undefined && bounds === undefined
      && property !== 'scrollTop')
    || (attribute !== undefined
      ? typeof attribute !== 'string' || !attribute
        || Number(equals !== undefined) + Number(contains !== undefined) !== 1
      : css !== undefined
      ? typeof css !== 'string' || !css || typeof equals !== 'string'
        || contains !== undefined
      : property !== undefined
      ? property === 'scrollTop'
        ? input.immediate !== true
          || Number(equals !== undefined) + Number(greaterThan !== undefined)
            !== 1
          || !Number.isFinite(equals ?? greaterThan) || contains !== undefined
        : property !== 'tagName' || typeof equals !== 'string'
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
  if (
    bounds === undefined && property !== 'scrollTop'
    && typeof expected !== 'string'
  ) {
    throw new Error('web.expect requires a string expected value.');
  }
  if (!input.immediate) {
    await locator.waitFor({
      state:
        css !== undefined || attribute !== undefined || property !== undefined
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
        : property !== undefined
        ? property === 'scrollTop'
          ? locator.evaluate(element => element.scrollTop)
          : locator.evaluate(element => element.tagName)
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
          css ?? property ?? bounds ?? attribute
            ?? (value !== undefined ? 'value' : 'text')
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
