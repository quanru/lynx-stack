import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const cases = readFileSync(
  new URL('../cases/web/elements.yaml', import.meta.url),
  'utf8',
);
const config = readFileSync(
  new URL('../midscene.config.ts', import.meta.url),
  'utf8',
);
const expectation = readFileSync(
  new URL('../expectation.ts', import.meta.url),
  'utf8',
);

test('input editing uses aiAct without a custom selector-based action node', () => {
  assert.doesNotMatch(
    config + cases,
    /web\.fill|webFillNode|interface FillInput/,
  );
  assert.match(cases, /- aiAct:.*press Enter.*"foobar".*caret at the end/);
  assert.doesNotMatch(cases, /selector: "input", value:/);
  assert.match(cases, /selector: "\.result", text: "foobar-6-6"/);
  assert.match(expectation, /locator\.innerText\(\)/);
  assert.match(expectation, /actual === text/);
  assert.doesNotMatch(expectation, /\.trim\(\)/);
});

test('image readiness uses standard nodes and the original pixel test remains', () => {
  assert.doesNotMatch(
    config + cases,
    /web\.expectResponse|imageLoaded|getResponses/,
  );
  assert.match(cases, /- aiWaitFor: The square logo image/);
  assert.match(cases, /- aiAssert: A black square image/);
  const upstream = readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  );
  assert.match(
    upstream,
    /test\('basic-element-image-src',[\s\S]*?await diffScreenShot\(page, 'image', title\)/,
  );
  assert.match(
    upstream,
    /test\('basic-element-input-bindinput',[\s\S]*?expect\(result\)\.toBe\('foobar-6-6'\)/,
  );
});

test('Web readiness uses conditions instead of fixed sleeps', () => {
  const shell = readFileSync(
    new URL('../cases/web/shell.yaml', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(cases + shell, /- wait:/);
  assert.match(shell, /aiWaitFor: The square at the top-left is green/);
});

test('gradient assertion does not invent bold weight absent from the fixture', () => {
  assert.match(cases, /very large letters/);
  assert.doesNotMatch(cases, /bold letters/);
});

test('ten interaction migrations retain the original assertion targets and values', () => {
  const events = readFileSync(
    new URL('../cases/web/events.yaml', import.meta.url),
    'utf8',
  );
  const sections = events.split(/^  - name: /m).slice(1);
  const expected = {
    'basic-global-bind': [['#observer', 'style', 'contains', 'green'], [
      '#observer',
      'style',
      'contains',
      'pink',
    ]],
    'basic-global-bindkeydown': [['#observer', 'style', 'contains', 'green']],
    'basic-global-bindkeydown-key': [[
      '#observer',
      'data-key',
      'equals',
      'Enter',
    ]],
    'basic-global-bindkeydown-code': [[
      '#observer',
      'data-code',
      'equals',
      'KeyA',
    ]],
    'basic-bindtap-detail': [['#target', 'style', 'contains', 'green'], [
      '#target',
      'style',
      'contains',
      'pink',
    ]],
    'basic-event-target-id': [['#target', 'style', 'contains', 'green'], [
      '#target',
      'style',
      'contains',
      'pink',
    ]],
    'basic-bindtap-simultaneous': [['#target', 'style', 'contains', 'green'], [
      '#target',
      'data-mts-clicked',
      'equals',
      'true',
    ], ['#bts-status', null, 'text', 'BTS Clicked']],
    'basic-element-x-input-bindfocus': [['.result', null, 'text', 'bindfocus']],
    'basic-element-x-input-bindconfirm': [[
      '.result',
      null,
      'text',
      'bindconfirm',
    ]],
    'basic-element-x-input-bindinput': [['input', null, 'value', 'bindinput'], [
      '.result',
      null,
      'text',
      'foobar-6-6',
    ]],
  };
  assert.equal(sections.length, 10);
  assert.match(
    sections[0],
    /turn the lower green square pink\. Stop after that single click/,
  );
  assert.doesNotMatch(sections[0], /once again/);
  assert.deepEqual(
    sections.map((section) => section.split('\n')[0]).sort(),
    Object.keys(expected).sort(),
  );
  for (const section of sections) {
    const name = section.split('\n')[0];
    assert.ok(section.includes(`?casename=${name}\n`));
    assert.match(section, /- aiAct:/);
    const assertions = section.match(/- web\.expect:\s*\{[^}]*\}/g) ?? [];
    assert.equal(assertions.length, expected[name].length, name);
    expected[name].forEach(([selector, attribute, operator, value], index) => {
      assert.ok(assertions[index].includes(`selector: "${selector}"`), name);
      if (attribute) {
        assert.ok(
          assertions[index].includes(`attribute: "${attribute}"`),
          name,
        );
      }
      assert.ok(assertions[index].includes(`${operator}: "${value}"`), name);
    });
  }
  assert.doesNotMatch(
    events,
    /- (?:aiTap|aiInput|aiKeyboardPress|aiScroll|wait|aiAssert):/,
  );
});
