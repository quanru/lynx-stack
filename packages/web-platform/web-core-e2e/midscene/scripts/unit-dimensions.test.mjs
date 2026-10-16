import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';

test('dimension fixture preparation preserves original evaluate bodies and setup waits', () => {
  const original = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL('../../tests/reactlynx.spec.ts', import.meta.url),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const cases = YAML.parse(
    readFileSync(
      new URL('../cases/web/unit-dimensions.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  assert.equal(cases.length, 3);
  const bodies = new Map();
  function visit(node, title) {
    if (
      ts.isCallExpression(node) && node.expression.getText(original) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) title = node.arguments[0].text;
    if (
      title && ts.isCallExpression(node)
      && node.expression.getText(original) === 'lynxView.evaluate'
    ) bodies.set(title, node.arguments[0].body.statements);
    ts.forEachChild(node, child => visit(child, title));
  }
  visit(original);
  const printer = ts.createPrinter({ removeComments: true });
  for (const item of cases) {
    const statements = bodies.get(item.name);
    assert.ok(statements);
    const script = item.steps[3].javascript;
    const ast = ts.createSourceFile(
      'fixture.js',
      script,
      ts.ScriptTarget.Latest,
      true,
    );
    const body = ast.statements[0].expression.expression.expression.body;
    assert.deepEqual(
      body.statements.slice(3, -1).map(s =>
        printer.printNode(ts.EmitHint.Unspecified, s, ast)
      ),
      statements.map(s =>
        printer.printNode(ts.EmitHint.Unspecified, s, original)
      ),
    );
    assert.equal(item.steps[0].gotoUrl, '${shellUrl}?casename=' + item.name);
    assert.equal(
      item.steps[1].javascript,
      'new Promise(resolve => setTimeout(() => resolve(true), 100))',
    );
    const calls = [];
    const node = {
      style: {
        set width(value) {
          calls.push(['width', value]);
        },
        setProperty: (...args) => calls.push(args),
      },
    };
    assert.equal(
      runInNewContext(script, {
        document: {
          querySelectorAll: selector => {
            assert.equal(selector, 'lynx-view');
            return [node];
          },
        },
      }),
      true,
    );
    assert.deepEqual(
      calls,
      item.name === 'basic-ppx-unit'
        ? [['width', '50px']]
        : [['width', '50px'], ['--rpx-unit', '1cqw']],
    );
    for (const matches of [[], [node, node]]) {
      assert.throws(
        () =>
          runInNewContext(script, {
            document: { querySelectorAll: () => matches },
          }),
        /exactly one/,
      );
    }
    assert.deepEqual(item.steps.map(step => Object.keys(step)[0]), [
      'gotoUrl',
      'javascript',
      'recordToReport',
      'javascript',
      'web.expect',
      'web.expect',
      'recordToReport',
    ]);
  }
});
