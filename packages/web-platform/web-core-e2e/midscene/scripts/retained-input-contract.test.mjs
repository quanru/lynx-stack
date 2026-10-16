import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  retainedInputGrep,
  retainedInputKeys,
} from './retained-input-selection.mjs';

const source = ts.createSourceFile(
  'source.ts',
  readFileSync(
    new URL(
      '../../../web-elements/tests/web-elements.spec.ts',
      import.meta.url,
    ),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
const declarations = new Map();
const helpers = new Map();
function visit(node, groups = []) {
  if (
    ts.isVariableDeclaration(node) && node.initializer
    && ['wait', 'diffScreenShot', 'gotoWebComponentPage', 'getTitle'].includes(
      node.name.getText(source),
    )
  ) {
    helpers.set(node.name.getText(source), node.initializer.getText(source));
  }
  if (
    ts.isCallExpression(node)
    && node.expression.getText(source) === 'test.describe'
  ) {
    groups = [...groups, node.arguments[0].text];
  }
  if (
    ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) {
    const title = [...groups, node.arguments[0].text].join(' ');
    if (retainedInputGrep.test(title)) {
      const key = `${groups.at(-1)}/${node.arguments[0].text}`;
      assert.ok(!declarations.has(key), 'Duplicate selected declaration');
      declarations.set(key, node.arguments[1].getText(source));
    }
  }
  ts.forEachChild(node, child => visit(child, groups));
}
visit(source);

test('retained selection matches exactly fourteen component-scoped original callbacks', () => {
  assert.equal(retainedInputKeys.length, 14);
  assert.deepEqual(
    [...declarations.keys()].sort(),
    [...retainedInputKeys].sort(),
  );
  assert.equal(
    retainedInputGrep.test('web-elements test suite x-list event-confirm'),
    false,
  );
  assert.equal(
    retainedInputGrep.test(
      'web-elements test suite x-input event-confirm-extra',
    ),
    false,
  );
});

// Review a source change explicitly; never silently weaken its input or oracle.
const callbackDigests = {
  'x-input/type-value-do-not-show-input':
    '9230c341c7b77bc1f67014ca5553014e75667054c93f6c42250a2617b97951f7',
  'x-input/type-password':
    'f85fabe087a30b37c7c9ae5729f66a2d08b24d99576743b83788cd1908a4be6f',
  'x-input/press-enter-do-not-submit-value':
    '06d78c83c7d61152943364d606ca1b8504faf11c316cf9ebadf9fe3fdc93d1de',
  'x-input/attribute-disabled':
    '9df146784bba76c7b2f3c2cdcbd444206288bf265531365487756cc5402ca139',
  'x-input/attribute-readonly':
    '2345cea40f80f906a1633f89fa5c06fe195d7bfe015fdf579109ba43c6b7478e',
  'x-input/event-confirm':
    '480b4e9b10ab071467e32dbbd4f4e75632267541e8df5458618f805d6ffe299a',
  'x-input/event-focus-blur':
    '94e7452088b6e166394349c22ddcf04c9c663e7426b0f4248eea278f34574461',
  'x-input/event-input-number-dot':
    '0d855705c94de51c93df909e4b7f5b2f75f01a1b48d02848f1ef88a2b6ef2ca9',
  'x-textarea/press-enter-do-not-submit-value':
    '06d78c83c7d61152943364d606ca1b8504faf11c316cf9ebadf9fe3fdc93d1de',
  'x-textarea/attribute-disabled':
    '9df146784bba76c7b2f3c2cdcbd444206288bf265531365487756cc5402ca139',
  'x-textarea/attribute-readonly':
    '2345cea40f80f906a1633f89fa5c06fe195d7bfe015fdf579109ba43c6b7478e',
  'x-textarea/event-input':
    '0dfbfe422442ebf0949ae615b6dede754d15350027bca267cef95added6c964a',
  'x-textarea/event-confirm':
    '125f3896424a1dd38751608c0cfad368db279efbdad4c127f25e3b03ca9e5075',
  'x-textarea/event-focus-blur':
    '94e7452088b6e166394349c22ddcf04c9c663e7426b0f4248eea278f34574461',
};
test('raw input, complete assertion tails and timing stay byte-for-byte unchanged', () => {
  for (const [key, callback] of declarations) {
    assert.equal(
      createHash('sha256').update(callback).digest('hex'),
      callbackDigests[key],
      key,
    );
    assert.doesNotMatch(callback, /test\.(skip|fixme)|browserName|ENABLE_SSR/);
  }
});

test('original navigation, pixel options, title mapping and waits are unchanged', () => {
  const digests = {
    wait: '1d4b14e55e33ce95d1e06c2d9658b68b6715c79b3869b8375faf1279700b4cbe',
    diffScreenShot:
      '3ab61881f344876d3a5e111105a48127b442d005822d0e06d0d10772835e7861',
    gotoWebComponentPage:
      '6218f5e0a871237d76896ef2f2d7c3e3931b8be485f88c422aca8a641ec338c0',
    getTitle:
      'd9602d661d89100511b3bcf0759e3886870cf3e0f22515bc779adf2e9b1df3b9',
  };
  assert.equal(helpers.size, 4);
  for (const [name, body] of helpers) {
    assert.equal(
      createHash('sha256').update(body).digest('hex'),
      digests[name],
      name,
    );
  }
});

test('evidence configuration changes only selection, outputs and post-callback screenshots', () => {
  const configURL = new URL(
    '../../../web-elements/playwright.retained-inputs.config.ts',
    import.meta.url,
  );
  const text = readFileSync(configURL, 'utf8');
  const original = {
    testMatch: '**/tests/*',
    use: { trace: 'on-first-retry', baseURL: 'http://localhost:3081/' },
    projects: [{
      name: 'chromium',
      use: { viewport: { width: 393, height: 851 } },
    }],
    retries: 20,
    globalTimeout: 1200000,
    maxFailures: 16,
    fullyParallel: true,
    expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
    webServer: { reuseExistingServer: false, command: 'npm run serve' },
  };
  const context = {
    original,
    retainedInputGrep,
    URL,
    fileURLToPath,
    defineConfig: value => value,
  };
  const executable = text.replace(/^import .*;\n/gm, '')
    .replace('import.meta.url', JSON.stringify(configURL.href))
    .replace('export default defineConfig', 'globalThis.result = defineConfig');
  runInNewContext(
    ts.transpile(executable, { target: ts.ScriptTarget.ES2022 }),
    context,
  );
  const { result } = context;
  const allowed = ['testMatch', 'grep', 'outputDir', 'use', 'reporter'];
  for (
    const key of Object.keys(original).filter(key => !allowed.includes(key))
  ) {
    assert.strictEqual(result[key], original[key], key);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(result.use)), {
    ...original.use,
    screenshot: 'on',
  });
  assert.equal(result.grep, retainedInputGrep);
  assert.deepEqual(
    Object.keys(result).filter(key => !(key in original)).sort(),
    ['grep', 'outputDir', 'reporter'],
  );
  assert.deepEqual(Array.from(result.reporter, item => item[0]), [
    'line',
    'html',
    'json',
  ]);
  assert.equal(result.reporter[1][1].open, 'never');
  assert.ok(
    result.outputDir.endsWith(
      '/midscene-original-results/retained-inputs/results',
    ),
  );
});
