import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';
import { expectWebValue } from '../expectation.ts';

const document = YAML.parse(
  readFileSync(
    new URL('../cases/web/layout-bounds.yaml', import.meta.url),
    'utf8',
  ),
);
test('four layout dimensions retain original immediate boundingBox reads without AI readiness or polling', () => {
  const source = readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  );
  const ast = ts.createSourceFile(
    'source.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const bodies = new Map();
  function inspect(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) bodies.set(node.arguments[0].text, node.arguments[1].body);
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
  assert.equal(document.cases.length, 4);
  assert.deepEqual(document.afterEach, [{
    recordToReport: 'Original immediate layout assertion result',
  }]);
  for (const item of document.cases) {
    const body = bodies.get(item.name), input = item.steps[2]['web.expect'];
    assert.equal(body.statements.length, 3);
    assert.equal(body.statements[0].getText(ast), 'await goto(page, title);');
    const assignment = body.statements[1].declarationList.declarations[0];
    assert.equal(
      assignment.initializer.expression.expression.expression.expression
        .getText(ast),
      'page.locator',
    );
    assert.equal(
      assignment.initializer.expression.expression.expression.arguments[0].text,
      input.selector,
    );
    assert.equal(
      assignment.initializer.expression.expression.name.text,
      'boundingBox',
    );
    const comparison = body.statements[2].expression;
    assert.equal(comparison.expression.name.text, 'toEqual');
    assert.equal(
      comparison.expression.expression.arguments[0].name.text,
      input.bounds,
    );
    assert.equal(Number(comparison.arguments[0].getText(ast)), input.equals);
    assert.equal(input.immediate, true);
    assert.deepEqual(item.steps.slice(0, 2), [{
      gotoUrl: '${shellUrl}?casename=' + item.name,
    }, { javascript: 'document.fonts.ready.then(() => true)' }]);
    assert.match(
      source,
      /await page\.evaluate\(\(\) => document\.fonts\.ready\)/,
    );
  }
});

test('regression: a wrong first dimension cannot turn into a pass after layout catches up', async () => {
  for (const item of document.cases) {
    const input = item.steps[2]['web.expect'];
    let reads = 0, waits = 0;
    const locator = {
      async waitFor() {
        waits++;
      },
      async boundingBox() {
        return { [input.bounds]: reads++ === 0 ? 0 : input.equals };
      },
    };
    const legacy = { ...input, immediate: false };
    await expectWebValue(locator, legacy);
    assert.equal(reads, 2);
    assert.equal(waits, 1);
    reads = 0;
    waits = 0;
    await assert.rejects(expectWebValue(locator, input), /expected/);
    assert.equal(reads, 1);
    assert.equal(waits, 0);
  }
});
