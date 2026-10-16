import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { testRunDump } from './render-ci-summary.mjs';
import { caseNames } from './case-inventory.mjs';
import { publishRetainedInputs } from './publish-retained-inputs.mjs';
import {
  retainedCatalog,
  catalogSourceCount,
} from './original-runner-catalog.mjs';
import {
  prepareOriginalRunnerPublication,
  mergeOriginalEvidence,
} from './publish-original-runners.mjs';
import {
  retainedInputBrowsers,
  retainedInputKeys,
} from './retained-input-selection.mjs';

async function reportedCases(directory) {
  const runs = [];
  for (
    const entry of await readdir(directory, {
      recursive: true,
      withFileTypes: true,
    })
  ) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const dump = testRunDump(
      await readFile(resolve(entry.parentPath, entry.name), 'utf8'),
    );
    if (dump?.kind === 'test-runner' && dump.schemaVersion === 1) {
      runs.push(dump);
    }
  }
  const latest = runs.sort((a, b) =>
    String(a.endedAt).localeCompare(String(b.endedAt))
  ).at(-1);
  return latest?.projects.flatMap(project =>
    project.documents.flatMap(document => document.cases)
  );
}

export async function selectReport(
  directory,
  sha,
  currentAttempt,
  expectedNames,
  producerResult,
) {
  if (
    !sha || !Number.isSafeInteger(currentAttempt) || currentAttempt < 1
    || !expectedNames?.length
    || new Set(expectedNames).size !== expectedNames.length
    || !['success', 'failure', 'cancelled', 'skipped'].includes(producerResult)
  ) {
    throw new Error('Invalid publication identity or expected cases.');
  }
  const artifacts = await readdir(directory).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const prefix = 'midscene-ai-e2e-web-';
  // download-artifact v8 flattens a single match even with merge-multiple:false.
  // Multiple matches retain their artifact-name directories. Validate either
  // layout against the producer manifest; never infer success from a directory.
  const candidates = artifacts.flatMap(name => {
    const wrapped = name.startsWith(prefix);
    const suffix = wrapped
      ? name.slice(prefix.length)
      : name.startsWith('attempt-')
      ? name.slice(8)
      : '';
    if (!/^[1-9][0-9]*$/.test(suffix)) return [];
    const attempt = Number(suffix);
    if (!Number.isSafeInteger(attempt) || attempt > currentAttempt) return [];
    return [{
      attempt,
      artifact: prefix + attempt,
      path: wrapped
        ? resolve(directory, name, `attempt-${attempt}`)
        : resolve(directory, name),
    }];
  });
  if (
    new Set(candidates.map(item => item.attempt)).size !== candidates.length
  ) {
    throw new Error('Ambiguous report layouts for the same attempt.');
  }
  const selected = candidates.sort((a, b) => a.attempt - b.attempt).at(-1);
  if (!selected) {
    if (producerResult === 'success') {
      throw new Error('Successful producer has no report artifact.');
    }
    return {
      label: 'Web',
      path: resolve(directory, 'missing'),
      result: 'failure',
      artifact: prefix + 'missing',
      attempt: null,
    };
  }
  const { attempt, artifact, path } = selected;
  const result = JSON.parse(
    await readFile(resolve(path, 'result.json'), 'utf8'),
  );
  if (
    result.sha !== sha || result.attempt !== attempt
    || !['success', 'failure', 'cancelled', 'skipped'].includes(result.result)
  ) {
    throw new Error('Invalid report identity or revision: ' + artifact);
  }
  if (result.result === 'success') {
    const actual = await reportedCases(path);
    const sorted = values => [...values].sort();
    if (
      !actual || actual.some(item => item.status !== 'success')
      || JSON.stringify(sorted(actual.map(item => item.name)))
        !== JSON.stringify(sorted(expectedNames))
    ) {
      throw new Error(
        'Successful producer has incomplete or mismatched report coverage: '
          + artifact,
      );
    }
  }
  return {
    label: 'Web',
    path,
    result: producerResult === 'success' ? result.result : 'failure',
    artifact,
    attempt,
  };
}

