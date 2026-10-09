import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverTestFiles } from '@midscene/test/config';
import { parse } from 'yaml';

export function partitionDocuments(documents, index, count) {
  if (
    !Number.isInteger(index) || !Number.isInteger(count)
    || count < 1 || index < 1 || index > count
  ) {
    throw new Error(
      'Shard index/count must be integers with 1 <= index <= count.',
    );
  }
  const names = new Set();
  let ordinal = 0;
  return documents.map(({ path, document }) => {
    if (!Array.isArray(document.cases)) {
      throw new Error(`Missing cases: ${path}`);
    }
    const cases = document.cases.filter(item => {
      if (!item.name || names.has(item.name)) {
        throw new Error(`Duplicate or missing case name: ${item.name}`);
      }
      names.add(item.name);
      return ordinal++ % count === index - 1;
    });
    return { path, document: { ...document, cases } };
  }).filter(item => item.document.cases.length > 0);
}

export async function loadDocuments(root) {
  const paths = discoverTestFiles(root, {
    include: ['cases/web/**/*.{yaml,yml}'],
  }).sort();
  return Promise.all(
    paths.map(async path => ({
      path: relative(root, path),
      document: parse(await readFile(path, 'utf8')),
    })),
  );
}

async function main() {
  const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
  const [index, count] = process.argv.slice(2).map(Number);
  const selected = partitionDocuments(await loadDocuments(root), index, count);
  if (!selected.length) {
    throw new Error('Shard is empty; reduce the shard count.');
  }
  const parent = resolve(root, '.midscene/shards');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(`${parent}/${index}-${count}-`);
  for (const { path, document } of selected) {
    const target = resolve(directory, path);
    await mkdir(resolve(target, '..'), { recursive: true });
    // JSON is valid YAML and preserves all document lifecycle and case metadata.
    await writeFile(target, JSON.stringify(document));
  }
  const names = selected.flatMap(item =>
    item.document.cases.map(item => item.name)
  );
  console.log(`Shard ${index}/${count}: ${names.length} cases`);
  const manifest = { index, count, names, sha: process.env.GITHUB_SHA ?? null };
  await mkdir(resolve(root, 'midscene_run'), { recursive: true });
  await writeFile(
    resolve(root, 'midscene_run/shard.json'),
    JSON.stringify(manifest),
  );
  const child = spawn(process.execPath, [
    resolve(root, 'node_modules/@midscene/test/bin/midscene-test'),
    '--project',
    'web-shell',
  ], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      MIDSCENE_CASE_FILES: `${relative(root, directory)}/**/*.yaml`,
    },
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal));
  }
  child.once('error', error => {
    console.error(error);
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

if (
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) await main();
