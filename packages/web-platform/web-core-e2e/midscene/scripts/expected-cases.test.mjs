import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';
import { execFileSync } from 'node:child_process';
import {
  collectExpectedCases,
  executionIdentity,
  executionStatus,
} from './expected-cases.mjs';
import {
  loadExpectedCaseEvidence,
  renderSummary,
} from './render-ci-summary.mjs';
import {
  prepareRetainedPublication,
  publicationArguments,
  selectReport,
} from './publish-report.mjs';
import {
  prepareOriginalRunnerPublication,
  mergeOriginalEvidence,
} from './publish-original-runners.mjs';

const env = {
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '1',
};
const inventory = await collectExpectedCases(env);
async function fixture(t, outcome) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'web-expected-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    path.join(root, 'expected-cases.json'),
    JSON.stringify(inventory),
  );
  await writeFile(
    path.join(root, 'execution-status.json'),
    JSON.stringify(executionStatus(outcome, env)),
  );
  return root;
}
test('SDK collects all 487 exact case IDs across Web projects without runtime setup', () => {
  assert.equal(inventory.expectedCount, 487);
  assert.equal(new Set(inventory.cases.map(item => item.caseId)).size, 487);
  assert.equal(
    new Set(inventory.cases.map(item => item.sourcePath.split('/')[1])).size,
    4,
  );
  assert.ok(inventory.cases.every(item => /^[a-f0-9]{64}$/.test(item.caseId)));
  assert.throws(() => executionStatus('unknown', env), /outcome/);
  assert.throws(
    () => executionIdentity({ ...env, GITHUB_SHA: 'other' }),
    /exact CI/,
  );
});
test('setup failure retains all 2424 YAML and original rows without invented evidence', async t => {
  const root = await fixture(t, 'skipped');
  const fallback = await loadExpectedCaseEvidence(root, executionIdentity(env));
  assert.equal(fallback.cases.length, 487);
  assert.ok(
    fallback.cases.every(item =>
      item.status === 'not-run' && item.attempts.length === 0
    ),
  );
  const publicationEnv = {
    ...env,
    RUNNER_TEMP: root,
    REPORT_LINKS_PUBLISHED: 'false',
  };
  const entry = { path: root, attempt: 1, artifact: 'midscene-ai-e2e-web-1' };
  const retained = await prepareRetainedPublication(entry, publicationEnv);
  const supplemental = mergeOriginalEvidence(
    retained.supplemental,
    prepareOriginalRunnerPublication(entry, publicationEnv),
  );
  assert.equal(supplemental.cases.length, 1937);
  const summary = renderSummary({
    title: 'Setup failure',
    runUrl: 'https://github.com/example/repo/actions/runs/123',
    linksPublished: false,
    entries: [{ label: 'Web', result: 'failure', ...fallback }],
    supplementalEvidence: supplemental,
  });
  assert.equal(
    summary.split('\n').filter(line => line.startsWith('| Web |')).length,
    487,
  );
  assert.equal(
    summary.split('\n').filter(line =>
      /^\| (Original · )?(chromium|firefox|webkit) \|/.test(line)
    ).length,
    1937,
  );
  assert.match(summary, /Midscene YAML: 487 cases/);
  assert.doesNotMatch(summary, /<img|\[Open report\]|✅ Passed/);
});
test('validated older YAML artifact keeps its attempt identity while originals remain current-attempt strict', async t => {
  const root = await fixture(t, 'skipped');
  const selectedDirectory = path.join(root, 'attempt-1');
  await mkdir(selectedDirectory);
  for (const name of ['expected-cases.json', 'execution-status.json']) {
    await writeFile(
      path.join(selectedDirectory, name),
      await readFile(path.join(root, name)),
    );
  }
  const resultPath = path.join(selectedDirectory, 'result.json');
  const result = { sha: env.GITHUB_SHA, attempt: 1, result: 'failure' };
  await writeFile(resultPath, JSON.stringify(result));
  const select = () =>
    selectReport(
      root,
      env.GITHUB_SHA,
      2,
      inventory.cases.map(item => item.name),
      'failure',
    );
  const entry = await select();
  assert.equal(entry.attempt, 1);
  const current = {
    ...env,
    GITHUB_RUN_ATTEMPT: '2',
    RUNNER_TEMP: root,
    REPORT_LINKS_PUBLISHED: 'false',
    RUN_URL: 'https://github.com/example/repo/actions/runs/123',
  };
  const args = publicationArguments([entry], current);
  assert.equal(args[args.indexOf('--artifact-attempt') + 1], 'Web=1');
  execFileSync(process.execPath, args, {
    env: { ...process.env, ...current },
    encoding: 'utf8',
  });
  const summary = await readFile(
    path.join(root, 'midscene-publication/summary.md'),
    'utf8',
  );
  assert.equal(
    summary.split('\n').filter(line => line.startsWith('| Web |')).length,
    487,
  );
  assert.match(summary, /attempt 1/);
  assert.doesNotMatch(summary, /<img|\[Open report\]|✅ Passed/);
  const retained = await prepareRetainedPublication(entry, current);
  const originals = prepareOriginalRunnerPublication(entry, current);
  assert.equal(retained.supplemental.cases.length, 102);
  assert.equal(originals.cases.length, 1835);
  assert.ok(
    [...retained.supplemental.cases, ...originals.cases].every(item =>
      item.status === 'not-run'
    ),
  );
  for (
    const invalid of [{ ...result, sha: 'b'.repeat(40) }, {
      ...result,
      attempt: 2,
    }]
  ) {
    await writeFile(resultPath, JSON.stringify(invalid));
    await assert.rejects(select(), /Invalid report identity/);
  }
  assert.ok(
    !publicationArguments([{ ...entry, attempt: null }], current).includes(
      '--artifact-attempt',
    ),
  );
  assert.throws(
    () => publicationArguments([{ ...entry, attempt: 3 }], current),
    /Invalid selected/,
  );
});

