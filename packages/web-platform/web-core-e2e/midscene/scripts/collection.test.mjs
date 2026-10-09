import assert from 'node:assert/strict';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { collectWorkflowDocument } from '@midscene/test';
import { discoverTestFiles, loadTestProject } from '@midscene/test/config';

test('all 166 cases collect with registered nodes without a browser or model', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const loaded = await loadTestProject(`${root}/midscene.config.ts`);
  const names = [];
  for (const project of loaded.projects) {
    for (const absolutePath of discoverTestFiles(root, project.files)) {
      const document = collectWorkflowDocument({
        projectId: project.projectId,
        projectName: project.name,
        sourcePath: relative(root, absolutePath),
        absolutePath,
      }, {
        resolveNode: project.nodes.get.bind(project.nodes),
        variables: project.variables,
        env: process.env,
      });
      names.push(...document.cases.map((item) => item.definition.name));
    }
  }
  assert.equal(names.length, 166);
  assert.equal(new Set(names).size, 166);
});
