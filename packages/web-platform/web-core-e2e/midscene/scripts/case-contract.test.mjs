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

test('input editing uses aiAct without a custom selector-based action node', () => {
  assert.doesNotMatch(
    config + cases,
    /web\.fill|webFillNode|interface FillInput/,
  );
  assert.match(cases, /- aiAct:.*press Enter.*"foobar".*caret at the end/);
  assert.doesNotMatch(cases, /selector: "input", value:/);
  assert.match(cases, /selector: "\.result", text: "foobar-6-6"/);
  assert.match(config, /locator\.innerText\(\)/);
  assert.match(config, /actual === text/);
  assert.doesNotMatch(config, /\.trim\(\)/);
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