test('runtime failure keeps real partial outcomes authoritative and rejects mismatched inventory', async t => {
  const root = await fixture(t, 'failure');
  const report = {
    dump: {
      projects: [{
        documents: [{
          cases: inventory.cases.map((item, index) => ({
            ...item,
            status: index === 0 ? 'failed' : 'not-run',
            attempts: [],
          })),
        }],
      }],
    },
  };
  const loaded = await loadExpectedCaseEvidence(
    root,
    executionIdentity(env),
    report,
  );
  assert.equal(
    loaded.cases,
    undefined,
    'Actual report outcomes must not be replaced with invented inventory outcomes',
  );
  for (const mismatch of [{ sha: 'b'.repeat(40) }, { attempt: '2' }]) {
    await assert.rejects(
      loadExpectedCaseEvidence(
        root,
        { ...executionIdentity(env), ...mismatch },
        report,
      ),
      /does not match/,
    );
  }
  const missing = await loadExpectedCaseEvidence(root, executionIdentity(env));
  assert.equal(missing.cases.length, 487);
  assert.ok(
    missing.cases.every(item =>
      item.status === 'failed'
      && item.notRunReason.includes('individual case execution is unknown')
    ),
  );
  await writeFile(
    path.join(root, 'execution-status.json'),
    JSON.stringify(executionStatus('skipped', env)),
  );
  await assert.rejects(
    loadExpectedCaseEvidence(root, executionIdentity(env), report),
    /contradicts skipped/,
  );
});
test('CI collects before model/build prerequisites and stages the same pair for both consumers', async () => {
  const workflow = YAML.parse(
    await readFile(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const steps = workflow.jobs['web-shell-ai-e2e'].steps;
  const collection = steps.findIndex(step =>
    step.run === 'node scripts/expected-cases.mjs collect'
  );
  assert.ok(
    collection
      > steps.findIndex(step =>
        step.name === 'Install Midscene test dependencies'
      ),
  );
  assert.ok(
    collection < steps.findIndex(step => step.id === 'model-compatible'),
  );
  assert.ok(
    collection
      < steps.findIndex(step => step.name === 'Preflight model endpoint'),
  );
  assert.ok(collection < steps.findIndex(step => step.id === 'build-web'));
  const stage = steps.find(step =>
    step.name === 'Stage Web report for this attempt'
  );
  assert.equal(stage.if, 'always()');
  assert.equal(stage.env.EXECUTION_OUTCOME, '${{ steps.run-cases.outcome }}');
  assert.match(stage.run, /expected-cases\.mjs status "\$EXECUTION_OUTCOME"/);
  assert.match(
    stage.run,
    /cp "\$inventory\/expected-cases.json" "\$inventory\/execution-status.json" "\$target"\//,
  );
  assert.match(
    steps.find(step => step.name === 'Add Web results to the job Summary').run,
    /--entry "Web=\$RUNNER_TEMP\/midscene-upload\/attempt-\$GITHUB_RUN_ATTEMPT"/,
  );
});
