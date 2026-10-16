import assert from 'node:assert/strict';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';
import {
  originalRunnerCatalog,
  originalRunnerSourceCount,
  originalEvidenceConfig,
  retainedCatalog,
  catalogSourceCount,
  sourceSelectionPattern,
} from './original-runner-catalog.mjs';
import { retainedInputEvidence } from './retained-input-evidence.mjs';
import { writeOriginalRunnerEvidence } from './write-original-runner-evidence.mjs';
import {
  prepareOriginalRunnerPublication,
  mergeOriginalEvidence,
} from './publish-original-runners.mjs';
import { prepareRetainedPublication } from './publish-report.mjs';
import {
  validateSupplementalEvidence,
  renderSummary,
} from './render-ci-summary.mjs';

const workflow = YAML.parse(
  readFileSync(
    new URL(
      '../../../../../.github/workflows/midscene-web.yml',
      import.meta.url,
    ),
    'utf8',
  ),
);
const steps = workflow.jobs['web-shell-ai-e2e'].steps;

test('ancestor SSR exemption still requires actual final skipped result and expectedStatus proof', t => {
  const catalog = originalRunnerCatalog.find(row =>
    row.id === 'bulk-react-ssr'
  );
  const { root } = fixture(t);
  const directory = path.join(
    root,
    catalog.package,
    'midscene-original-results',
    catalog.id,
  );
  const report = JSON.parse(
    readFileSync(path.join(directory, 'report.json'), 'utf8'),
  );
  const title = 'api-exposure-stop-events-has-dataset';
  let item;
  function visit(suites) {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        if (spec.title === title) {
          item = spec.tests.find(row => row.projectName === 'webkit');
        }
      }
      visit(suite.suites ?? []);
    }
  }
  visit(report.suites);
  const convert = () =>
    retainedInputEvidence(report, directory, catalog).cases.find(row =>
      row.source.endsWith('/' + title) && row.browser === 'webkit'
    );
  assert.equal(convert().evidencePolicy, 'source-skip');
  item.expectedStatus = 'passed';
  assert.equal(convert().evidencePolicy, 'ui');
  item.expectedStatus = 'skipped';
  item.results = [];
  const missing = convert();
  assert.equal(missing.status, 'not-run');
  assert.equal(missing.evidencePolicy, 'ui');
  assert.deepEqual(missing.screenshots, []);
});
test('bulk selection escapes punctuation and requires the exact suite, group and complete title', () => {
  const pattern = sourceSelectionPattern([{
    suite: 'web-elements test suite',
    group: 'x-input',
    title: 'input.some+value (literal)?',
  }]);
  assert.ok(
    pattern.test(
      'chromium tests/web-elements.spec.ts web-elements test suite x-input input.some+value (literal)?',
    ),
  );
  assert.ok(
    !pattern.test(
      'chromium tests/web-elements.spec.ts web-elements test suite x-textarea input.some+value (literal)?',
    ),
  );
  assert.ok(
    !pattern.test(
      'chromium tests/web-elements.spec.ts web-elements test suite x-input inputXsomevalue literal',
    ),
  );
  assert.ok(
    !pattern.test(
      'chromium tests/web-elements.spec.ts web-elements test suite x-input input.some+value (literal)? extra',
    ),
  );
  assert.throws(() => sourceSelectionPattern([]), /Empty original/);
});

