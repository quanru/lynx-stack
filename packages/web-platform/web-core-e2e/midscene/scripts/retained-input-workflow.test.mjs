import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import YAML from 'yaml';

test('original input execution preserves profiles and creates portable evidence before artifact staging', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL(
        '../../../../../.github/workflows/midscene-web.yml',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const steps = workflow.jobs['web-shell-ai-e2e'].steps;
  const original = steps.find(step => step.id === 'retained-inputs');
  assert.equal(
    original['working-directory'],
    'packages/web-platform/web-elements',
  );
  assert.equal(original.env.PORT, '3081');
  assert.equal(
    original.run,
    'pnpm exec playwright test --config playwright.retained-inputs.config.ts --project chromium --project firefox --project webkit --workers=2 --output midscene-original-results/retained-inputs/results',
  );
  assert.ok(
    steps.indexOf(original)
      < steps.findIndex(step => step.name === 'Start web-core-e2e dev shell'),
  );
  const convert = steps.find(step =>
    step.name === 'Preserve retained input evidence before moving artifacts'
  );
  assert.equal(convert.if, 'always()');
  assert.match(
    convert.env.RETAINED_RESULT,
    /steps\.retained-inputs\.outcome == 'success'/,
  );
  assert.match(
    convert.run,
    /write-retained-input-evidence\.mjs "\$\(realpath "\$evidence"\)" "\$RETAINED_RESULT"/,
  );
  const stage = steps.find(step =>
    step.run?.includes(
      'target="$RUNNER_TEMP/midscene-upload/attempt-$GITHUB_RUN_ATTEMPT"',
    )
  );
  assert.ok(steps.indexOf(convert) < steps.indexOf(stage));
  assert.ok(stage.run.includes('cp -R "$retained" "$target/retained-inputs"'));
  const publication = workflow.jobs['pages-report'].steps;
  const render = publication.find(step => step.id === 'build-report');
  assert.equal(render['continue-on-error'], true);
  assert.match(render.run, /rendered\.json/);
  const upload = publication.find(step => step.id === 'upload-publication');
  assert.match(
    upload.if,
    /always\(\).*steps\.build-report\.outputs\.rendered == 'true'/,
  );
  const preserveFailure = publication.find(step =>
    step.name
      === 'Preserve evidence validation failure after retaining its report'
  );
  assert.ok(publication.indexOf(preserveFailure) > publication.indexOf(upload));
  assert.match(preserveFailure.if, /steps\.build-report\.outcome == 'failure'/);
  assert.equal(preserveFailure.run, 'exit 1');
});
