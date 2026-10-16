import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  cpSync,
  existsSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { retainedInputEvidence } from './retained-input-evidence.mjs';

test('convert before upload; relative manifest survives a publication-root relocation', t => {
  const { root, report } = fixture(t);
  const manifest = retainedInputEvidence(report, root);
  const published = mkdtempSync(path.join(os.tmpdir(), 'retained-published-'));
  t.after(() => rmSync(published, { recursive: true, force: true }));
  cpSync(root, published, { recursive: true });
  assert.throws(() => retainedInputEvidence(report, published), /escapes/);
  assert.ok(!JSON.stringify(manifest).includes(root));
  for (const row of JSON.parse(JSON.stringify(manifest)).cases) {
    for (const relative of [...row.screenshots, row.report].filter(Boolean)) {
      assert.equal(path.isAbsolute(relative), false);
      assert.ok(existsSync(path.join(published, relative)));
    }
  }
});

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'retained-evidence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'html'));
  mkdirSync(path.join(root, 'results'));
  writeFileSync(path.join(root, 'html/index.html'), '<html>Report</html>');
  for (const name of ['old.png', 'final.png']) {
    writeFileSync(path.join(root, 'results', name), 'synthetic image');
  }
  const attachment = name => ({
    name: 'screenshot',
    contentType: 'image/png',
    path: path.join(root, 'results', name),
  });
  const item = {
    projectName: 'chromium',
    expectedStatus: 'passed',
    status: 'flaky',
    results: [
      { retry: 0, status: 'failed', attachments: [attachment('old.png')] },
      { retry: 1, status: 'passed', attachments: [attachment('final.png')] },
    ],
  };
  const report = {
    errors: [],
    suites: [{
      title: 'tests/web-elements.spec.ts',
      suites: [
        {
          title: 'web-elements test suite',
          suites: [{
            title: 'x-input',
            specs: [
              {
                title: 'type-password',
                file: 'tests/web-elements.spec.ts',
                line: 2857,
                tests: [item],
              },
            ],
          }],
        },
      ],
    }],
  };
  return {
    root,
    item,
    report,
    spec: report.suites[0].suites[0].suites[0].specs[0],
  };
}

test('source/browser manifest retains flaky outcome and only final-attempt screenshot', t => {
  const { root, report } = fixture(t);
  const manifest = retainedInputEvidence(report, root);
  assert.equal(manifest.kind, 'retained-original-input');
  assert.equal(manifest.sourceDeclarations, 14);
  assert.equal(manifest.cases.length, 42);
  const row = manifest.cases.find(row =>
    row.source === 'x-input/type-password' && row.browser === 'chromium'
  );
  assert.equal(row.status, 'passed');
  assert.equal(row.outcome, 'flaky');
  assert.equal(row.retry, 1);
  assert.deepEqual(row.screenshots, ['results/final.png']);
  assert.equal(row.report, 'html/index.html');
  assert.equal(
    manifest.cases.filter(row => row.status === 'not-run').length,
    41,
  );
});

test('duration uses only a finite nonnegative final-attempt value, never an earlier retry', t => {
  const { root, report, item } = fixture(t);
  item.results[0].duration = 999;
  for (
    const duration of [0, 125.5, undefined, null, -1, Infinity, NaN, '123']
  ) {
    item.results[1].duration = duration;
    const row = retainedInputEvidence(report, root).cases.find(row =>
      row.retry === 1
    );
    assert.equal(
      row.durationMs,
      typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
        ? duration
        : null,
    );
  }
  item.results = [];
  assert.ok(
    retainedInputEvidence(report, root).cases.every(row =>
      row.durationMs === null
    ),
  );
});

test('missing final screenshot never borrows previous evidence; absent HTML has no link', t => {
  const { root, report, item } = fixture(t);
  item.results[1].attachments[0].path = 'results/missing.png';
  rmSync(path.join(root, 'html/index.html'));
  const row = retainedInputEvidence(report, root).cases.find(row =>
    row.retry === 1
  );
  assert.deepEqual(row.screenshots, []);
  assert.ok(row.screenshotUnavailable);
  assert.equal(row.report, null);
  assert.ok(row.reportUnavailable);
});

test('every final status stays separate from missing and runner errors', t => {
  const { root, report, item } = fixture(t);
  report.errors.push({ message: 'runner error' });
  for (
    const status of ['passed', 'failed', 'timedOut', 'skipped', 'interrupted']
  ) {
    item.results[1].status = status;
    item.status = status === 'passed'
      ? 'flaky'
      : status === 'skipped'
      ? 'skipped'
      : 'unexpected';
    const manifest = retainedInputEvidence(report, root);
    assert.equal(manifest.runnerErrorCount, 1);
    assert.equal(manifest.cases.find(row => row.retry === 1).status, status);
  }
  item.results = [];
  assert.equal(
    retainedInputEvidence(report, root).cases.find(row =>
      row.outcome === item.status
    ).status,
    'not-run',
  );
});

test('untrusted paths reject traversal, URLs, external files and symlinks', t => {
  const { root, report, item } = fixture(t);
  for (
    const bad of [
      '../outside.png',
      'results/../old.png',
      '/etc/hosts',
      'https://example.com/image.png',
      'results\\image.png',
    ]
  ) {
    item.results[1].attachments[0].path = bad;
    assert.throws(() => retainedInputEvidence(report, root), /path|root/);
  }
  symlinkSync(os.tmpdir(), path.join(root, 'results/outside'));
  item.results[1].attachments[0].path = 'results/outside';
  assert.throws(() => retainedInputEvidence(report, root), /symlink/);
});

test('duplicate, unknown, malformed and unordered results fail closed', t => {
  const { root, report, item, spec } = fixture(t);
  spec.tests.push(item);
  assert.throws(() => retainedInputEvidence(report, root), /Duplicate/);
  spec.tests.pop();
  item.projectName = 'custom';
  assert.throws(() => retainedInputEvidence(report, root), /browser/);
  item.projectName = 'chromium';
  item.results[1].retry = 0;
  assert.throws(() => retainedInputEvidence(report, root), /sequence/);
  item.results[1].retry = 1;
  spec.title = 'unknown';
  assert.throws(() => retainedInputEvidence(report, root), /source/);
  assert.throws(() => retainedInputEvidence({}, root), /complete/);
});