test('bulk source identities do not overlap any prior runner or retained source despite different key formats', () => {
  const identities = catalog =>
    catalog.sources
      ? catalog.sources.map(source =>
        `${source.file}::${source.group ?? source.suite ?? ''}/${source.title}`
      )
      : catalog.keys.map(key => `${catalog.file}::${key}`);
  const prior = new Set(
    [
      ...originalRunnerCatalog.filter(runner => !runner.selectSources),
      retainedCatalog,
    ].flatMap(identities),
  );
  for (
    const runner of originalRunnerCatalog.filter(runner => runner.selectSources)
  ) {
    for (const identity of identities(runner)) {
      assert.ok(!prior.has(identity), identity);
    }
  }
});
test('SVG expansion preserves 12 original declarations, 15 titles and exact source identities', () => {
  const runner = originalRunnerCatalog.find(item =>
    item.id === 'svg-selection-webview'
  );
  const declarations = [];
  for (const file of runner.files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(
        new URL(`../../../web-elements/${file}`, import.meta.url),
        'utf8',
      ),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      if (
        ts.isCallExpression(node) && node.expression.getText(source) === 'test'
      ) {
        const title = node.arguments[0];
        if (ts.isStringLiteral(title)) {
          const matches = runner.sources.filter(item =>
            item.file === file && item.title === title.text
          );
          assert.equal(matches.length, 1);
          assert.equal(matches[0].sourceId, title.text);
          declarations.push(matches[0].sourceId);
        } else {
          assert.equal(
            title.getText(source),
            '`x-svg inline layout in ${parent}, wrapped=${wrapped}`',
          );
          const loops = [];
          for (let parent = node.parent; parent; parent = parent.parent) {
            if (ts.isForOfStatement(parent)) {
              loops.push(parent.expression.getText(source));
            }
          }
          assert.deepEqual(loops, [
            '[false, true]',
            '[\'x-text\', \'inline-truncation\']',
          ]);
          const expanded = runner.sources.filter(item =>
            item.sourceId === 'svg-inline-layout'
          );
          assert.equal(expanded.length, 4);
          assert.deepEqual(
            expanded.map(item => item.title),
            ['x-text', 'inline-truncation'].flatMap(parent =>
              [false, true].map(wrapped =>
                `x-svg inline layout in ${parent}, wrapped=${wrapped}`
              )
            ),
          );
          declarations.push('svg-inline-layout');
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.equal(declarations.length, 12);
  assert.equal(runner.keys.length, 15);
});

test('multi-file manifest rejects forged declaration identity without dropping expanded rows', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  assert.equal(writeOriginalRunnerEvidence(root, outcomes), 0);
  stage();
  const file = path.join(
    entry.path,
    'original-runners/svg-selection-webview/evidence.json',
  );
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(manifest.sourceDeclarations, 12);
  assert.equal(manifest.cases.length, 45);
  assert.equal(
    new Set(manifest.cases.map(row => `${row.sourceFile}::${row.sourceId}`))
      .size,
    12,
  );
  manifest.cases[0].sourceId = 'another-declaration';
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(
    () => prepareOriginalRunnerPublication(entry, env),
    /Invalid or duplicate/,
  );
});

test('eighteen original runners retain profiles and the five new batches are explicitly bounded', () => {
  assert.equal(originalRunnerSourceCount, 701);
  assert.equal(
    originalRunnerCatalog.reduce(
      (sum, row) => sum + row.keys.length * row.browsers.length,
      0,
    ),
    1835,
  );
  assert.equal(
    steps.filter(step => step.run?.includes('pnpm exec playwright test'))
      .length,
    19,
  );
  for (const runner of originalRunnerCatalog) {
    const matches = steps.filter(step => step.name === runner.stepName);
    assert.equal(matches.length, 1);
    const step = matches[0];
    assert.equal(step.id, `original-${runner.id}`);
    assert.equal(
      step.if,
      '${{ !cancelled() && steps.build-web.outcome == \'success\' && steps.original-collection.outcome == \'success\' }}',
    );
    assert.equal(step['continue-on-error'], undefined);
    assert.equal(
      step['working-directory'],
      `packages/web-platform/${runner.package}`,
    );
    assert.equal(step.env.ORIGINAL_EVIDENCE_RUNNER, runner.id);
    if (runner.package === 'web-core-e2e' && runner.id !== 'runtime') {
      assert.equal(step.env.ENABLE_SSR, runner.mode === 'SSR' ? '1' : '');
    } else if (runner.package === 'web-elements') {
      assert.equal(step.env.PORT, '3081');
    }
    assert.equal(
      step.run.trim().split('\n').at(-1),
      `pnpm exec playwright test ${runner.file} ${
        runner.browsers.map(browser => `--project ${browser}`).join(' ')
      } --workers=2${runner.grep ? ` --grep '${runner.grep}'` : ''}${
        runner.grepInvert ? ` --grep-invert '${runner.grepInvert}'` : ''
      } --output midscene-original-results/${runner.id}/results --config playwright.original-evidence.config.ts`,
    );
    assert.ok(
      steps.indexOf(step)
        < steps.findIndex(item => item.name === 'Start web-core-e2e dev shell'),
    );
    if (runner.sources) continue; // Multi-file declarations are checked below.
    const source = ts.createSourceFile(
      'original.ts',
      readFileSync(
        new URL(`../../../${runner.package}/${runner.file}`, import.meta.url),
        'utf8',
      ),
      ts.ScriptTarget.Latest,
      true,
    );
    const keys = [];
    function visit(node, group = '') {
      if (
        ts.isCallExpression(node)
        && node.expression.getText(source) === 'test.describe'
      ) group = node.arguments[0].text;
      if (
        ts.isCallExpression(node) && node.expression.getText(source) === 'test'
        && ts.isStringLiteral(node.arguments[0])
      ) {
        const key = `${group}/${node.arguments[0].text}`;
        if (new RegExp(runner.grep).test(key.replace('/', ' '))) keys.push(key);
      }
      ts.forEachChild(node, child => visit(child, group));
    }
    visit(source);
    assert.deepEqual(keys.sort(), [...runner.keys].sort());
  }
  const producer = steps.find(step =>
    step.name
      === 'Preserve existing original runner evidence before moving artifacts'
  );
  assert.equal(producer.if, 'always()');
  for (const runner of originalRunnerCatalog) {
    assert.ok(
      producer.env.ORIGINAL_RUNNER_OUTCOMES.includes(
        `steps.original-${runner.id}.outcome`,
      ),
    );
  }
});

test('configuration wrappers only add post-callback recording and preserve every inherited setting', () => {
  const original = {
    use: { trace: 'on-first-retry' },
    projects: [{ name: 'chromium' }],
    retries: 20,
    globalTimeout: 1200000,
    expect: { timeout: 5000 },
    webServer: { reuseExistingServer: false },
    testMatch: '**/tests/*',
  };
  for (const runner of originalRunnerCatalog) {
    const config = originalEvidenceConfig(original, runner.package, '/repo', {
      ORIGINAL_EVIDENCE_RUNNER: runner.id,
      ENABLE_SSR: runner.mode === 'SSR' ? '1' : '',
    });
    for (const key of Object.keys(original).filter(key => key !== 'use')) {
      assert.strictEqual(config[key], original[key]);
    }
    assert.deepEqual(config.use, { ...original.use, screenshot: 'on' });
    assert.deepEqual(config.reporter.map(row => row[0]), [
      'line',
      'html',
      'json',
    ]);
    assert.equal(
      config.reporter[1][1].outputFolder,
      `/repo/midscene-original-results/${runner.id}/html`,
    );
    assert.equal(
      config.reporter[2][1].outputFile,
      `/repo/midscene-original-results/${runner.id}/report.json`,
    );
  }
  assert.throws(
    () =>
      originalEvidenceConfig(original, 'web-elements', '/repo', {
        ORIGINAL_EVIDENCE_RUNNER: 'keyboard-csr',
      }),
    /mismatch/,
  );
  assert.throws(
    () =>
      originalEvidenceConfig(original, 'web-core-e2e', '/repo', {
        ORIGINAL_EVIDENCE_RUNNER: 'keyboard-ssr',
      }),
    /mismatch/,
  );
});

function fixture(t) {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), 'original-evidence-')),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const runner of originalRunnerCatalog) {
    const directory = path.join(
      root,
      runner.package,
      'midscene-original-results',
      runner.id,
    );
    mkdirSync(path.join(directory, 'html'), { recursive: true });
    mkdirSync(path.join(directory, 'results'));
    writeFileSync(
      path.join(directory, 'html/index.html'),
      '<html>Report</html>',
    );
    const suites = runner.keys.map((key, index) => {
      const [group, name] = key.split('/');
      const descriptor = runner.sources?.find(source => source.key === key);
      const unit = {
        title: descriptor?.group ?? descriptor?.suite
          ?? (descriptor ? descriptor.file : group),
        specs: [{
          title: descriptor?.title ?? name,
          file: descriptor?.file ?? runner.file,
          line: index + 1,
          tests: runner.browsers.map(projectName => {
            const skipped = descriptor?.skipBrowsers?.includes(projectName);
            const nonUI = descriptor?.evidencePolicy === 'non-ui';
            const image = path.join(
              directory,
              'results',
              `${index}-${projectName}.png`,
            );
            writeFileSync(image, 'synthetic screenshot');
            return {
              projectName,
              expectedStatus: skipped ? 'skipped' : 'passed',
              status: skipped ? 'skipped' : 'expected',
              results: [{
                retry: 0,
                status: skipped ? 'skipped' : 'passed',
                duration: 10,
                attachments: skipped || nonUI ? [] : [{
                  name: 'screenshot',
                  contentType: 'image/png',
                  path: image,
                }],
              }],
            };
          }),
        }],
      };
      if (!descriptor?.group || descriptor.group === descriptor.suite) {
        return unit;
      }
      const middle = descriptor.fullTitle?.slice(
        descriptor.suite.length + 1,
        -(descriptor.group.length + descriptor.title.length + 1),
      ).trim();
      return {
        title: descriptor.suite,
        suites: middle ? [{ title: middle, suites: [unit] }] : [unit],
      };
    });
    writeFileSync(
      path.join(directory, 'report.json'),
      JSON.stringify({
        errors: [],
        suites: runner.sources ? suites : [{
          title: runner.file,
          suites: [{ title: runner.suite, suites }],
        }],
      }),
    );
  }
  const outcomes = Object.fromEntries(
    originalRunnerCatalog.map(row => [row.id, 'success']),
  );
  const stage = () => {
    for (const runner of originalRunnerCatalog) {
      cpSync(
        path.join(root, runner.package, 'midscene-original-results', runner.id),
        path.join(root, 'artifact/original-runners', runner.id),
        { recursive: true },
      );
    }
  };
  return {
    root,
    outcomes,
    stage,
    entry: {
      path: path.join(root, 'artifact'),
      artifact: 'midscene-ai-e2e-web-1',
      attempt: 1,
    },
    env: {
      GITHUB_RUN_ID: '123',
      GITHUB_RUN_ATTEMPT: '1',
      RUNNER_TEMP: root,
      REPORT_LINKS_PUBLISHED: 'false',
    },
  };
}

