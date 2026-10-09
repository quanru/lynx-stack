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
    const lazyToggleCases = [
      'basic-lazy-component',
      'basic-lazy-component-relative-path',
      'basic-lazy-component-multi',
      'basic-lazy-component-multi-import',
      'basic-lazy-component-when-needed',
    ];
    if (lazyToggleCases.includes(item.name)) {
      const actions = item.steps.filter(step => step.aiAct).map(step =>
        step.aiAct.prompt
      );
      const toggles = actions.slice(-2);
      assert.equal(toggles.length, 2);
      for (const prompt of toggles) {
        assert.match(prompt, /BLUE.*RIGHT/);
        assert.match(prompt, /Stop after (?:that single|one) click/);
        assert.doesNotMatch(prompt, /\b\d+\s*(?:px|pixels)\b|#[\w-]+/);
      }
      if (item.name.includes('multi')) {
        assert.match(toggles[0], /upper half/);
        assert.match(toggles[1], /lower half/);
        const finalWait = item.steps.at(-1).aiWaitFor.prompt;
        assert.match(finalWait, /continuous pink column on the left/);
        assert.match(finalWait, /upper and lower halves/);
        assert.doesNotMatch(finalWait, /two pink squares/i);
      } else {
        assert.match(toggles[0], /LEFT green neighbor pink/);
        assert.match(toggles[1], /LEFT pink neighbor green/);
      }
    }
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
    const variables = new Map();
    function locatorSpec(node) {
      if (
        ts.isAwaitExpression(node) || ts.isParenthesizedExpression(node)
        || ts.isNonNullExpression(node)
      ) return locatorSpec(node.expression);
      if (ts.isIdentifier(node)) return variables.get(node.text);
      if (ts.isPropertyAccessExpression(node)) {
        return locatorSpec(node.expression);
      }
      if (
        ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
      ) {
        if (node.expression.name.text === 'locator') {
          return { selector: node.arguments[0].text, index: 0 };
        }
        const result = locatorSpec(node.expression.expression);
        if (result && node.expression.name.text === 'nth') {
          return { ...result, index: Number(node.arguments[0].getText(ast)) };
        }
        return result;
      }
      return undefined;
    }
    function scan(node) {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const spec = locatorSpec(node.initializer);
        if (spec) variables.set(node.name.getText(ast), spec);
      }
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
          let expectation = node.expression.expression;
          if (
            ts.isPropertyAccessExpression(expectation)
            && expectation.name.text === 'not'
          ) expectation = expectation.expression;
          assert.ok(
            ts.isCallExpression(expectation)
              && expectation.expression.getText(ast) === 'expect',
            item.name,
          );
          assertions.push({
            locator: locatorSpec(expectation.arguments[0]),
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
      assert.deepEqual(
        { selector: check.selector, index: check.index ?? 0 },
        originalCheck.locator,
        item.name + ' original assertion target',
      );
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
      item.steps[1].aiWaitFor || item.steps[1].aiAct,
      item.name
        + ' must create visual evidence before exact assertions can fail',
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
