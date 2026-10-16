import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';
import { collectWorkflowDocument } from '@midscene/test';
import { discoverTestFiles, loadTestProject } from '@midscene/test/config';

const names = [
  'basic-lynx-reload',
  'basic-lazy-component-multi',
  'basic-lazy-component-multi-import',
];
const source = ts.createSourceFile(
  'original.ts',
  readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
const originals = new Map();
function visit(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) originals.set(node.arguments[0].text, node.arguments[1]);
  ts.forEachChild(node, visit);
}
visit(source);

test('ambiguous same-color blocks retain the original CSR runner and all three browser profiles', () => {
  const workflow = YAML.parse(readFileSync(
    new URL(
      '../../../../../.github/workflows/midscene-web.yml',
      import.meta.url,
    ),
    'utf8',
  ));
  const upstream = YAML.parse(readFileSync(
    new URL('../../../../../.github/workflows/test.yml', import.meta.url),
    'utf8',
  ));
  assert.deepEqual(upstream.jobs['web-core-e2e'].strategy.matrix.render, [
    'CSR',
  ]);
  const steps = workflow.jobs['web-shell-ai-e2e'].steps;
  const matches = steps.filter(step =>
    step.name?.startsWith('Validate original ambiguous block inputs')
  );
  assert.equal(matches.length, 1);
  const step = matches[0];
  assert.equal(
    step.name,
    'Validate original ambiguous block inputs (CSR)',
  );
  assert.equal(step.if, undefined);
  assert.equal(step['working-directory'], 'packages/web-platform/web-core-e2e');
  assert.deepEqual(step.env, {
    ENABLE_SSR: '',
    ORIGINAL_EVIDENCE_RUNNER: 'lazy-components-csr',
  });
  assert.equal(
    step.run,
    'pnpm exec playwright test tests/reactlynx.spec.ts --project chromium --project firefox --project webkit --workers=2 --grep \'(basic-lazy-component-multi(-import)?|basic-lynx-reload)$\' --output midscene-original-results/lazy-components-csr/results --config playwright.original-evidence.config.ts',
  );
  const filter = new RegExp(step.run.match(/--grep '([^']+)'/)[1]);
  assert.deepEqual(
    [...originals.keys()].filter(name => filter.test(name)),
    names,
  );
  assert.ok(
    steps.indexOf(step)
      < steps.findIndex(item => item.name === 'Start web-core-e2e dev shell'),
  );
});

test('both original lazy inputs preserve their skip, two indexed clicks, three waits and six ordered CSS checks', async () => {
  for (const name of names.filter(name => name !== 'basic-lynx-reload')) {
    const events = [];
    const callback = runInNewContext(
      '(' + ts.transpileModule(originals.get(name).getText(source), {
        compilerOptions: { target: ts.ScriptTarget.ESNext },
      }).outputText.trim().replace(/;$/, '') + ')',
      {
        isSSR: false,
        test: { skip: (...args) => events.push(['skip', ...args]) },
        goto: async (_page, title) => events.push(['goto', title]),
        wait: async ms => events.push(['wait', ms]),
        expect: target => ({
          toHaveCSS: async (...args) =>
            events.push(['css', ...target.key, ...args]),
        }),
      },
    );
    const page = {
      locator: selector => ({
        nth: index => ({
          key: [selector, index],
          click: async () => events.push(['click', selector, index]),
        }),
      }),
    };
    await callback({ page }, { title: name });
    const green = 'rgb(0, 128, 0)';
    const pink = 'rgb(255, 192, 203)';
    const css = (
      index,
      value,
    ) => ['css', '#target1', index, 'background-color', value];
    assert.deepEqual(events, [
      ['skip', false, 'Lazy Component not support on SSR'],
      ['goto', name],
      ['wait', 500],
      css(0, green),
      css(1, green),
      ['click', '#target2', 0],
      ['wait', 100],
      css(0, pink),
      css(1, green),
      ['click', '#target2', 1],
      ['wait', 100],
      css(0, pink),
      css(1, pink),
    ], name);
    assert.equal(
      originals.get(name).body.statements[0].getText(source),
      'test.skip(isSSR, \'Lazy Component not support on SSR\');',
    );
  }
});

test('indistinguishable same-color blocks are not counted as AI replacements', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const loaded = await loadTestProject(root + '/midscene.config.ts');
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
      for (const item of document.cases) {
        assert.ok(!names.includes(item.definition.name), item.definition.name);
      }
    }
  }
});

test('original clicked reload preserves both target identities, three waits and single inline-style reads', async () => {
  const events = [], name = 'basic-lynx-reload';
  const page = {
    locator: selector => ({
      click: async () => events.push(['click', selector]),
      getAttribute: async attribute => {
        events.push(['read', selector, attribute]);
        return { selector, attribute };
      },
    }),
  };
  const callback = runInNewContext(
    '(' + ts.transpileModule(originals.get(name).getText(source), {
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    }).outputText.trim().replace(/;$/, '') + ')',
    {
      goto: async (_page, title) => events.push(['goto', title]),
      wait: async ms => events.push(['wait', ms]),
      expect: value => ({
        toContain: expected =>
          events.push(['contains', value.selector, value.attribute, expected]),
      }),
    },
  );
  await callback({ page }, { title: name });
  assert.deepEqual(events, [
    ['goto', name],
    ['wait', 100],
    ['click', '#target'],
    ['wait', 100],
    ['read', '#target', 'style'],
    ['contains', '#target', 'style', 'green'],
    ['click', '#reload'],
    ['wait', 100],
    ['read', '#target', 'style'],
    ['contains', '#target', 'style', 'pink'],
  ]);
});