test('all eighteen producers preserve 1835 rows, 701 sources, 238 skips and one non-UI case', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  assert.equal(writeOriginalRunnerEvidence(root, outcomes), 0);
  stage();
  const result = prepareOriginalRunnerPublication(entry, env);
  assert.equal(result.sourceCount, 701);
  assert.equal(result.expectedCount, 1835);
  assert.equal(result.cases.length, 1835);
  assert.equal(
    new Set(result.cases.map(row => `${row.platform}/${row.name}`)).size,
    1835,
  );
  assert.deepEqual(result.errors, []);
  assert.ok(
    result.cases.filter(row => row.evidencePolicy === 'ui').every(row =>
      row.status === 'success' && row.previewPath && row.reportPath
      && row.durationMs === 10
    ),
  );
  assert.equal(
    result.cases.filter(row => row.status === 'skipped').length,
    238,
  );
  assert.equal(
    result.cases.filter(row => row.evidencePolicy === 'non-ui').length,
    1,
  );
  assert.doesNotThrow(() => validateSupplementalEvidence(result));
});

test('skipped producer is distinct and cannot be hidden by successful producers', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  outcomes['keyboard-ssr'] = 'skipped';
  rmSync(
    path.join(
      root,
      'web-core-e2e/midscene-original-results/keyboard-ssr/report.json',
    ),
  );
  assert.equal(writeOriginalRunnerEvidence(root, outcomes), 1);
  stage();
  const result = prepareOriginalRunnerPublication(entry, env);
  assert.equal(result.cases.filter(row => row.status === 'not-run').length, 18);
  assert.equal(
    result.cases.filter(row => row.status === 'success').length,
    1578,
  );
  assert.match(result.errors.join(' '), /keyboard-ssr.*skipped/);
});

