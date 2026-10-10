import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { testRunDump } from './render-ci-summary.mjs';
import { loadDocuments, partitionDocuments } from './run-shard.mjs';

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

export async function selectShards(directory, count, sha, expectedPartitions) {
  const artifacts = await readdir(directory).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const selected = [];
  const names = new Set();
  for (let index = 1; index <= count; index++) {
    const prefix = `midscene-ai-e2e-web-shard-${index}-${count}-`;
    const matches = artifacts.filter(name =>
      name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length))
    )
      .sort((a, b) =>
        Number(a.slice(prefix.length)) - Number(b.slice(prefix.length))
      );
    const artifact = matches.at(-1);
    const label = `Web shard ${index}/${count}`;
    if (!artifact) {
      selected.push({
        label,
        path: resolve(directory, `missing-${index}`),
        result: 'failure',
        artifact: `${prefix}missing`,
      });
      continue;
    }
    const attempt = Number(artifact.slice(prefix.length));
    const path = resolve(directory, artifact, `attempt-${attempt}`);
    const result = JSON.parse(
      await readFile(resolve(path, 'result.json'), 'utf8'),
    );
    if (
      result.sha !== sha || result.index !== index || result.count !== count
      || result.attempt !== attempt
      || !['success', 'failure', 'cancelled', 'skipped'].includes(result.result)
    ) {
      throw new Error(`Invalid shard identity or revision: ${artifact}`);
    }
    if (result.result === 'success') {
      const manifest = JSON.parse(
        await readFile(resolve(path, 'shard.json'), 'utf8'),
      );
      if (
        manifest.sha !== sha || manifest.index !== index
        || manifest.count !== count || !manifest.names?.length
      ) {
        throw new Error(`Missing or mismatched case manifest: ${artifact}`);
      }
      for (const name of manifest.names) {
        if (names.has(name)) {
          throw new Error(`Case appears in multiple shards: ${name}`);
        }
        names.add(name);
      }
      const actual = await reportedCases(path);
      const expected = expectedPartitions?.[index - 1] ?? manifest.names;
      const sorted = values => [...values].sort();
      if (
        !actual || actual.some(item => item.status !== 'success')
        || JSON.stringify(sorted(actual.map(item => item.name)))
          !== JSON.stringify(sorted(expected))
        || JSON.stringify(sorted(manifest.names))
          !== JSON.stringify(sorted(expected))
      ) {
        throw new Error(
          `Successful shard has incomplete or mismatched report coverage: ${artifact}`,
        );
      }
    }
    selected.push({ label, path, result: result.result, artifact });
  }
  return selected;
}

async function main() {
  const count = Number(process.env.MIDSCENE_SHARD_COUNT);
  if (!Number.isInteger(count) || count < 1 || !process.env.GITHUB_SHA) {
    throw new Error('Missing shard count or commit identity.');
  }
  const documents = await loadDocuments(
    fileURLToPath(new URL('../', import.meta.url)),
  );
  const expectedPartitions = Array.from(
    { length: count },
    (_, index) =>
      partitionDocuments(documents, index + 1, count).flatMap(item =>
        item.document.cases.map(item => item.name)
      ),
  );
  const entries = await selectShards(
    resolve(process.env.RUNNER_TEMP, 'midscene-artifacts'),
    count,
    process.env.GITHUB_SHA,
    expectedPartitions,
  );
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
