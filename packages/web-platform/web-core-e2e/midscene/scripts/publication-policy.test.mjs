import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('results do not advertise unpublished links and missing Pages skips publication', async () => {
  const workflow = await readFile(
    new URL(
      '../../../../../.github/workflows/midscene-web.yml',
      import.meta.url,
    ),
    'utf8',
  );
  const publisher = await readFile(
    new URL(
      '../../../../../.github/workflows/workflow-pages.yml',
      import.meta.url,
    ),
    'utf8',
  );
  const [tests, publication] = workflow.split('  pages-report:');
  assert.doesNotMatch(tests, /--pages-url/);
  assert.ok(tests.includes('--links-published false'));
  assert.ok(
    publication.includes(
      'vars.MIDSCENE_PAGES_BRANCH || github.event.repository.default_branch',
    ),
  );
  assert.ok(publication.includes('id: pages\n        continue-on-error: true'));
  assert.ok(publication.includes('enablement: false'));
  assert.ok(
    publication.includes(
      'Settings > Pages > Build and deployment > Source > GitHub Actions',
    ),
  );
  assert.ok(
    publication.includes('needs.pages-report.outputs.ready == \'true\''),
  );
  assert.ok(
    publisher.includes(
      'steps.deployment.outcome == \'success\' && inputs.component == \'midscene\'',
    ),
  );
  assert.doesNotMatch(publication, /--output "\$GITHUB_STEP_SUMMARY"/);
});
