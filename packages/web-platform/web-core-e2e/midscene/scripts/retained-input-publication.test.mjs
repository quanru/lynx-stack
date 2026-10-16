import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  retainedInputBrowsers,
  retainedInputSelections,
} from './retained-input-selection.mjs';
import { writeRetainedInputEvidence } from './write-retained-input-evidence.mjs';
import { publishRetainedInputs } from './publish-retained-inputs.mjs';
import {
  renderSummary,
  validateSupplementalEvidence,
} from './render-ci-summary.mjs';

test('producer and publisher output is accepted by the shared two-section renderer', t => {
  const { root, options } = fixture(t);
  assert.equal(writeRetainedInputEvidence(root, 'success').exitCode, 0);
  const published = publishRetainedInputs({
    ...options,
    artifact: 'midscene-ai-e2e-web-1',
  });
  assert.doesNotThrow(() =>
    validateSupplementalEvidence(published.supplemental)
  );
  const summary = renderSummary({
    title: 'Combined evidence',
    runUrl: 'https://github.com/example/project/actions/runs/123',
    pagesUrl: options.publicBaseUrl,
    entries: [],
    supplementalEvidence: published.supplemental,
  });
  assert.match(summary, /0 need attention · 102 passed/);
  assert.match(summary, /33 source cases \/ 102 browser cases/);
  assert.equal((summary.match(/<details>/g) ?? []).length, 1);
  assert.equal((summary.match(/<img /g) ?? []).length, 102);
  assert.equal((summary.match(/\[Open report\]/g) ?? []).length, 102);
  assert.doesNotMatch(summary, /runner-step=/);
});

function fixture(t) {
  const sandbox = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), 'retained-publish-')),
  );
  t.after(() => rmSync(sandbox, { recursive: true, force: true }));
  const root = path.join(sandbox, 'retained-inputs');
  mkdirSync(path.join(root, 'html'), { recursive: true });
  mkdirSync(path.join(root, 'results'));
  writeFileSync(
    path.join(root, 'html/index.html'),
    '<html>Original runner report</html>',
  );
  let index = 0;
  const report = {
    errors: [],
    suites: [{
      title: 'tests/web-elements.spec.ts',
      suites: [{
        title: 'web-elements test suite',
        suites: Object.entries(retainedInputSelections).map((
          [title, names],
        ) => ({
          title,
          specs: names.map(name => ({
            title: name,
            file: 'tests/web-elements.spec.ts',
            line: 2846 + index++,
            tests: retainedInputBrowsers.map(projectName => {
              const image = path.join(
                root,
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
                  attachments: [{
                    name: 'screenshot',
                    contentType: 'image/png',
                    path: image,
                  }],
                }],
              };
            }),
          })),
        })),
      }],
    }],
  };
  const writeReport = () =>
    writeFileSync(path.join(root, 'report.json'), JSON.stringify(report));
  writeReport();
  const options = {
    evidenceRoot: root,
    destination: path.join(sandbox, 'site'),
    sitePrefix: 'runs/123-1/retained-inputs',
    publicBaseUrl: 'https://example.github.io/project/',
  };
  return { root, sandbox, report, writeReport, options };
}

test('producer success requires all 102 final screenshots and HTML, publishing real copied links', t => {
  const { root, options } = fixture(t);
  const result = writeRetainedInputEvidence(root, 'success');
  assert.equal(result.exitCode, 0);
  assert.equal(result.manifest.evidenceComplete, true);
  const published = publishRetainedInputs(options);
  assert.equal(published.passed, 102);
  assert.equal(published.needsAttention, 0);
  assert.equal(published.cases.length, 102);
  assert.equal((published.summary.match(/<img /g) ?? []).length, 102);
  assert.match(published.summary, /<details>/);
  assert.match(
    published.summary,
    /https:\/\/example.github.io\/project\/runs\/123-1\/retained-inputs\/html\/index.html/,
  );
  for (const row of published.cases) {
    assert.ok(existsSync(path.join(options.destination, row.report)));
    for (const image of row.screenshots) {
      assert.ok(existsSync(path.join(options.destination, image)));
    }
  }
  assert.equal(
    existsSync(path.join(options.destination, 'report.json')),
    false,
  );
  assert.throws(() => publishRetainedInputs(options), /already exists/);
});

test('missing producer report writes 102 not-run rows and exits nonzero without invented passes', t => {
  const { root } = fixture(t);
  rmSync(path.join(root, 'report.json'));
  const result = writeRetainedInputEvidence(root, 'success');
  assert.equal(result.exitCode, 1);
  const saved = JSON.parse(
    readFileSync(path.join(root, 'evidence.json'), 'utf8'),
  );
  assert.equal(saved.runnerErrorCount, 1);
  assert.ok(
    saved.cases.every(row =>
      row.status === 'not-run' && row.screenshots.length === 0
    ),
  );
  assert.equal(saved.cases.length, 102);
});

