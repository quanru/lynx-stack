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
    include: [
      'cases/web/**/*.{yaml,yml}',
      'cases/web-elements/**/*.{yaml,yml}',
      'cases/web-pixels/**/*.{yaml,yml}',
    ],
  }).sort();
  return Promise.all(
    paths.map(async path => ({
      path: relative(root, path),
      document: parse(await readFile(path, 'utf8')),
    })),
  );
}

export async function materializeShard(root, documents, index, count) {
  const selected = partitionDocuments(documents, index, count);
  if (!selected.length) {
    throw new Error('Shard is empty; reduce the shard count.');
  }
  // SDK discovery always excludes .midscene/**, even with an explicit include.
  const parent = resolve(root, '.midscene-shards');
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
  const include = `${relative(root, directory)}/**/*.yaml`;
  if (
    discoverTestFiles(root, { include: [include] }).length !== selected.length
  ) {
    throw new Error(
      'SDK discovery did not find every generated shard document.',
    );
  }
  const projects = [
    ...new Set(selected.map(({ path }) => {
      if (path.startsWith('cases/web/')) return 'web-shell';
      if (path.startsWith('cases/web-elements/')) return 'web-elements';
      if (path.startsWith('cases/web-pixels/')) return 'web-pixels';
      throw new Error(`Unknown case project: ${path}`);
    })),
  ];
  const prefix = relative(root, directory);
  return {
    directory,
    include,
    names,
    projects,
    shellInclude: `${prefix}/cases/web/**/*.{yaml,yml}`,
    elementsInclude: `${prefix}/cases/web-elements/**/*.{yaml,yml}`,
    pixelInclude: `${prefix}/cases/web-pixels/**/*.{yaml,yml}`,
  };
}

async function main() {
  const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
  const [index, count] = process.argv.slice(2).map(Number);
  const { shellInclude, elementsInclude, pixelInclude, projects, names } =
    await materializeShard(
      root,
      await loadDocuments(root),
      index,
      count,
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
    ...projects.flatMap(name => ['--project', name]),
  ], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      MIDSCENE_CASE_FILES: shellInclude,
      MIDSCENE_ELEMENTS_CASE_FILES: elementsInclude,
      MIDSCENE_PIXEL_CASE_FILES: pixelInclude,
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
