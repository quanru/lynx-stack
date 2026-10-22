import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { collectWorkflowDocument } from '@midscene/test';
import { loadTestProject } from '@midscene/test/config';
import { expectWebValue } from '../expectation.ts';

test('auto-scroll translations retain original selectors, read order, thresholds and observation windows', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { projects } = await loadTestProject(root + '/midscene.config.ts');
  const project = projects.find(item => item.name === 'web-shell');
  const document = collectWorkflowDocument({
    projectId: project.projectId,
    projectName: project.name,
    sourcePath: 'cases/web/auto-scroll.yaml',
    absolutePath: root + '/cases/web/auto-scroll.yaml',
  }, {
    resolveNode: project.nodes.get.bind(project.nodes),
    variables: project.variables,
    env: process.env,
  });
  const source = readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  );
  const ast = ts.createSourceFile(
    'original.ts',
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
      originals.set(node.arguments[0].text, node.arguments[1].body);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(document.cases.length, 2);
  for (const { definition } of document.cases) {
    const item = {
      name: definition.name,
      steps: definition.steps.map(step => ({ [step.node]: step.input })),
    };
    const body = originals.get(item.name);
    assert.ok(body);
    const selectors = [],
      waits = [],
      comparisons = [],
      reads = [],
      clickTargets = [];
    function collect(node) {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(ast);
        if (name === 'page.locator') selectors.push(node.arguments[0].text);
        if (name === 'wait') waits.push(Number(node.arguments[0].getText(ast)));
        if (name === 'scrollView.evaluate') {
          reads.push(node.arguments[0].body.getText(ast).trim());
        }
        if (name.endsWith('.click')) {
          clickTargets.push(node.expression.expression.getText(ast));
        }
        if (
          ts.isPropertyAccessExpression(node.expression)
          && ['toBe', 'toBeGreaterThan'].includes(node.expression.name.text)
        ) {
          comparisons.push([
            node.expression.name.text,
            Number(node.arguments[0].getText(ast)),
          ]);
        }
      }
      ts.forEachChild(node, collect);
    }
    collect(body);
    const selector = item.name === 'basic-main-query-selector'
      ? 'scroll-view'
      : '#scroll-view';
    assert.deepEqual(selectors, [
      selector,
      item.name === 'basic-main-query-selector' ? '#tap-me' : '#target',
    ]);
    assert.deepEqual(reads, ['node.scrollTop', 'node.scrollTop']);
    assert.deepEqual(comparisons, [['toBe', 0], ['toBeGreaterThan', 100]]);
    assert.equal(clickTargets.length, 1);
    assert.deepEqual(item.steps.map(step => Object.keys(step)[0]), [
      'gotoUrl',
      'javascript',
      'recordToReport',
      'web.expect',
      'aiAct',
      'javascript',
      'web.expect',
      'recordToReport',
    ]);
    assert.equal(
      item.steps[0].gotoUrl.url,
      project.variables.shellUrl + '?casename=' + item.name,
    );
    assert.deepEqual(
      item.steps.filter(step => step.javascript).map(step =>
        step.javascript.script
      ),
      waits.map(ms =>
        `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`
      ),
    );
    assert.deepEqual(item.steps[3]['web.expect'], {
      selector,
      property: 'scrollTop',
      equals: 0,
      immediate: true,
    });
    assert.deepEqual(item.steps[6]['web.expect'], {
      selector,
      property: 'scrollTop',
      greaterThan: 100,
      immediate: true,
    });
    assert.match(item.steps[4].aiAct.prompt, /Tap me to enable auto-scroll/);
    assert.match(item.steps[4].aiAct.prompt, /Do not manually scroll/);
  }
});

test('scrollTop uses one exact numeric JavaScript-property read without polling or coercion', async () => {
  for (
    const [input, value] of [[{ equals: 0 }, 0], [
      { greaterThan: 100 },
      100.001,
    ]]
  ) {
    let reads = 0;
    await expectWebValue({
      evaluate: async fn => {
        reads++;
        return fn({ scrollTop: value });
      },
    }, {
      selector: 'scroll-view',
      property: 'scrollTop',
      immediate: true,
      ...input,
    });
    assert.equal(reads, 1);
  }
  for (const value of [100, 0, null, undefined, '101', NaN]) {
    let reads = 0;
    await assert.rejects(expectWebValue({
      evaluate: async fn => {
        reads++;
        return fn({ scrollTop: reads === 1 ? value : 200 });
      },
    }, {
      selector: 'scroll-view',
      property: 'scrollTop',
      greaterThan: 100,
      immediate: true,
    }));
    assert.equal(reads, 1);
  }
  for (
    const input of [
      { equals: '0', immediate: true },
      { greaterThan: '100', immediate: true },
      { equals: 0 },
      { equals: 0, greaterThan: 100, immediate: true },
      { equals: 0, immediate: false },
    ]
  ) {
    await assert.rejects(
      expectWebValue({ evaluate: async () => assert.fail('must not read') }, {
        selector: 'scroll-view',
        property: 'scrollTop',
        ...input,
      }),
      /requires one valid/,
    );
  }
});
