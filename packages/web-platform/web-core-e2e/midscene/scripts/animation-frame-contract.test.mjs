import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

test('animation-frame actions retain original order, waits and exact text counts with independent grounding', async () => {
  const name = 'api-requestAnimationFrame';
  const source = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL('../../tests/reactlynx.spec.ts', import.meta.url),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  let callback;
  let textHelper;
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(source) === 'test'
      && node.arguments[0]?.text === name
    ) {
      assert.equal(callback, undefined);
      callback = node.arguments[1];
    }
    if (
      ts.isVariableDeclaration(node)
      && node.name.getText(source) === 'expectHasText'
    ) textHelper = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback && textHelper);
  const expected = [];
  const page = {
    getByText(text) {
      assert.ok(
        ['requestAnimationFrame', 'cancelAnimationFrame', 'loop', 'stop']
          .includes(text),
      );
      return {
        text,
        async click() {
          assert.ok(
            ['requestAnimationFrame', 'cancelAnimationFrame'].includes(text),
          );
          const prompt = text === 'requestAnimationFrame'
            ? 'Click the text "requestAnimationFrame" once. Do not click "cancelAnimationFrame". Stop after that single click.'
            : 'Click the text "cancelAnimationFrame" once. Stop after that single click.';
          expected.push({
            aiAct: {
              prompt,
              options: {
                effort: 'deepThink',
                deepLocate: true,
                cacheable: false,
              },
            },
          });
        },
      };
    },
  };
  const context = {
    async goto(target, title) {
      assert.equal(target, page);
      assert.equal(title, name);
      expected.push({ gotoUrl: '${shellUrl}?casename=' + title }, {
        javascript: 'document.fonts.ready.then(() => true)',
      });
    },
    async wait(duration) {
      expected.push({
        javascript:
          `new Promise(resolve => setTimeout(() => resolve(true), ${duration}))`,
      });
    },
    expect(locator) {
      return {
        async toHaveCount(count) {
          assert.equal(count, 1);
          expected.push({
            'web.expect': { matchingText: locator.text, count },
          });
        },
      };
    },
  };
  const compile = node =>
    ts.transpile('(' + node.getText(source) + ')', {
      target: ts.ScriptTarget.ES2022,
    });
  context.expectHasText = runInNewContext(compile(textHelper), context);
  await runInNewContext(compile(callback), context)({ page }, { title: name });
  const item = YAML.parse(
    readFileSync(
      new URL('../cases/web/text-count.yaml', import.meta.url),
      'utf8',
    ),
  ).cases.find(item => item.name === name);
  assert.ok(item);
  assert.equal(item.steps.filter(step => step.recordToReport).length, 2);
  assert.deepEqual(item.steps.filter(step => !step.recordToReport), expected);
});