test('allowlisted browser without an applied skip guard stays not-run attention', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  const file = path.join(
    root,
    'web-core-e2e/midscene-original-results/runtime/report.json',
  );
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const item = report.suites.flatMap(suite => suite.specs).flatMap(spec =>
    spec.tests
  ).find(item => item.expectedStatus === 'skipped');
  item.expectedStatus = 'passed'; // Worker skipped this item before executing test.skip.
  writeFileSync(file, JSON.stringify(report));
  assert.equal(writeOriginalRunnerEvidence(root, outcomes), 1);
  stage();
  const result = prepareOriginalRunnerPublication(entry, env);
  assert.equal(
    result.cases.filter(row => row.status === 'skipped').length,
    237,
  );
  assert.equal(result.cases.filter(row => row.status === 'not-run').length, 1);
  assert.equal(
    result.cases.find(row => row.status === 'not-run').evidencePolicy,
    'ui',
  );
});

test('missing producer never fabricates source skips; non-UI still requires real HTML', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  rmSync(
    path.join(
      root,
      'web-core-e2e/midscene-original-results/runtime/report.json',
    ),
  );
  rmSync(
    path.join(
      root,
      'web-elements/midscene-original-results/template/html/index.html',
    ),
  );
  assert.equal(writeOriginalRunnerEvidence(root, outcomes), 1);
  stage();
  const result = prepareOriginalRunnerPublication(entry, env);
  assert.equal(
    result.cases.filter(row => row.status === 'not-run').length,
    105,
  );
  assert.equal(
    result.cases.filter(row => row.status === 'skipped').length,
    206,
  );
  const template = result.cases.find(row => row.evidencePolicy === 'non-ui');
  assert.equal(template.status, 'failed');
  assert.equal(template.reportPath, null);
  assert.equal(template.previewPath, null);
  assert.doesNotThrow(() => validateSupplementalEvidence(result));
});

