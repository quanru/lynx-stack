import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { retainedInputEvidence } from './retained-input-evidence.mjs';
import { retainedCatalog } from './original-runner-catalog.mjs';

export function writeRetainedInputEvidence(
  evidenceRoot,
  producerResult,
  catalog = retainedCatalog,
) {
  if (
    !['success', 'failure', 'skipped', 'cancelled'].includes(producerResult)
  ) {
    throw new Error('Invalid producer result');
  }
  const root = path.resolve(evidenceRoot);
  // Callers using OS aliases (for example macOS /tmp) must pass realpath first.
  // Do not silently follow a symlink ancestor into a different output tree.
  for (
    let ancestor = root;
    path.dirname(ancestor) !== ancestor;
    ancestor = path.dirname(ancestor)
  ) {
    if (lstatSync(ancestor).isSymbolicLink()) {
      throw new Error('Evidence root has a symlink ancestor');
    }
  }
  const rootInfo = lstatSync(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error('Expected a real evidence directory');
  }
  const input = path.join(root, 'report.json');
  const output = path.join(root, 'evidence.json');
  try {
    if (!lstatSync(output).isFile() || lstatSync(output).isSymbolicLink()) {
      throw new Error('Unsafe manifest output');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  let manifest;
  try {
    const info = lstatSync(input);
    if (
      !info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024 * 1024
    ) {
      throw new Error('Unsafe or oversized JSON input');
    }
    manifest = retainedInputEvidence(
      JSON.parse(readFileSync(input, 'utf8')),
      root,
      catalog,
    );
  } catch {
    // Fail closed, but keep a publishable inventory for every missing execution.
    manifest = retainedInputEvidence(
      { suites: [], errors: [{}] },
      root,
      catalog,
    );
    manifest.collectionError =
      'Producer JSON report is missing, invalid or unsafe';
  }
  const complete = producerResult === 'success'
    && manifest.runnerErrorCount === 0
    && manifest.cases.every(row =>
      row.evidencePolicy === 'source-skip' && row.status === 'skipped'
        && row.outcome === 'skipped'
      || row.status === 'passed'
        && ['expected', 'flaky'].includes(row.outcome)
        && (row.evidencePolicy === 'non-ui' || row.screenshots.length > 0)
        && row.report
    );
  manifest.producerResult = producerResult;
  manifest.evidenceComplete = complete;
  writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
  return { manifest, exitCode: complete ? 0 : 1 };
}

if (
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 4) {
    throw new Error(
      'Usage: node write-retained-input-evidence.mjs EVIDENCE_ROOT success|failure',
    );
  }
  const { exitCode } = writeRetainedInputEvidence(
    process.argv[2],
    process.argv[3],
  );
  process.exitCode = exitCode;
}
