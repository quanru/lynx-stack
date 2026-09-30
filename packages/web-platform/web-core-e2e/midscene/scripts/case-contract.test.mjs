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
  assert.match(cases, /selector: "input", value: "bindinput"/);
  assert.match(cases, /selector: "\.result", text: "foobar-6-6"/);
});

test('image case includes visual evidence without dropping resource contracts', () => {
  assert.match(cases, /imageLoaded: true/);
  assert.match(cases, /web\.expectResponse:/);
  assert.match(cases, /- aiAssert: A black square image/);
});

test('gradient assertion does not invent bold weight absent from the fixture', () => {
  assert.match(cases, /very large letters/);
  assert.doesNotMatch(cases, /bold letters/);
});