test('publisher rejects non-UI and source-skip exemptions outside trusted catalog', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  writeOriginalRunnerEvidence(root, outcomes);
  stage();
  const file = path.join(
    entry.path,
    'original-runners/keyboard-csr/evidence.json',
  );
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  for (const policy of ['non-ui', 'source-skip']) {
    manifest.cases[0].evidencePolicy = policy;
    writeFileSync(file, JSON.stringify(manifest));
    assert.throws(
      () =>
        prepareOriginalRunnerPublication(entry, {
          ...env,
          GITHUB_RUN_ID: policy === 'non-ui' ? '124' : '125',
        }),
      /Invalid or duplicate/,
    );
  }
});

test('source-skip publication requires the original expectedStatus proof', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  writeOriginalRunnerEvidence(root, outcomes);
  stage();
  const file = path.join(entry.path, 'original-runners/runtime/evidence.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const row = manifest.cases.find(row => row.evidencePolicy === 'source-skip');
  row.expectedStatus = 'passed';
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(
    () => prepareOriginalRunnerPublication(entry, env),
    /Invalid or duplicate/,
  );
  delete row.expectedStatus;
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(
    () =>
      prepareOriginalRunnerPublication(entry, { ...env, GITHUB_RUN_ID: '124' }),
    /Invalid or duplicate/,
  );
});

test('retained same-title input and textarea descriptors are matched inside the correct group', t => {
  const { root } = fixture(t);
  const sources = retainedCatalog.sources.filter(source =>
    source.title === 'attribute-disabled'
  );
  assert.equal(sources.length, 2);
  const report = {
    errors: [],
    suites: [{
      title: retainedCatalog.file,
      suites: [{
        title: retainedCatalog.suite,
        suites: sources.map(source => ({
          title: source.group,
          specs: [{
            title: source.title,
            file: source.file,
            line: 1,
            tests: [{
              projectName: 'chromium',
              expectedStatus: 'passed',
              status: 'skipped',
              results: [],
            }],
          }],
        })),
      }],
    }],
  };
  const result = retainedInputEvidence(report, root);
  for (const source of sources) {
    const row = result.cases.find(row =>
      row.source === source.key && row.browser === 'chromium'
    );
    assert.equal(row.line, 1);
    assert.equal(row.sourceId, source.sourceId);
  }
  report.suites[0].suites[0].suites[0].title = 'x-text';
  assert.throws(
    () => retainedInputEvidence(report, root),
    /Unexpected retained source/,
  );
});

