import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { testRunDump } from './render-ci-summary.mjs';
import { caseNames } from './case-inventory.mjs';

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
  };
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
  const args = [
    fileURLToPath(new URL('./render-ci-summary.mjs', import.meta.url)),
    '--title',
    'Lynx Web × Midscene',
    '--run-url',
    process.env.RUN_URL,
    '--pages-url',
    process.env.PAGES_URL,
    '--site-prefix',
    `runs/${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
    '--site-dir',
    resolve(process.env.RUNNER_TEMP, 'midscene-publication/site'),
    '--output',
    resolve(process.env.RUNNER_TEMP, 'midscene-publication/summary.md'),
  ];
  for (const entry of entries) {
    args.push(
      '--entry',
      `${entry.label}=${entry.path}`,
      '--result',
      `${entry.label}=${entry.result}`,
      '--artifact',
      `${entry.label}=${entry.artifact}`,
    );
  }
  const child = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
}

if (
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) await main();
