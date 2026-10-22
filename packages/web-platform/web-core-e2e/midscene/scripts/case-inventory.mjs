import { readFile } from 'node:fs/promises';
import { discoverTestFiles } from '@midscene/test/config';
import { parse } from 'yaml';

// Read original YAML directly; CI never generates or partitions test documents.
export async function caseNames(root) {
  const paths = discoverTestFiles(root, {
    include: [
      'cases/web/**/*.{yaml,yml}',
      'cases/web-elements/**/*.{yaml,yml}',
      'cases/web-pixels/**/*.{yaml,yml}',
      'cases/web-ssr-no-js/**/*.{yaml,yml}',
    ],
  }).sort();
  const names = [];
  for (const path of paths) {
    const document = parse(await readFile(path, 'utf8'));
    if (!Array.isArray(document.cases)) {
      throw new Error('Missing cases: ' + path);
    }
    for (const item of document.cases) {
      if (
        typeof item.name !== 'string' || !item.name || names.includes(item.name)
      ) {
        throw new Error('Duplicate or missing case name: ' + path);
      }
      names.push(item.name);
    }
  }
  if (!names.length) throw new Error('Empty case inventory.');
  return names;
}
