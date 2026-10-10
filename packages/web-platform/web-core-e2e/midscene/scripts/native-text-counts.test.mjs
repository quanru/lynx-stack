import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { collectWorkflowDocument } from '@midscene/test';
import { loadTestProject } from '@midscene/test/config';
import { expectWebCount, expectWebValue } from '../expectation.ts';

test('native text counts preserve source getByText matches, sum and immediate comparisons', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { projects } = await loadTestProject(root + '/midscene.config.ts');
  const project = projects.find(item => item.name === 'web-shell');
  const doc = collectWorkflowDocument({
    projectId: project.projectId,
    projectName: project.name,
    sourcePath: 'cases/web/native-text-counts.yaml',
    absolutePath: root + '/cases/web/native-text-counts.yaml',
  }, {
    resolveNode: project.nodes.get.bind(project.nodes),
    variables: project.variables,
    env: process.env,
  });
  const ast = ts.createSourceFile(
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
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) originals.set(node.arguments[0].text, node.arguments[1].body);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(doc.cases.length, 2);
  for (const { definition } of doc.cases) {
    const body = originals.get(definition.name);
    assert.ok(body);
    const texts = [], expected = [], waits = [], unsupported = [];
    let sums = 0;
    function collect(node) {
      if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.PlusToken
      ) sums++;
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(ast);
        if (name === 'page.getByText') texts.push(node.arguments[0].text);
        if (name === 'wait') waits.push(Number(node.arguments[0].getText(ast)));
        if (
          ts.isPropertyAccessExpression(node.expression)
          && node.expression.name.text.startsWith('to')
        ) {
          if (node.expression.name.text !== 'toBe') unsupported.push(name);
          expected.push(Number(node.arguments[0].getText(ast)));
        }
        if (/\.(click|fill|evaluate|innerText|textContent)$/.test(name)) {
          unsupported.push(name);
        }
      }
      ts.forEachChild(node, collect);
    }
    collect(body);
    assert.deepEqual(unsupported, []);
    const steps = definition.steps;
    assert.equal(steps[0].node, 'gotoUrl');
    assert.equal(
      steps[0].input.url,
      project.variables.shellUrl + '?casename=' + definition.name,
    );
    assert.deepEqual(
      steps.filter(s => s.node === 'javascript').map(s => s.input.script),
      waits.map(ms =>
        `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`
      ),
    );
    assert.deepEqual(waits, [500]);
    const checks = steps.filter(s => s.node === 'web.expect').map(s => s.input);
    assert.deepEqual(checks.map(c => c.count), expected);
    if (sums) {
      assert.equal(sums, 1);
      assert.deepEqual(checks, [{
        matchingTexts: texts,
        count: 1,
        immediate: true,
      }]);
    } else {
      assert.deepEqual(
        checks,
        texts.map(matchingText => ({
          matchingText,
          count: 1,
          immediate: true,
        })),
      );
    }
    assert.deepEqual(steps.map(s => s.node), [
      'gotoUrl',
      'javascript',
      'recordToReport',
      ...checks.map(() => 'web.expect'),
      'recordToReport',
    ]);
  }
});

test('aggregate counts require exactly one total match, not OR, first-match or visibility', async () => {
  const input = {
    matchingTexts: ['the count is:1', 'the count is:2'],
    count: 1,
    immediate: true,
  };
  for (const values of [[1, 0], [0, 1]]) {
    await expectWebCount(async () => values[0] + values[1], input);
  }
  for (const values of [[0, 0], [1, 1], [2, 0], [0, 2]]) {
    let reads = 0;
    await assert.rejects(
      expectWebCount(async () => {
        reads++;
        return reads === 1 ? values[0] + values[1] : 1;
      }, input),
      /expected count 1/,
    );
    assert.equal(reads, 1);
  }
  for (const matchingTexts of [[], ['x', 1], 'x', null]) {
    await assert.rejects(
      expectWebCount(async () => assert.fail('invalid input must not read'), {
        ...input,
        matchingTexts,
      }),
      /requires/,
    );
  }
  await assert.rejects(
    expectWebCount(async () => assert.fail('must not read'), {
      ...input,
      matchingText: 'x',
    }),
    /requires/,
  );
});

test('raw single counts fail after one read instead of polling into a later pass', async () => {
  let reads = 0;
  await assert.rejects(
    expectWebValue({ count: async () => ++reads === 1 ? 0 : 1 }, {
      matchingText: 'hello',
      count: 1,
      immediate: true,
    }),
    /expected count 1/,
  );
  assert.equal(reads, 1);
});

test('real SDK node sums complete getByText counts sequentially without first-match or visibility filtering', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const { projects } = await loadTestProject(root + '/midscene.config.ts');
  const node = projects.find(item => item.name === 'web-shell').nodes.get(
    'web.expect',
  );
  const calls = [];
  let active = false;
  const page = {
    getByText(text) {
      calls.push(text);
      assert.equal(active, false, 'must await the previous count');
      active = true;
      return {
        async count() {
          await Promise.resolve();
          active = false;
          return text === 'first' ? 0 : 1;
        },
      };
    },
  };
  await node.execute({
    scope: 'case',
    case: { runId: 'count-order' },
    context: { getPage: async () => page },
    input: { matchingTexts: ['first', 'second'], count: 1, immediate: true },
  });
  assert.deepEqual(calls, ['first', 'second']);
});