test('producer failure, missing screenshot, missing HTML and failed final attempts cannot green', t => {
  const { root, report, writeReport } = fixture(t);
  assert.equal(writeRetainedInputEvidence(root, 'failure').exitCode, 1);
  const item = report.suites[0].suites[0].suites[0].specs[0].tests[0];
  item.results[0].status = 'failed';
  item.status = 'unexpected';
  writeReport();
  assert.equal(writeRetainedInputEvidence(root, 'success').exitCode, 1);
  item.results[0].status = 'passed';
  item.status = 'expected';
  writeReport();
  rmSync(item.results[0].attachments[0].path);
  assert.equal(writeRetainedInputEvidence(root, 'success').exitCode, 1);
  writeFileSync(item.results[0].attachments[0].path, 'synthetic screenshot');
  rmSync(path.join(root, 'html/index.html'));
  assert.equal(writeRetainedInputEvidence(root, 'success').exitCode, 1);
});

test('publication does not manufacture missing links or borrow a previous attempt', t => {
  const { root, options } = fixture(t);
  const { manifest } = writeRetainedInputEvidence(root, 'success');
  rmSync(path.join(root, manifest.cases[0].screenshots[0]));
  rmSync(path.join(root, 'html/index.html'));
  const published = publishRetainedInputs(options);
  assert.deepEqual(published.cases[0].screenshots, []);
  assert.equal(published.cases[0].report, null);
  assert.equal(published.passed, 0);
  assert.equal(published.needsAttention, 102);
  assert.match(published.summary, /Unavailable/);
  assert.doesNotMatch(published.summary, /Open report|href=/);
});

test('publication rejects relative traversal, duplicate rows, and directory symlinks before copying', t => {
  const { root, options, sandbox } = fixture(t);
  const { manifest } = writeRetainedInputEvidence(root, 'success');
  const write = () =>
    writeFileSync(path.join(root, 'evidence.json'), JSON.stringify(manifest));
  manifest.cases[0].screenshots = ['results/../../outside.png'];
  write();
  assert.throws(() => publishRetainedInputs(options), /Unsafe/);
  manifest.cases[0].screenshots = [];
  manifest.cases[1] = manifest.cases[0];
  write();
  assert.throws(() => publishRetainedInputs(options), /duplicate/);
  assert.equal(existsSync(options.destination), false);
  writeRetainedInputEvidence(root, 'success');
  symlinkSync(sandbox, path.join(root, 'html/escape'));
  assert.throws(() => publishRetainedInputs(options), /symlink/);
  assert.equal(existsSync(options.destination), false);
});

test('producer refuses symlink input/output and never writes outside its root', t => {
  const { root, sandbox } = fixture(t);
  const outside = path.join(sandbox, 'outside.json');
  writeFileSync(outside, 'untouched');
  symlinkSync(outside, path.join(root, 'evidence.json'));
  assert.throws(() => writeRetainedInputEvidence(root, 'success'), /Unsafe/);
  assert.equal(readFileSync(outside, 'utf8'), 'untouched');
  rmSync(path.join(root, 'evidence.json'));
  rmSync(path.join(root, 'report.json'));
  symlinkSync(outside, path.join(root, 'report.json'));
  const result = writeRetainedInputEvidence(root, 'success');
  assert.equal(result.exitCode, 1);
  assert.ok(result.manifest.collectionError);
  assert.equal(readFileSync(outside, 'utf8'), 'untouched');
});

test('producer failure cannot turn 102 successful callbacks into a green overall publication', t => {
  const { root, options } = fixture(t);
  writeRetainedInputEvidence(root, 'failure');
  const published = publishRetainedInputs(options);
  assert.equal(published.passed, 102);
  assert.ok(published.cases.every(row => row.status === 'passed'));
  assert.equal(published.needsAttention, 0);
  assert.equal(published.runnerErrorCount, 0);
  assert.equal(published.producerResult, 'failure');
  assert.equal(published.evidenceComplete, false);
  assert.equal(published.infrastructureErrorCount, 2);
  assert.equal(published.hasAttention, true);
  assert.match(published.summary, /⚠️/);
  assert.doesNotMatch(published.summary, /✅/);
  assert.match(published.summary, /producer failed/);
});

test('incomplete evidence is independent attention even when JSON and producer succeeded', t => {
  const { root, options } = fixture(t);
  const { manifest } = writeRetainedInputEvidence(root, 'success');
  manifest.evidenceComplete = false;
  writeFileSync(path.join(root, 'evidence.json'), JSON.stringify(manifest));
  const published = publishRetainedInputs(options);
  assert.equal(published.passed, 102);
  assert.equal(published.infrastructureErrorCount, 1);
  assert.equal(published.hasAttention, true);
  assert.match(published.summary, /⚠️/);
  assert.doesNotMatch(published.summary, /✅/);
});

