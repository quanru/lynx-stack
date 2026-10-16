import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  originalRunnerCatalog,
  originalRunnerSourceCount,
} from './original-runner-catalog.mjs';
import { publishRetainedInputs } from './publish-retained-inputs.mjs';

export function prepareOriginalRunnerPublication(entry, env) {
  const attempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (
    !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? '')
    || !Number.isSafeInteger(attempt) || attempt < 1
  ) {
    throw new Error('Invalid original runner publication identity');
  }
  const supplemental = {
    label: 'Original input contracts',
    sourceCount: originalRunnerSourceCount,
    expectedCount: 0,
    errors: [],
    cases: [],
  };
  for (const catalog of originalRunnerCatalog) {
    const evidenceRoot = path.resolve(
      entry.path,
      'original-runners',
      catalog.id,
    );
    const sitePrefix =
      `runs/${env.GITHUB_RUN_ID}-${attempt}/original-runners/${catalog.id}`;
    let group;
    if (
      entry.attempt !== attempt
      || !existsSync(path.join(evidenceRoot, 'evidence.json'))
    ) {
      group = {
        expectedCount: catalog.keys.length * catalog.browsers.length,
        errors: ['No current-attempt producer evidence.'],
        cases: catalog.keys.flatMap(name =>
          catalog.browsers.map(platform => ({
            platform,
            name,
            status: 'not-run',
            reason: 'Current-attempt source/browser evidence is unavailable.',
            durationMs: null,
            previewPath: null,
            reportPath: null,
            artifact: entry.artifact,
          }))
        ),
      };
    } else {
      group = publishRetainedInputs({
        evidenceRoot,
        destination: path.resolve(
          env.RUNNER_TEMP,
          'midscene-publication/site',
          sitePrefix,
        ),
        sitePrefix,
        publicBaseUrl: env.REPORT_LINKS_PUBLISHED === 'false'
          ? undefined
          : env.PAGES_URL,
        artifact: entry.artifact,
        catalog,
      }).supplemental;
    }
    supplemental.expectedCount += group.expectedCount;
    supplemental.errors.push(
      ...group.errors.map(error => `${catalog.id}: ${error}`),
    );
    supplemental.cases.push(
      ...group.cases.map(row => ({
        ...row,
        name: `${
          catalog.sources ? row.name : `${catalog.file} / ${row.name}`
        } (${catalog.mode})`,
      })),
    );
  }
  return supplemental;
}

export function mergeOriginalEvidence(...groups) {
  return {
    label: 'Original input contracts',
    sourceCount: groups.reduce((sum, item) => sum + item.sourceCount, 0),
    expectedCount: groups.reduce((sum, item) => sum + item.expectedCount, 0),
    errors: groups.flatMap(item => item.errors),
    cases: groups.flatMap(item => item.cases),
  };
}
