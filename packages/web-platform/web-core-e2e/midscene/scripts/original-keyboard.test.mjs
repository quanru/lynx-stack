import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';

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
const source = readFileSync(
  new URL('../../tests/reactlynx.spec.ts', import.meta.url),
  'utf8',
);
const ast = ts.createSourceFile(
  'reactlynx.spec.ts',
  source,
  ts.ScriptTarget.Latest,
  true,
);
const originals = new Map();
function visit(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) {
    originals.set(node.arguments[0].text, node.arguments[1].getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const names = [
  'basic-global-bindkeydown',
  'basic-global-bindkeyup',
  'basic-global-bindkeydown-key',
  'basic-global-bindkeydown-code',
  'basic-global-bindkeydown-shift',
  'basic-bindkeydown-out-of-view-noop',
].sort();

test('six original keyboard contracts run in CSR and SSR across the three unchanged browser profiles', () => {
  for (const mode of ['CSR', 'SSR']) {
    const matching = steps.filter(step =>
      step.name === `Validate original keyboard event contracts (${mode})`
    );
    assert.equal(matching.length, 1);
    const step = matching[0];
    assert.equal(
      step.if,
      '${{ !cancelled() && steps.build-web.outcome == \'success\' && steps.original-collection.outcome == \'success\' }}',
    );
    assert.equal(
      step['working-directory'],
      'packages/web-platform/web-core-e2e',
    );
    assert.equal(step.env.ENABLE_SSR, mode === 'SSR' ? '1' : '');
    assert.equal(
      step.env.ORIGINAL_EVIDENCE_RUNNER,
      `keyboard-${mode.toLowerCase()}`,
    );
    assert.match(
      step.run,
      /--config playwright\.original-evidence\.config\.ts$/,
    );
    assert.ok(
      step.run.startsWith('pnpm exec playwright test tests/reactlynx.spec.ts '),
    );
    const pattern = step.run.match(/--grep '([^']+)'/)?.[1];
    assert.ok(pattern);
    const filter = new RegExp(pattern);
    assert.deepEqual(
      [...originals.keys()].filter(name => filter.test(name)).sort(),
      names,
    );
    assert.deepEqual(
      [...step.run.matchAll(/--project (\w+)/g)].map(match => match[1]),
      ['chromium', 'firefox', 'webkit'],
    );
    assert.match(step.run, /--workers=2/);
    assert.doesNotMatch(
      step.run,
      /--(?:retries|timeout|update-snapshots)(?:[=\s]|$)/,
    );
    assert.ok(
      steps.indexOf(step)
        < steps.findIndex(item => item.name === 'Start web-core-e2e dev shell'),
    );
  }
});

test('the retained source distinguishes key-down from key-up and never focuses the out-of-view target', () => {
  const keyup = originals.get('basic-global-bindkeyup');
  const down = keyup.indexOf('await page.keyboard.down(\'a\')');
  const pink = keyup.indexOf('.toContain(\'pink\')');
  const up = keyup.indexOf('await page.keyboard.up(\'a\')');
  const green = keyup.indexOf('.toContain(\'green\')');
  assert.ok(down >= 0 && down < pink && pink < up && up < green);
  assert.doesNotMatch(keyup, /keyboard\.press/);
  const noop = originals.get('basic-bindkeydown-out-of-view-noop');
  assert.match(noop, /await page\.keyboard\.press\('a'\)/);
  assert.match(
    noop,
    /await observer\.getAttribute\('style'\)\)\.toContain\('pink'\)/,
  );
  assert.doesNotMatch(noop, /\.click\(|\.focus\(/);
});

test('each retained browser runner owns a separate uploaded output directory', () => {
  const runners = steps.filter(step =>
    step.name?.startsWith('Validate original')
    && step.run?.includes('playwright test')
  );
  const outputs = runners.map(step => {
    const output = step.run.match(
      /--output (midscene-original-results\/[a-z-]+)/,
    )?.[1];
    assert.ok(output, step.name);
    return step['working-directory'] + '/' + output;
  });
  assert.equal(new Set(outputs).size, runners.length);
  const upload = steps.find(step =>
    step.name === 'Upload retained original runner diagnostics'
  );
  for (const output of outputs) {
    assert.ok(
      upload.with.path.split('\n').some(path =>
        output.startsWith(path.trim() + '/')
      ),
    );
  }
});
