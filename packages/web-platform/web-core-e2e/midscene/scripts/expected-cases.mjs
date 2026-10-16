import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export function executionIdentity(env = process.env) {
  if (
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')
    || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? '')
    || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT ?? '')
  ) {
    throw new Error(
      'Expected Web inventory requires exact CI SHA, run and attempt',
    );
  }
  return {
    schemaVersion: 1,
    label: 'Web',
    projectName: 'Web',
    sha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    attempt: env.GITHUB_RUN_ATTEMPT,
  };
}

// SDK collection only: never enters project setup or launches a browser/model.
export async function collectExpectedCases(env = process.env) {
  const identity = executionIdentity(env);
  const { loadTestProject, discoverTestFiles } = await import(
    '@midscene/test/config'
  );
  const { collectWorkflowDocument } = await import('@midscene/test');
  const loaded = await loadTestProject(path.join(root, 'midscene.config.ts'));
  const cases = [];
  for (const project of loaded.projects) {
    for (const absolutePath of discoverTestFiles(root, project.files).sort()) {
      const sourcePath = path.relative(root, absolutePath).split(path.sep).join(
        '/',
      );
      const document = collectWorkflowDocument({
        projectId: project.projectId,
        projectName: project.name,
        sourcePath,
        absolutePath,
      }, {
        resolveNode: project.nodes.get.bind(project.nodes),
        variables: project.variables,
        env,
      });
      cases.push(...document.cases.map(item => ({
        caseId: item.caseId,
        name: item.definition.name,
        sourcePath,
      })));
    }
  }
  if (
    !cases.length
    || new Set(cases.map(item => item.caseId)).size !== cases.length
    || new Set(cases.map(item => item.name)).size !== cases.length
  ) {
    throw new Error('Empty or duplicate Web expected case collection');
  }
  return { ...identity, expectedCount: cases.length, cases };
}

export function executionStatus(outcome, env = process.env) {
  if (!['success', 'failure', 'cancelled', 'skipped'].includes(outcome)) {
    throw new Error('Expected actual workflow test step outcome');
  }
  return { ...executionIdentity(env), outcome };
}

if (
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [mode, outcome] = process.argv.slice(2);
  const value = mode === 'collect' && outcome === undefined
    ? await collectExpectedCases()
    : mode === 'status'
    ? executionStatus(outcome)
    : (() => {
      throw new Error('Usage: expected-cases.mjs collect | status OUTCOME');
    })();
  // Keep inventory outside the SDK output directory, which a run may replace.
  const directory = path.join(root, 'midscene-inventory');
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(
      directory,
      mode === 'collect' ? 'expected-cases.json' : 'execution-status.json',
    ),
    JSON.stringify(value, null, 2),
  );
}