function earlyReturnResult(root) {
  const file = path.join(
    root,
    'web-elements/midscene-original-results/bulk-elements/report.json',
  );
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const descriptor = originalRunnerCatalog.find(runner =>
    runner.id === 'bulk-elements'
  ).sources.find(source => source.earlyReturnBrowsers.length);
  let item;
  function visit(suite) {
    for (const spec of suite.specs ?? []) {
      if (spec.title === descriptor.title) {
        item = spec.tests.find(test => test.projectName === 'webkit');
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  report.suites.forEach(visit);
  return { file, report, item, descriptor };
}

test('actual passed early-return branch is not applicable, with real HTML and optional screenshot', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  const { file, report, item } = earlyReturnResult(root);
  item.results[0].attachments = [];
  writeFileSync(file, JSON.stringify(report));
  assert.equal(writeOriginalRunnerEvidence(root, outcomes), 0);
  stage();
  const supplemental = prepareOriginalRunnerPublication(entry, env);
  const returned = supplemental.cases.filter(row =>
    row.status === 'not-applicable'
  );
  assert.equal(returned.length, 1);
  assert.equal(returned[0].evidencePolicy, 'source-return');
  assert.equal(returned[0].previewPath, null);
  assert.ok(returned[0].reportPath);
  assert.match(returned[0].reason, /returned before assertions/);
  assert.doesNotThrow(() => validateSupplementalEvidence(supplemental));
  assert.equal(
    supplemental.cases.filter(row => row.status === 'success').length,
    1596,
  );
});

test('early-return allowlist never conceals flaky, failed, missing or HTML-less outcomes', t => {
  for (const outcome of ['flaky', 'failed', 'missing', 'missing-html']) {
    const { root, outcomes, stage, entry, env } = fixture(t);
    const { file, report, item, descriptor } = earlyReturnResult(root);
    if (outcome === 'flaky') item.status = 'flaky';
    if (outcome === 'failed') {
      item.status = 'unexpected';
      item.results[0].status = 'failed';
    }
    if (outcome === 'missing') {
      item.status = 'skipped';
      item.results = [];
    }
    if (outcome === 'missing-html') {
      rmSync(
        path.join(
          root,
          'web-elements/midscene-original-results/bulk-elements/html/index.html',
        ),
      );
    }
    writeFileSync(file, JSON.stringify(report));
    assert.equal(
      writeOriginalRunnerEvidence(root, outcomes),
      outcome === 'flaky' ? 0 : 1,
    );
    stage();
    const supplemental = prepareOriginalRunnerPublication(entry, env);
    const row = supplemental.cases.find(row =>
      row.name === `${descriptor.key} (component)` && row.platform === 'webkit'
    );
    assert.equal(row.evidencePolicy, 'ui');
    assert.equal(
      row.status,
      outcome === 'flaky'
        ? 'flaky'
        : outcome === 'missing'
        ? 'not-run'
        : 'failed',
    );
    assert.equal(
      supplemental.cases.filter(row => row.status === 'not-applicable').length,
      0,
    );
  }
});

test('publisher rejects a forged source-return exemption for an unlisted browser', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  writeOriginalRunnerEvidence(root, outcomes);
  stage();
  const file = path.join(
    entry.path,
    'original-runners/bulk-elements/evidence.json',
  );
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const returned = manifest.cases.find(row =>
    row.evidencePolicy === 'source-return'
  );
  const chromium = manifest.cases.find(row =>
    row.source === returned.source && row.browser === 'chromium'
  );
  chromium.evidencePolicy = 'source-return';
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(
    () => prepareOriginalRunnerPublication(entry, env),
    /Invalid or duplicate/,
  );
});

test('old attempts are never used, and a different runner manifest is rejected', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  writeOriginalRunnerEvidence(root, outcomes);
  stage();
  const stale = prepareOriginalRunnerPublication({ ...entry, attempt: 0 }, env);
  assert.ok(
    stale.cases.every(row => row.status === 'not-run' && !row.previewPath),
  );
  const file = path.join(
    entry.path,
    'original-runners/keyboard-ssr/evidence.json',
  );
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.runnerId = 'keyboard-csr';
  writeFileSync(file, JSON.stringify(manifest));
  assert.throws(
    () => prepareOriginalRunnerPublication(entry, env),
    /Invalid retained/,
  );
});

