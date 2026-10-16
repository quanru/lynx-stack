import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import {
  bulkReactSources,
  bulkElementSources,
} from './bulk-candidate-sources.mjs';
import {
  sourceGuardPolicy,
  singleThreadMiddlewareBindings,
} from './bulk-source-audit.mjs';
import { retainedInputSources } from './retained-input-selection.mjs';
import { originalRunnerCatalog } from './original-runner-catalog.mjs';
import { caseNames } from './case-inventory.mjs';
import { fileURLToPath } from 'node:url';

const sources = [...bulkReactSources, ...bulkElementSources];
function originalDeclarations(pkg) {
  const relative = pkg === 'web-core-e2e'
    ? '../../tests/reactlynx.spec.ts'
    : '../../../web-elements/tests/web-elements.spec.ts';
  const source = ts.createSourceFile(
    relative,
    readFileSync(new URL(relative, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const found = new Map();
  function visit(node, groups = []) {
    if (
      ts.isCallExpression(node)
      && node.expression.getText(source) === 'test.describe'
    ) {
      groups = [...groups, node.arguments[0].text];
    }
    if (
      ts.isCallExpression(node) && node.expression.getText(source) === 'test'
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
    ) {
      const title = node.arguments[0].text;
      const fullTitle = [...groups, title].join(' ');
      assert.ok(!found.has(fullTitle));
      found.set(fullTitle, {
        callback: node.arguments[1],
        group: groups.at(-1),
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line
          + 1,
      });
    }
    ts.forEachChild(node, child => visit(child, groups));
  }
  visit(source);
  return { source, found };
}

test('frozen bulk inventory preserves all 120 exact callbacks, group identities and source guards', () => {
  assert.equal(bulkReactSources.length, 55);
  assert.equal(bulkElementSources.length, 65);
  assert.equal(
    new Set(
      sources.map(item =>
        item.package + '/' + item.file + '::' + item.sourceId
      ),
    ).size,
    120,
  );
  for (const pkg of ['web-core-e2e', 'web-elements']) {
    const { source, found } = originalDeclarations(pkg);
    for (const item of sources.filter(item => item.package === pkg)) {
      const original = found.get(item.fullTitle);
      assert.ok(original, item.fullTitle);
      assert.equal(original.group, item.group);
      assert.equal(original.line, item.line);
      assert.equal(item.key, item.group + '/' + item.title);
      assert.equal(item.sourceId, item.key);
      assert.equal(
        createHash('sha256').update(original.callback.getText(source)).digest(
          'hex',
        ),
        item.callbackSha256,
      );
      const policy = sourceGuardPolicy(original.callback, source);
      assert.deepEqual(item.guardEvidence, policy.guardEvidence);
      if (pkg === 'web-core-e2e') {
        assert.deepEqual(item.skipBrowsersByMode, policy.skipBrowsersByMode);
        assert.deepEqual(
          item.earlyReturnBrowsersByMode,
          policy.earlyReturnBrowsersByMode,
        );
      } else {
        assert.deepEqual(item.skipBrowsers, policy.skipBrowsersByMode.CSR);
        assert.deepEqual(
          item.earlyReturnBrowsers,
          policy.earlyReturnBrowsersByMode.CSR,
        );
      }
    }
  }
});

test('bulk selection excludes existing retained runners and YAML mappings, without reclassifying conditional AI as impossible', async () => {
  const yaml = await caseNames(fileURLToPath(new URL('../', import.meta.url)));
  for (const item of sources) {
    if (item.package === 'web-elements') {
      assert.equal(
        retainedInputSources.some(existing => existing.key === item.key),
        false,
      );
      const yamlKey = item.title.includes('/') ? item.title : item.key;
      assert.equal(yaml.includes('web-elements/' + yamlKey), false);
    } else assert.equal(yaml.includes(item.title), false);
    for (
      const runner of originalRunnerCatalog.filter(runner =>
        !runner.id.startsWith('bulk-')
      )
    ) {
      if (runner.package !== item.package || runner.file !== item.file) {
        continue;
      }
      assert.equal(runner.keys.includes(item.key), false, item.key);
    }
  }
  const counts = Object.fromEntries(
    [
      'deterministic-candidate',
      'conditional-ai-candidate',
      'retain-input-candidate',
    ].map(kind => [
      kind,
      sources.filter(item => item.frozenDecision === kind).length,
    ]),
  );
  assert.deepEqual(Object.values(counts), [20, 24, 76]);
  for (
    const item of sources.filter(item =>
      item.frozenDecision === 'conditional-ai-candidate'
    )
  ) {
    assert.match(
      item.retentionReason,
      /Temporarily retain unchanged callback; reassess AI feasibility later/,
    );
    assert.ok(item.retentionReason.length > 120);
  }
});

test('source return is limited to one WebKit callback; preceding skips take precedence', () => {
  const returns = bulkElementSources.filter(item =>
    item.earlyReturnBrowsers.length
  );
  assert.deepEqual(returns.map(item => [item.key, item.earlyReturnBrowsers]), [[
    'scroll-view/scroll-view/basic',
    ['webkit'],
  ]]);
  const refresh = bulkReactSources.find(item =>
    item.title === 'basic-element-x-refresh-view-demo'
  );
  for (const mode of ['CSR', 'SSR']) {
    assert.deepEqual(refresh.earlyReturnBrowsersByMode[mode], []);
    assert.deepEqual(refresh.skipBrowsersByMode[mode], ['firefox', 'webkit']);
  }
  const exposure = bulkReactSources.find(item =>
    item.title === 'basic-element-x-viewpager-ng-exposure'
  );
  assert.deepEqual(exposure.skipBrowsersByMode.CSR, ['firefox', 'webkit']);
  assert.deepEqual(exposure.skipBrowsersByMode.SSR, [
    'chromium',
    'firefox',
    'webkit',
  ]);
});

test('ancestor describe modifiers apply before callbacks without leaking sibling or hook guards', () => {
  function policy(body) {
    const source = ts.createSourceFile(
      'guard.ts',
      body,
      ts.ScriptTarget.Latest,
      true,
    );
    let callback;
    function visit(node) {
      if (
        ts.isCallExpression(node) && node.expression.getText(source) === 'test'
        && node.arguments[0]?.text === 'target'
      ) callback = node.arguments.at(-1);
      ts.forEachChild(node, visit);
    }
    visit(source);
    return sourceGuardPolicy(callback, source);
  }
  const scoped = policy(`test.describe('outer', () => {
    if (isSSR) test.fixme(true, 'unsupported SSR');
    test.skip('sibling declaration', () => {});
    test('sibling', () => { test.skip(true); });
    test.beforeEach(() => { test.skip(true); });
    test.describe('unrelated', () => { test.skip(true); });
    test.describe('nested', () => { test('target', () => { if (browserName === 'webkit') return; }); });
  });`);
  assert.deepEqual(scoped.skipBrowsersByMode.CSR, []);
  assert.deepEqual(scoped.skipBrowsersByMode.SSR, [
    'chromium',
    'firefox',
    'webkit',
  ]);
  assert.deepEqual(scoped.earlyReturnBrowsersByMode.CSR, ['webkit']);
  assert.deepEqual(scoped.earlyReturnBrowsersByMode.SSR, []);
  assert.equal(scoped.guardEvidence.length, 2);
  for (
    const modifier of [
      'test.skip(({ browserName }) => browserName === \'webkit\', \'reason\')',
      'if (unknownFlag) test.fixme(true)',
    ]
  ) {
    assert.throws(
      () =>
        policy(
          `test.describe('outer', () => { ${modifier}; test('target', () => {}); });`,
        ),
      /Unreviewed source guard/,
    );
  }
});

test('ancestor exposure fixme adds exactly nine SSR profiles and never changes CSR', () => {
  const affected = bulkReactSources.filter(source =>
    source.guardEvidence.some(guard => guard.line === 1929)
  );
  assert.deepEqual(affected.map(source => source.title), [
    'api-exposure-change-exposure-id',
    'api-exposure-stop-events-has-complex-dataset',
    'api-exposure-stop-events-has-dataset',
    'api-exposure-stop-exposure',
  ]);
  assert.deepEqual(affected.map(source => source.skipBrowsersByMode.CSR), [
    ['firefox', 'webkit'],
    [],
    [],
    ['webkit'],
  ]);
  for (const source of affected) {
    assert.deepEqual(source.skipBrowsersByMode.SSR, [
      'chromium',
      'firefox',
      'webkit',
    ]);
  }
  assert.equal(
    bulkReactSources.reduce(
      (sum, source) => sum + source.skipBrowsersByMode.SSR.length,
      0,
    ),
    49,
  );
});

test('guard audit fails closed for unsupported conditions and ignores nested callback returns', () => {
  const parse = code => {
    const source = ts.createSourceFile(
      'guard.ts',
      'const callback = ' + code,
      ts.ScriptTarget.Latest,
      true,
    );
    return {
      source,
      callback:
        source.statements[0].declarationList.declarations[0].initializer,
    };
  };
  const unknown = parse('() => { if (window.flag) test.skip(); }');
  const multiThread = parse('() => { test.skip(ENABLE_MULTI_THREAD); }');
  assert.throws(
    () => sourceGuardPolicy(multiThread.callback, multiThread.source),
    /Unreviewed source guard/,
  );
  const bindingSource = ts.createSourceFile(
    'middleware.ts',
    'const ENABLE_MULTI_THREAD = !!process.env[\'ENABLE_MULTI_THREAD\'];',
    ts.ScriptTarget.Latest,
    true,
  );
  const bindings = singleThreadMiddlewareBindings(bindingSource);
  assert.deepEqual(
    sourceGuardPolicy(multiThread.callback, multiThread.source, bindings)
      .skipBrowsersByMode.CSR,
    [],
  );
  for (
    const code of ['const ENABLE_MULTI_THREAD = true;', 'const OTHER = false;']
  ) {
    assert.throws(
      () =>
        singleThreadMiddlewareBindings(
          ts.createSourceFile('bad.ts', code, ts.ScriptTarget.Latest, true),
        ),
      /Unreviewed middleware/,
    );
  }
  assert.throws(
    () =>
      sourceGuardPolicy(multiThread.callback, multiThread.source, {
        ENABLE_MULTI_THREAD: 'false',
      }),
    /Invalid reviewed/,
  );
  assert.throws(
    () => sourceGuardPolicy(unknown.callback, unknown.source),
    /Unreviewed source guard/,
  );
  const nested = parse('() => { page.on("console", () => { return; }); }');
  assert.equal(
    sourceGuardPolicy(nested.callback, nested.source).guardEvidence.length,
    0,
  );
  const branch = parse(
    '() => { if (browserName === "webkit") {} else { test.skip(); } }',
  );
  assert.deepEqual(
    sourceGuardPolicy(branch.callback, branch.source).skipBrowsersByMode.CSR,
    ['chromium', 'firefox'],
  );
});