export function publicationArguments(entries, env, supplementalFile) {
  if (
    env.REPORT_LINKS_PUBLISHED !== undefined
    && !['true', 'false'].includes(env.REPORT_LINKS_PUBLISHED)
  ) {
    throw new Error('Invalid report publication mode.');
  }
  const published = env.REPORT_LINKS_PUBLISHED !== 'false';
  if (published && !env.PAGES_URL) {
    throw new Error('Published reports require a Pages URL.');
  }
  const args = [
    fileURLToPath(new URL('./render-ci-summary.mjs', import.meta.url)),
    '--title',
    'Lynx Web × Midscene',
    '--run-url',
    env.RUN_URL,
    ...(published
      ? ['--pages-url', env.PAGES_URL]
      : ['--links-published', 'false']),
    '--site-prefix',
    `runs/${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`,
    '--site-dir',
    resolve(env.RUNNER_TEMP, 'midscene-publication/site'),
    '--output',
    resolve(env.RUNNER_TEMP, 'midscene-publication/summary.md'),
  ];
  for (const entry of entries) {
    if (entry.attempt !== null && entry.attempt !== undefined) {
      if (
        !Number.isSafeInteger(entry.attempt) || entry.attempt < 1
        || entry.attempt > Number(env.GITHUB_RUN_ATTEMPT)
      ) {
        throw new Error('Invalid selected artifact attempt');
      }
      args.push('--artifact-attempt', `${entry.label}=${entry.attempt}`);
    }
    args.push(
      '--entry',
      `${entry.label}=${entry.path}`,
      '--result',
      `${entry.label}=${entry.result}`,
      '--artifact',
      `${entry.label}=${entry.artifact}`,
    );
  }
  if (supplementalFile) args.push('--supplemental-evidence', supplementalFile);
  return args;
}

export async function prepareRetainedPublication(entry, env) {
  const currentAttempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (
    !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? '')
    || !Number.isSafeInteger(currentAttempt) || currentAttempt < 1
  ) {
    throw new Error('Invalid retained publication identity');
  }
  const sitePrefix =
    `runs/${env.GITHUB_RUN_ID}-${currentAttempt}/retained-inputs`;
  const evidenceRoot = resolve(entry.path, 'retained-inputs');
  let missing = entry.attempt !== currentAttempt;
  if (!missing) {
    try {
      await stat(resolve(evidenceRoot, 'evidence.json'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      missing = true;
    }
  }
  if (missing) {
    return {
      hasAttention: true,
      supplemental: {
        label: 'Original input contracts',
        sourceCount: catalogSourceCount(retainedCatalog),
        expectedCount: retainedInputKeys.length * retainedInputBrowsers.length,
        errors: [
          'No retained input evidence from the current workflow attempt.',
        ],
        cases: retainedInputKeys.flatMap(name =>
          retainedInputBrowsers.map(browser => ({
            platform: `Original · ${browser}`,
            name,
            status: 'not-run',
            reason: 'Current-attempt source/browser evidence is unavailable.',
          }))
        ),
      },
    };
  }
  return publishRetainedInputs({
    evidenceRoot,
    destination: resolve(
      env.RUNNER_TEMP,
      'midscene-publication/site',
      sitePrefix,
    ),
    sitePrefix,
    artifact: entry.artifact,
    publicBaseUrl: env.REPORT_LINKS_PUBLISHED === 'false'
      ? undefined
      : env.PAGES_URL,
  });
}

async function main() {
  const entries = [
    await selectReport(
      resolve(process.env.RUNNER_TEMP, 'midscene-artifacts'),
      process.env.GITHUB_SHA,
      Number(process.env.GITHUB_RUN_ATTEMPT),
      await caseNames(fileURLToPath(new URL('../', import.meta.url))),
      process.env.PRODUCER_RESULT,
    ),
  ];
  const retained = await prepareRetainedPublication(entries[0], process.env);
  const supplemental = mergeOriginalEvidence(
    retained.supplemental,
    prepareOriginalRunnerPublication(entries[0], process.env),
  );
  const supplementalFile = resolve(
    process.env.RUNNER_TEMP,
    'midscene-publication/retained-evidence.json',
  );
  await mkdir(resolve(process.env.RUNNER_TEMP, 'midscene-publication'), {
    recursive: true,
  });
  await writeFile(supplementalFile, JSON.stringify(supplemental));
  const args = publicationArguments(entries, process.env, supplementalFile);
  const child = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
  if (process.exitCode === 0) {
    // A failed test/evidence disposition can still have a valid failure report.
    // Only this marker allows publishing the rendered site after a nonzero exit.
    await writeFile(
      resolve(process.env.RUNNER_TEMP, 'midscene-publication/rendered.json'),
      JSON.stringify({ schemaVersion: 1 }),
    );
  }
  // Preserve the original retry policy: a fully evidenced flaky pass is a
  // Summary warning, not a new CI failure policy. Missing evidence still fails.
  if (
    process.exitCode === 0 && (
      supplemental.errors.length
      || supplemental.cases.some(row =>
        !['success', 'flaky'].includes(row.status)
        && !(row.status === 'not-applicable'
          && row.evidencePolicy === 'source-return')
        && !(row.status === 'skipped' && row.evidencePolicy === 'source-skip')
      )
    )
  ) process.exitCode = 1;
}

if (
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) await main();