test('publisher requires explicit typed producer disposition and evidence completeness', t => {
  const { root, options } = fixture(t);
  const { manifest } = writeRetainedInputEvidence(root, 'success');
  for (
    const [field, values] of [
      ['producerResult', [undefined, null, true, 'pending']],
      ['evidenceComplete', [undefined, null, 'false', 1]],
    ]
  ) {
    for (const value of values) {
      writeFileSync(
        path.join(root, 'evidence.json'),
        JSON.stringify({ ...manifest, [field]: value }),
      );
      assert.throws(() => publishRetainedInputs(options), /Invalid retained/);
      assert.equal(existsSync(options.destination), false);
    }
  }
});

test('producer rejects symlink ancestors and accepts an explicitly canonicalized root', t => {
  const { root, sandbox } = fixture(t);
  const alias = path.join(sandbox, 'alias');
  symlinkSync(root, alias);
  const nested = path.join(root, 'nested');
  mkdirSync(nested);
  const aliasedNested = path.join(alias, 'nested');
  assert.throws(
    () => writeRetainedInputEvidence(aliasedNested, 'failure'),
    /symlink ancestor/,
  );
  assert.equal(existsSync(path.join(nested, 'evidence.json')), false);
  const result = writeRetainedInputEvidence(
    realpathSync(aliasedNested),
    'failure',
  );
  assert.equal(result.exitCode, 1);
  assert.equal(result.manifest.cases.length, 102);
  assert.ok(existsSync(path.join(nested, 'evidence.json')));
});

test('supplemental evidence uses verified site-relative paths, one preview and final duration', t => {
  const { root, options, report, writeReport } = fixture(t);
  const first = report.suites[0].suites[0].suites[0].specs[0].tests[0];
  const original = first.results[0];
  original.duration = 999;
  first.status = 'flaky';
  original.status = 'failed';
  first.results.push({
    ...original,
    retry: 1,
    status: 'passed',
    duration: 123.5,
    attachments: [
      original.attachments[0],
      report.suites[0].suites[0].suites[0].specs[0].tests[1].results[0]
        .attachments[0],
    ],
  });
  writeReport();
  writeRetainedInputEvidence(root, 'success');
  const { supplemental } = publishRetainedInputs({
    ...options,
    artifact: 'midscene-ai-e2e-web-1',
  });
  assert.equal(supplemental.label, 'Original input contracts');
  assert.equal(supplemental.sourceCount, 33);
  assert.equal(supplemental.expectedCount, 102);
  assert.deepEqual(supplemental.errors, []);
  const row = supplemental.cases[0];
  assert.equal(row.platform, 'chromium');
  assert.equal(row.name, 'x-input/type-value-do-not-show-input');
  assert.equal(row.status, 'flaky');
  assert.equal(row.durationMs, 123.5);
  const digest = createHash('sha256').update('synthetic screenshot').digest(
    'hex',
  );
  assert.equal(row.previewPath, `${options.sitePrefix}/p/${digest}.png`);
  assert.equal(
    new Set(supplemental.cases.map(item => item.previewPath)).size,
    1,
  );
  assert.deepEqual(
    readFileSync(path.join(options.destination, 'p', `${digest}.png`)),
    readFileSync(path.join(root, 'results/1-chromium.png')),
  );
  assert.ok(
    existsSync(path.join(options.destination, 'results/1-chromium.png')),
  );
  assert.equal(row.reportPath, `${options.sitePrefix}/html/index.html`);
  assert.equal(row.artifact, 'midscene-ai-e2e-web-1');
  assert.equal(supplemental.cases[1].status, 'success');
  assert.equal(supplemental.cases[1].durationMs, null);
  for (const item of supplemental.cases) {
    for (const value of [item.previewPath, item.reportPath].filter(Boolean)) {
      assert.equal(path.isAbsolute(value), false);
      assert.doesNotMatch(value, /^https?:/);
    }
  }
});

test('without Pages supplemental paths remain local and candidate summary has no invented URLs', t => {
  const { root, options } = fixture(t);
  writeRetainedInputEvidence(root, 'success');
  const result = publishRetainedInputs({
    ...options,
    publicBaseUrl: undefined,
    artifact: 'original-results-1',
  });
  assert.match(result.summary, /Not published/);
  assert.doesNotMatch(result.summary, /https?:|href=|src=/);
  assert.ok(
    result.supplemental.cases.every(row =>
      row.artifact === 'original-results-1' && row.previewPath && row.reportPath
    ),
  );
});

test('supplemental errors preserve producer failure and missing evidence prevents success', t => {
  const { root, options } = fixture(t);
  const { manifest } = writeRetainedInputEvidence(root, 'failure');
  rmSync(path.join(root, manifest.cases[0].screenshots[0]));
  rmSync(path.join(root, 'html/index.html'));
  const { supplemental } = publishRetainedInputs(options);
  assert.match(supplemental.errors.join(' '), /producer failed/);
  assert.match(supplemental.errors.join(' '), /incomplete/);
  assert.ok(supplemental.cases.every(row => row.status === 'failed'));
  assert.equal(supplemental.cases[0].previewPath, null);
  assert.equal(supplemental.cases[0].reportPath, null);
  assert.match(
    supplemental.cases[0].reason,
    /screenshot unavailable.*HTML report unavailable/,
  );
});
