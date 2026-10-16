import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  publicationArguments,
  prepareRetainedPublication,
  selectReport,
} from './publish-report.mjs';

test('retained publication never borrows missing or older attempt evidence', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'retained-selection-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const env = {
    RUNNER_TEMP: directory,
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '2',
    REPORT_LINKS_PUBLISHED: 'false',
  };
  for (const attempt of [1, 2, null]) {
    const result = await prepareRetainedPublication({
      path: directory,
      attempt,
    }, env);
    assert.equal(result.hasAttention, true);
    assert.equal(result.supplemental.sourceCount, 14);
    assert.equal(result.supplemental.cases.length, 42);
    assert.ok(
      result.supplemental.cases.every(row =>
        row.status === 'not-run' && !row.previewPath && !row.reportPath
      ),
    );
    assert.equal(result.supplemental.errors.length, 1);
  }
  await assert.rejects(
    prepareRetainedPublication({ path: directory, attempt: 2 }, {
      ...env,
      GITHUB_RUN_ID: '../123',
    }),
    /identity/,
  );
});

test('unpublished fallback cannot emit Pages URLs or hide case rows', () => {
  const env = {
    RUNNER_TEMP: '/tmp/report-test',
    RUN_URL: 'https://github.com/example/repo/actions/runs/123',
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '2',
  };
  const entries = [{
    label: 'Web',
    path: '/tmp/report-test/source',
    result: 'success',
    artifact: 'midscene-ai-e2e-web-2',
  }];
  const fallback = publicationArguments(entries, {
    ...env,
    REPORT_LINKS_PUBLISHED: 'false',
    PAGES_URL: 'https://unused.example',
  });
  assert.ok(fallback.includes('--links-published'));
  assert.equal(fallback[fallback.indexOf('--links-published') + 1], 'false');
  assert.ok(!fallback.includes('--pages-url'));
  assert.ok(!fallback.includes('https://unused.example'));
  assert.ok(!fallback.includes('--job-summary-only'));
  assert.ok(fallback.includes('Web=midscene-ai-e2e-web-2'));
  assert.throws(
    () => publicationArguments(entries, env),
    /require a Pages URL/,
  );
  assert.throws(
    () =>
      publicationArguments(entries, { ...env, REPORT_LINKS_PUBLISHED: 'typo' }),
    /Invalid/,
  );
  const published = publicationArguments(entries, {
    ...env,
    PAGES_URL: 'https://pages.example',
  });
  assert.equal(
    published[published.indexOf('--pages-url') + 1],
    'https://pages.example',
  );
  const withOriginals = publicationArguments(entries, {
    ...env,
    REPORT_LINKS_PUBLISHED: 'false',
  }, '/tmp/report-test/retained.json');
  assert.equal(
    withOriginals[withOriginals.indexOf('--supplemental-evidence') + 1],
    '/tmp/report-test/retained.json',
  );
});

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'midscene-report-artifacts-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const stage = async (
    attempt,
    result,
    names = ['case-a', 'case-b'],
    sha = 'current',
    status = 'success',
  ) => {
    const path = join(
      directory,
      'midscene-ai-e2e-web-' + attempt,
      'attempt-' + attempt,
    );
    await mkdir(path, { recursive: true });
    await writeFile(
      join(path, 'result.json'),
      JSON.stringify({ attempt, result, sha }),
    );
    if (names) {
      await writeFile(
        join(path, 'report.html'),
        '<script type="midscene_test_run_dump">' + JSON.stringify({
          kind: 'test-runner',
          schemaVersion: 1,
          projects: [{
            documents: [{ cases: names.map(name => ({ name, status })) }],
          }],
        }) + '</script>',
      );
    }
  };
  const select = (attempt = 10, producer = 'success') =>
    selectReport(directory, 'current', attempt, ['case-a', 'case-b'], producer);
  return { directory, stage, select };
}

test('single-report publication selects the latest numeric attempt, never a future attempt', async t => {
  const f = await fixture(t);
  await f.stage(1, 'success');
  await f.stage(2, 'failure');
  await f.stage(10, 'success');
  assert.match((await f.select()).artifact, /-10$/);
  assert.equal((await f.select(2)).result, 'failure');
  assert.match((await f.select(1)).artifact, /-1$/);
  assert.equal((await f.select(10, 'failure')).result, 'failure');
});

test('missing and failed reports cannot become a stale successful publication', async t => {
  const f = await fixture(t);
  await assert.rejects(f.select(), /no report artifact/);
  assert.equal((await f.select(1, 'failure')).result, 'failure');
  await f.stage(1, 'success');
  // A failed rerun whose artifact upload failed must not inherit a green result.
  assert.equal((await f.select(2, 'failure')).result, 'failure');
  await f.stage(2, 'failure', null);
  assert.equal((await f.select(2)).result, 'failure');
});

test('single-artifact flattened downloads preserve complete report evidence and identity', async t => {
  const f = await fixture(t);
  await f.stage(1, 'success');
  await rename(
    join(f.directory, 'midscene-ai-e2e-web-1', 'attempt-1'),
    join(f.directory, 'attempt-1'),
  );
  await rm(join(f.directory, 'midscene-ai-e2e-web-1'), { recursive: true });
  const result = await f.select(1);
  assert.equal(result.path, join(f.directory, 'attempt-1'));
  assert.equal(result.artifact, 'midscene-ai-e2e-web-1');
  assert.equal(result.result, 'success');
  await writeFile(
    join(result.path, 'result.json'),
    JSON.stringify({ attempt: 1, sha: 'wrong', result: 'success' }),
  );
  await assert.rejects(f.select(1), /revision/);
});

test('flattened and wrapped copies of an attempt are rejected as ambiguous', async t => {
  const f = await fixture(t);
  await f.stage(1, 'success');
  await mkdir(join(f.directory, 'attempt-1'));
  await assert.rejects(f.select(1), /Ambiguous/);
});

test('successful reports require exact complete unique source coverage and successful cases', async t => {
  const f = await fixture(t);
  for (
    const names of [[], ['case-a'], ['case-a', 'case-a'], ['case-a', 'extra']]
  ) {
    await f.stage(1, 'success', names);
    await assert.rejects(f.select(1), /coverage/);
  }
  await f.stage(1, 'success', ['case-a', 'case-b'], 'current', 'failed');
  await assert.rejects(f.select(1), /coverage/);
  await f.stage(1, 'success', ['case-a', 'case-b'], 'old');
  await assert.rejects(f.select(1), /revision/);
  await assert.rejects(f.select(0), /identity/);
});
