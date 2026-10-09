import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectWorkflowDocument } from '@midscene/test';
import { discoverTestFiles, loadTestProject } from '@midscene/test/config';
import {
  loadDocuments,
  partitionDocuments,
  materializeShard,
} from './run-shard.mjs';

test('four shards partition every original case once without changing steps or lifecycle', async () => {
  const documents = await loadDocuments(
    fileURLToPath(new URL('../', import.meta.url)),
  );
  const expected = documents.flatMap(item => item.document.cases);
  const partitions = Array.from(
    { length: 4 },
    (_, i) => partitionDocuments(documents, i + 1, 4),
  );
  const actual = partitions.flat().flatMap(item => item.document.cases);
  assert.equal(actual.length, expected.length);
  assert.equal(new Set(actual.map(item => item.name)).size, expected.length);
  for (const item of actual) {
    assert.deepEqual(
      item,
      expected.find(original => original.name === item.name),
    );
  }
  const sizes = partitions.map(items =>
    items.reduce((sum, item) => sum + item.document.cases.length, 0)
  );
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
  const source = [{
    path: 'a.yaml',
    document: {
      beforeEach: [{ aiAct: 'Prepare' }],
      cases: expected.slice(0, 2),
    },
  }];
  assert.deepEqual(
    partitionDocuments(source, 1, 2)[0].document.beforeEach,
    source[0].document.beforeEach,
  );
});

test('invalid shard configurations and duplicate identities fail closed', () => {
  for (const [index, count] of [[0, 4], [5, 4], [1, 0], [1.5, 4], [1, NaN]]) {
    assert.throws(() => partitionDocuments([], index, count));
  }
  assert.throws(() =>
    partitionDocuments(
      [{
        path: 'a',
        document: { cases: [{ name: 'same' }, { name: 'same' }] },
      }],
      1,
      2,
    )
  );
});

test('generated JSON-in-YAML shards collect through the real SDK with unchanged case definitions', async t => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'midscene-shard-collection-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { projects } = await loadTestProject(
    join(root, 'midscene.config.ts'),
  );
  const collect = absolutePath => {
    const project = projects.find(item =>
      item.name
        === (absolutePath.includes('/cases/web-elements/')
          ? 'web-elements'
          : 'web-shell')
    );
    assert.ok(project);
    const options = {
      resolveNode: project.nodes.get.bind(project.nodes),
      variables: project.variables,
      env: process.env,
    };
    return collectWorkflowDocument({
      projectId: project.projectId,
      projectName: project.name,
      sourcePath: absolutePath,
      absolutePath,
    }, options);
  };
  const documents = await loadDocuments(root);
  const original = documents.flatMap(item =>
    collect(join(root, item.path)).cases.map(item => item.definition)
  );
  const actual = [];
  for (let index = 1; index <= 4; index++) {
    const {
      include,
      names,
      projects: selectedProjects,
      shellInclude,
      elementsInclude,
    } = await materializeShard(
      directory,
      documents,
      index,
      4,
    );
    const discovered = discoverTestFiles(directory, { include: [include] });
    assert.ok(discovered.length > 0);
    const shellFiles = discoverTestFiles(directory, {
      include: [shellInclude],
    });
    const elementsFiles = discoverTestFiles(directory, {
      include: [elementsInclude],
    });
    assert.equal(shellFiles.length + elementsFiles.length, discovered.length);
    assert.equal(
      new Set([...shellFiles, ...elementsFiles]).size,
      discovered.length,
    );
    assert.equal(selectedProjects.includes('web-shell'), shellFiles.length > 0);
    assert.equal(
      selectedProjects.includes('web-elements'),
      elementsFiles.length > 0,
    );
    const partition = [];
    for (const path of discovered) {
      actual.push(...collect(path).cases.map(item => item.definition));
      partition.push(...collect(path).cases.map(item => item.definition.name));
    }
    assert.deepEqual(partition.sort(), names.sort());
  }
  assert.equal(actual.length, original.length);
  for (const item of actual) {
    assert.deepEqual(
      item,
      original.find(source => source.name === item.name),
    );
  }
});
