import assert from 'node:assert/strict';
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

test('producer success requires all 42 final screenshots and HTML, publishing real copied links', t => {
  const { root, options } = fixture(t);
  const result = writeRetainedInputEvidence(root, 'success');
  assert.equal(result.exitCode, 0);
  assert.equal(result.manifest.evidenceComplete, true);
  const published = publishRetainedInputs(options);
  assert.equal(published.passed, 42);
  assert.equal(published.needsAttention, 0);
  assert.equal(published.cases.length, 42);
  assert.equal((published.summary.match(/<img /g) ?? []).length, 42);
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

test('missing producer report writes 42 not-run rows and exits nonzero without invented passes', t => {
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
  assert.equal(saved.cases.length, 42);
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
  assert.equal(published.needsAttention, 42);
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

test('producer failure cannot turn 42 successful callbacks into a green overall publication', t => {
  const { root, options } = fixture(t);
  writeRetainedInputEvidence(root, 'failure');
  const published = publishRetainedInputs(options);
  assert.equal(published.passed, 42);
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
  assert.equal(published.passed, 42);
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
  assert.equal(result.manifest.cases.length, 42);
  assert.ok(existsSync(path.join(nested, 'evidence.json')));
});
