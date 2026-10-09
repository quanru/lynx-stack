import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { collectWorkflowDocument } from '@midscene/test';
import { loadTestProject } from '@midscene/test/config';
import { fileURLToPath } from 'node:url';

test('85 migrations retain original assertion counts, values, CSS order, and clicks', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const loaded = await loadTestProject(root + '/midscene.config.ts');
  const project = loaded.projects[0];
  const document = collectWorkflowDocument({
    projectId: project.projectId,
    projectName: project.name,
    sourcePath: 'cases/web/expansion.yaml',
    absolutePath: root + '/cases/web/expansion.yaml',
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
      originals.set(node.arguments[0].text, node);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(document.cases.length, 85);
  const cases = document.cases.map(({ definition }) => ({
    name: definition.name,
    steps: definition.steps.map(step => ({ [step.node]: step.input })),
  }));
  for (const item of cases) {
    const original = originals.get(item.name);
    assert.ok(
      original,
      item.name + ' must be an original test, not a split or invented case',
    );
    const body = original.getText(ast);
    assert.doesNotMatch(
      body,
      /diffScreenShot|toMatchSnapshot|test\.skip\(true|addInitScript|page\.evaluate/,
    );
    const assertions = [];
    function scan(node) {
      if (
        ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
      ) {
        const matcher = node.expression.name.text;
        if (
          [
            'toHaveCSS',
            'toHaveText',
            'toContainText',
            'toContain',
            'toHaveAttribute',
            'toBe',
            'toEqual',
            'toStrictEqual',
          ].includes(matcher)
        ) {
          assertions.push({
            matcher,
            args: node.arguments.map(arg =>
              ts.isStringLiteral(arg) ? arg.text : arg.getText(ast)
            ),
            not: node.expression.expression.getText(ast).endsWith('.not'),
          });
        }
      }
      ts.forEachChild(node, scan);
    }
    scan(original);
    const checks = item.steps.filter(step => step['web.expect']).map(step =>
      step['web.expect']
    );
    assert.equal(
      checks.length,
      assertions.length,
      item.name + ' assertion count',
    );
    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      const originalCheck = assertions[i];
      const expected = check.text ?? check.textContains ?? check.value
        ?? check.equals ?? check.contains;
      if (originalCheck.matcher === 'toHaveCSS') {
        assert.deepEqual([check.css, expected, check.not ?? false], [
          ...originalCheck.args,
          originalCheck.not,
        ], item.name);
      } else if (originalCheck.matcher === 'toHaveAttribute') {
        assert.equal(check.attribute, originalCheck.args[0], item.name);
        assert.equal(
          '/' + check.contains + '/g',
          originalCheck.args[1],
          item.name,
        );
      } else {
        assert.equal(String(expected), originalCheck.args[0], item.name);
      }
    }
    const clicks = (body.match(/\.click\(/g) ?? []).length;
    if (clicks) {
      assert.equal(
        item.steps.filter(step => step.aiAct).length,
        clicks,
        item.name + ' click count',
      );
    }
    assert.ok(
      item.steps.some(step => step.aiWaitFor || step.aiAct),
      item.name + ' report evidence',
    );
    assert.ok(
      item.steps.every(step =>
        ['gotoUrl', 'aiWaitFor', 'aiAct', 'web.expect'].includes(
          Object.keys(step)[0],
        )
      ),
      item.name + ' supported nodes',
    );
  }
});
