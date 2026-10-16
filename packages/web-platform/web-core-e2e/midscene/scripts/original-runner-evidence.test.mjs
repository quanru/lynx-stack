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

test('six existing commands keep exact sources, grep, profiles and mode; no additional test invocation', () => {
  assert.equal(originalRunnerSourceCount, 26);
  assert.equal(
    originalRunnerCatalog.reduce(
      (sum, row) => sum + row.keys.length * row.browsers.length,
      0,
    ),
    105,
  );
  assert.equal(
    steps.filter(step => step.run?.includes('pnpm exec playwright test'))
      .length,
    14,
  );
  for (const runner of originalRunnerCatalog) {
    const matches = steps.filter(step => step.name === runner.stepName);
    assert.equal(matches.length, 1);
    const step = matches[0];
    assert.equal(step.id, `original-${runner.id}`);
    assert.equal(step.if, undefined);
    assert.equal(
      step['working-directory'],
      `packages/web-platform/${runner.package}`,
    );
    assert.equal(step.env.ORIGINAL_EVIDENCE_RUNNER, runner.id);
    if (runner.package === 'web-core-e2e') {
      assert.equal(step.env.ENABLE_SSR, runner.mode === 'SSR' ? '1' : '');
    } else assert.equal(step.env.PORT, '3081');
    assert.equal(
      step.run,
      `pnpm exec playwright test ${runner.file} --project chromium --project firefox --project webkit --workers=2${
        runner.grep ? ` --grep '${runner.grep}'` : ''
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
      return {
        title: descriptor?.suite ?? (descriptor ? descriptor.file : group),
        specs: [{
          title: descriptor?.title ?? name,
          file: descriptor?.file ?? runner.file,
          line: index + 1,
          tests: runner.browsers.map(projectName => {
            const image = path.join(
              directory,
              'results',
              `${index}-${projectName}.png`,
            );
            writeFileSync(image, 'synthetic screenshot');
            return {
              projectName,
              expectedStatus: 'passed',
              status: 'expected',
              results: [{
                retry: 0,
                status: 'passed',
                duration: 10,
                attachments: [{
                  name: 'screenshot',
                  contentType: 'image/png',
                  path: image,
                }],
              }],
            };
          }),
        }],
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

test('all six producer manifests publish 105 unique mode-aware rows and 26 deduplicated sources', t => {
  const { root, outcomes, stage, entry, env } = fixture(t);
  assert.equal(writeOriginalRunnerEvidence(root, outcomes), 0);
  stage();
  const result = prepareOriginalRunnerPublication(entry, env);
  assert.equal(result.sourceCount, 26);
  assert.equal(result.expectedCount, 105);
  assert.equal(result.cases.length, 105);
  assert.equal(
    new Set(result.cases.map(row => `${row.platform}/${row.name}`)).size,
    105,
  );
  assert.deepEqual(result.errors, []);
  assert.ok(
    result.cases.every(row =>
      row.status === 'success' && row.previewPath && row.reportPath
      && row.durationMs === 10
    ),
  );
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
  assert.equal(result.cases.filter(row => row.status === 'success').length, 87);
  assert.match(result.errors.join(' '), /keyboard-ssr.*skipped/);
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
  const runner = originalRunnerCatalog[0];
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
  assert.equal(combined.sourceCount, 26 + retainedCatalog.keys.length);
  assert.equal(combined.expectedCount, 105 + retainedCatalog.keys.length * 3);
  assert.doesNotThrow(() => validateSupplementalEvidence(combined));
  const summary = renderSummary({
    title: 'Combined original evidence',
    runUrl: 'https://github.com/example/project/actions/runs/123',
    pagesUrl: 'https://example.github.io/project/',
    entries: [],
    supplementalEvidence: combined,
  });
  assert.equal((summary.match(/<details>/g) ?? []).length, 1);
  assert.equal((summary.match(/<img /g) ?? []).length, 105);
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
  assert.ok(flaky.previewPath.endsWith('/2-webkit.png'));
  assert.equal(flaky.durationMs, 10);
  const summary = renderSummary({
    title: 'Original retry evidence',
    runUrl: 'https://github.com/example/project/actions/runs/123',
    pagesUrl: 'https://example.github.io/project/',
    entries: [],
    supplementalEvidence: supplemental,
  });
  assert.match(summary, /1 need attention · 104 passed/);
  assert.ok(
    summary.indexOf('basic-global-bindkeydown-key (CSR)')
      < summary.indexOf('<details>'),
  );
  assert.doesNotMatch(summary, /old-failed/);
});
