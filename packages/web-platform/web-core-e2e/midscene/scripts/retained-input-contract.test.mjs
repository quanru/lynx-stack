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

test('retained selection matches exactly thirty-two component-scoped original callbacks', () => {
  assert.equal(retainedInputKeys.length, 32);
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

test('new retained contracts preserve the full swiper title and exact audio/list selection', () => {
  assert.ok(
    retainedInputKeys.includes('x-swiper/x-swiper/x-swiper-circular-click'),
  );
  assert.ok(retainedInputGrep.test(
    'web-elements test suite x-swiper x-swiper/x-swiper-circular-click',
  ));
  assert.equal(
    retainedInputKeys.filter(key => key.startsWith('x-audio-tt/')).length,
    13,
  );
  assert.ok(retainedInputKeys.includes('x-list/auto-scroll'));
  assert.equal(
    retainedInputGrep.test(
      'web-elements test suite x-list auto-scroll-follows-orientation',
    ),
    false,
  );
  // Adjacent audio tests with WebKit skips must not be enabled by a broad grep.
  for (
    const title of [
      'attribute-loop',
      'method-resume',
      'method-getCurrentTime',
      'method-getDuration',
    ]
  ) {
    assert.equal(
      retainedInputGrep.test('web-elements test suite x-audio-tt ' + title),
      false,
    );
  }
});

// Review a source change explicitly; never silently weaken its input or oracle.
const callbackDigests = {
  'x-list/event-scroll':
    'a5ddb50aeae14ae2744226dafb279d4c29b4bc2e68249bcc88f6ea98fb653c01',
  'x-list/need-visible-item-info':
    '74fbd90ad4893c9290a6b119010e93767a3aae3f5833cc1b77f25575ce7b13cb',
  'x-text/x-text/text-maxline-with-inline-view-and-custom-truncation':
    '6bffe4ffc91e3370e8512340399300db309ae04300b4f1623ac05fedf314b8a7',
  'x-audio-tt/attribute-headers':
    'd21b8bd74582a515421cf16b76453dafccd897d67d4b1982551fb76708f7d8e8',
  'x-list/auto-scroll':
    'ceec57cd05acaed47fc8f1c5a6c80121cdfb18e4a6e4bcd8e744f682fce5102f',
  'x-swiper/x-swiper/x-swiper-circular-click':
    'be97a3735b234fbe04d4292ab5db97e2b7c609aa3b4bd3f642799a7f38e116b9',
  'x-audio-tt/attribute-src-change':
    '23b00c18ba7e60943f1993d15c2c6b67687cc46550283f388aff9054c53f1f30',
  'x-audio-tt/attribute-loop-close':
    '922fc21553501ba80fabe9e16dbb06528ab29aadd63d7e156152526199f7f24a',
  'x-audio-tt/attribute-pause-on-hide':
    '7df7e085f17e0ef16eb5c046e24eb4362771be0a2b59d33a94bad9436d552d98',
  'x-audio-tt/attribute-interval':
    'd55865307100d02126572083f92f99ef707ba5f6b0fc252dd7e451686e9bd339',
  'x-audio-tt/event-srcloadingstatechanged':
    '899511d9563f3d9eef750755a4b6d0d34911d99fc3190c43e35eb81f5478634b',
  'x-audio-tt/event-playbackstatechanged':
    '1b8bc6a226718458ed5b12020911fe69e227578319a84b227a7006a1b9c98a93',
  'x-audio-tt/event-finished':
    '92ff989a4faeb031bd98ea1f6fbe3f7b286fa798aaa0405e5c233cf07cd33cf5',
  'x-audio-tt/event-seek':
    '2855d4bc42c1183ede83dc4c3b61d1a03cc26b28ffafd353c16ec5ac85bf232e',
  'x-audio-tt/event-error-src':
    '00f378e503d30379e49fc0d55e87167214f3dbabb9bb320aafe329adfd4c18f0',
  'x-audio-tt/event-error-src-json':
    'f8c08ef3a95df7853e65e4688facc7cbbca17f761261943f4663a7e9cc0c3f6c',
  'x-audio-tt/event-error-playback':
    '4de7e090b651cc6acfda5dab8648b47027f8b101452927c15224048884666f29',
  'x-audio-tt/method-play':
    '1e03a81ff1bed150291353209940c9eaab899311ce3bbbf481170c8f57a4f83d',

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
    assert.doesNotMatch(callback, /test\.(skip|fixme)|ENABLE_SSR/);
    // These two callbacks destructure browserName but never read or guard it.
    const unusedBrowserArgument = [
      'x-list/event-scroll',
      'x-list/need-visible-item-info',
    ].includes(key);
    assert.equal(
      (callback.match(/\bbrowserName\b/g) ?? []).length,
      unusedBrowserArgument ? 1 : 0,
    );
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

test('new host-observation callbacks preserve listener boundaries, weak array checks and route semantics', async () => {
  async function replay(key, options = {}) {
    const trace = [];
    const listeners = new Map();
    let routeHandler;
    const pending = [];
    const emit = event => {
      const handler = listeners.get('console');
      if (handler) {
        pending.push(
          handler({ args: () => [{ evaluate: async fn => fn(event) }] }),
        );
      }
    };
    const context = {
      getTitle: () => key,
      expect: actual => ({
        toBe: expected => assert.equal(actual, expected),
        toBeTruthy: () => assert.ok(actual),
        toEqual: expected =>
          assert.equal(JSON.stringify(actual), JSON.stringify(expected)),
      }),
      wait: async ms => {
        trace.push(['wait', ms]);
        await Promise.all(pending);
      },
      gotoWebComponentPage: async () => {
        trace.push(['goto']);
        if (key.startsWith('x-text/') && options.error) {
          if (options.error === 'pageerror') {
            listeners.get('pageerror')({ message: 'failure' });
          } else {listeners.get('console')({
              type: () => options.error,
              text: () => 'failure',
            });}
        }
        if (routeHandler && options.request) {
          routeHandler({
            request: () => ({
              headers: () => ({ 'custom-header': options.header }),
            }),
            continue: () => {
              trace.push(['continue']);
              return {
                then() {
                  assert.fail('Original route.continue must remain unawaited');
                },
              };
            },
          });
        }
      },
      document: {
        querySelector: () => ({
          shadowRoot: {
            querySelector: () => ({
              scrollTo(x, y) {
                trace.push(['scrollTo', x, y]);
                if (options.noEvents) return;
                const types = key.endsWith('event-scroll')
                  ? ['lynxscroll', 'lynxscrollend']
                  : ['lynxscroll', 'scrolltoupper', 'scrolltolower'];
                for (const type of types) {
                  emit({
                    type,
                    detail: { attachedCells: options.cells ?? [] },
                  });
                }
              },
            }),
          },
        }),
      },
    };
    const page = {
      on(type, callback) {
        trace.push(['listen', type]);
        listeners.set(type, callback);
      },
      route: async (pattern, callback) => {
        trace.push(['route', pattern]);
        routeHandler = callback;
      },
      evaluate: fn => fn(),
    };
    const code = ts.transpile('(' + declarations.get(key) + ')', {
      target: ts.ScriptTarget.ES2022,
    });
    await runInNewContext(code, context)({ page, browserName: 'webkit' }, {
      title: key,
      titlePath: [],
    });
    return trace;
  }
  for (
    const [key, offset] of [['x-list/event-scroll', 500], [
      'x-list/need-visible-item-info',
      5000,
    ]]
  ) {
    assert.deepEqual(await replay(key), [['listen', 'console'], ['goto'], [
      'scrollTo',
      0,
      offset,
    ], ['wait', 1000]]);
    await assert.rejects(replay(key, { noEvents: true }));
  }
  await assert.rejects(replay('x-list/need-visible-item-info', { cells: {} }));
  // Empty arrays remain valid: no nonempty or item-field assertion is invented.
  await replay('x-list/need-visible-item-info', { cells: [] });
  const textKey =
    'x-text/x-text/text-maxline-with-inline-view-and-custom-truncation';
  assert.ok(retainedInputKeys.includes(textKey));
  assert.deepEqual(await replay(textKey), [
    ['listen', 'pageerror'],
    ['listen', 'console'],
    ['goto'],
    ['wait', 500],
  ]);
  for (const error of ['pageerror', 'error']) {
    await assert.rejects(replay(textKey, { error }));
  }
  await replay(textKey, { error: 'warning' });
  const headersKey = 'x-audio-tt/attribute-headers';
  // The source has no request-occurrence assertion and can pass without a request.
  assert.deepEqual(await replay(headersKey), [['route', '**/*.mp3'], ['goto']]);
  assert.deepEqual(
    await replay(headersKey, { request: true, header: 'test' }),
    [['route', '**/*.mp3'], ['goto'], ['continue']],
  );
  await assert.rejects(replay(headersKey, { request: true, header: 'wrong' }));
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