test('catalog rejects misrouted source files and missing producer dispositions', t => {
  const { root, outcomes } = fixture(t);
  delete outcomes['list-api'];
  assert.throws(
    () => writeOriginalRunnerEvidence(root, outcomes),
    /complete catalog/,
  );
  const runner = originalRunnerCatalog.find(item => item.id === 'keyboard-csr');
  const directory = path.join(
    root,
    runner.package,
    'midscene-original-results',
    runner.id,
  );
  const report = JSON.parse(
    readFileSync(path.join(directory, 'report.json'), 'utf8'),
  );
  report.suites[0].suites[0].suites[0].specs[0].file =
    'tests/unexpected.spec.ts';
  assert.throws(
    () => retainedInputEvidence(report, directory, runner),
    /Unexpected retained source/,
  );
});

test('new and existing original evidence share one validated two-section Summary without duplicate identities', async t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  writeOriginalRunnerEvidence(root, outcomes);
  stage();
  const existing = prepareOriginalRunnerPublication(entry, env);
  const retained = await prepareRetainedPublication(entry, env);
  const combined = mergeOriginalEvidence(retained.supplemental, existing);
  assert.equal(combined.sourceCount, 701 + catalogSourceCount(retainedCatalog));
  assert.equal(combined.expectedCount, 1835 + retainedCatalog.keys.length * 3);
  assert.doesNotThrow(() => validateSupplementalEvidence(combined));
  const summary = renderSummary({
    title: 'Combined original evidence',
    runUrl: 'https://github.com/example/project/actions/runs/123',
    pagesUrl: 'https://example.github.io/project/',
    entries: [],
    supplementalEvidence: combined,
  });
  assert.equal((summary.match(/<details>/g) ?? []).length, 1);
  assert.equal((summary.match(/<img /g) ?? []).length, 1596);
  assert.ok(
    summary.includes(
      `${combined.sourceCount} source cases / ${combined.expectedCount} browser cases`,
    ),
  );
});

test('a WebKit keyboard retry stays flaky, uses its final screenshot and appears before the passed appendix', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  const directory = path.join(
    root,
    'web-core-e2e/midscene-original-results/keyboard-csr',
  );
  const file = path.join(directory, 'report.json');
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const spec =
    report.suites[0].suites[0].suites.find(suite =>
      suite.specs[0].title === 'basic-global-bindkeydown-key'
    ).specs[0];
  const item = spec.tests.find(item => item.projectName === 'webkit');
  const final = item.results[0];
  final.retry = 1;
  const oldImage = path.join(directory, 'results/old-failed.png');
  writeFileSync(oldImage, 'failed attempt screenshot');
  item.results = [{
    retry: 0,
    status: 'failed',
    duration: 5000,
    attachments: [{
      name: 'screenshot',
      contentType: 'image/png',
      path: oldImage,
    }],
  }, final];
  item.status = 'flaky';
  writeFileSync(file, JSON.stringify(report));
  assert.equal(
    writeOriginalRunnerEvidence(root, outcomes),
    0,
    'Preserve the original successful retry policy',
  );
  stage();
  const supplemental = prepareOriginalRunnerPublication(entry, env);
  const flaky = supplemental.cases.find(row => row.status === 'flaky');
  assert.equal(flaky.platform, 'webkit');
  assert.match(flaky.name, /basic-global-bindkeydown-key \(CSR\)$/);
  assert.match(flaky.previewPath, /\/p\/[a-f0-9]{64}\.png$/);
  const preview = readFileSync(
    path.join(root, 'midscene-publication/site', flaky.previewPath),
  );
  assert.deepEqual(preview, readFileSync(final.attachments[0].path));
  assert.notDeepEqual(preview, readFileSync(oldImage));
  assert.equal(flaky.durationMs, 10);
  const summary = renderSummary({
    title: 'Original retry evidence',
    runUrl: 'https://github.com/example/project/actions/runs/123',
    pagesUrl: 'https://example.github.io/project/',
    entries: [],
    supplementalEvidence: supplemental,
  });
  assert.match(summary, /1 need attention · 1595 passed/);
  assert.ok(
    summary.indexOf('basic-global-bindkeydown-key (CSR)')
      < summary.indexOf('<details>'),
  );
  assert.doesNotMatch(summary, /old-failed/);
});
