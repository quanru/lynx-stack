import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectWorkflowDocument } from '@midscene/test';
import { discoverTestFiles, loadTestProject } from '@midscene/test/config';
import { caseNames } from './case-inventory.mjs';

test('unfiltered SDK projects collect the complete original YAML inventory exactly once', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { projects } = await loadTestProject(join(root, 'midscene.config.ts'));
  const actual = [];
  for (const project of projects) {
    for (const absolutePath of discoverTestFiles(root, project.files)) {
      const document = collectWorkflowDocument({
        projectId: project.projectId,
        projectName: project.name,
        sourcePath: absolutePath,
        absolutePath,
      }, {
        resolveNode: project.nodes.get.bind(project.nodes),
        variables: project.variables,
        env: process.env,
      });
      actual.push(...document.cases.map(item => item.definition.name));
    }
  }
  assert.deepEqual(actual.sort(), (await caseNames(root)).sort());
  assert.equal(actual.length, 484);
  assert.equal(new Set(actual).size, actual.length);
});

test('source inventory rejects empty and duplicate case identities', async t => {
  const root = await mkdtemp(join(tmpdir(), 'midscene-case-inventory-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(caseNames(root), /Empty/);
  await mkdir(join(root, 'cases/web'), { recursive: true });
  for (const cases of [[{ name: 'same' }, { name: 'same' }], [{}]]) {
    await writeFile(join(root, 'cases/web/a.yaml'), JSON.stringify({ cases }));
    await assert.rejects(caseNames(root), /Duplicate or missing/);
  }
});
