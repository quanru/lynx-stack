import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('required original CSR/component browser matrix has no uncovered eligible variant', () => {
  // --list imports the original suites, but never launches a browser or runs a
  // callback. Unlike a count-only catalog test, this also discovers new source
  // tests and fails if a required source/browser pair is not represented.
  const output = JSON.parse(execFileSync(process.execPath, [
    fileURLToPath(
      new URL('./check-required-browser-coverage.mjs', import.meta.url),
    ),
  ], { encoding: 'utf8', timeout: 120_000, maxBuffer: 10_000_000 }));
  assert.equal(output.required.variants, 0);
  assert.deepEqual(output.unknown, []);
  assert.equal(
    output.optionalSSR.variants,
    729,
    'Optional hydrated SSR remains a separately reviewed scope, not a required gap or a pass',
  );
  assert.ok(Object.keys(output.collected).length > 10);
  assert.ok(Object.keys(output.sourceHashes).length > 0);
  assert.match(output.proof, /not runtime acceptance/);
});
