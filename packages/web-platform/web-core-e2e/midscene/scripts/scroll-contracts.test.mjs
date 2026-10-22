import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';
import { expectWebValue } from '../expectation.ts';

const original = ts.createSourceFile(
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
    ts.isCallExpression(node) && node.expression.getText(original) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) originals.set(node.arguments[0].text, node.arguments[1]);
  ts.forEachChild(node, visit);
}
visit(original);
const document = YAML.parse(readFileSync(
  new URL('../cases/web/scroll-contracts.yaml', import.meta.url),
  'utf8',
));
const normalize = text =>
  ts.transpileModule(text, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/[\s();]/g, '');

test('migrated list YAML executes through the real immediate CSS assertion adapter', async () => {
  const inputs = document.cases[1].steps.flatMap(step =>
    step['web.expect'] ? [step['web.expect']] : []
  );
  assert.deepEqual(inputs.map(input => input.equals), ['100px', '200px']);
  for (const input of inputs) {
    for (const matches of [true, false]) {
      let reads = 0;
      const element = {};
      const locator = {
        waitFor: async () => {
          throw new Error('must not add a wait before the original raw read');
        },
        evaluate: async (fn, property) =>
          runInNewContext(`(${fn})(element, property)`, {
            element,
            property,
            getComputedStyle: target => {
              assert.equal(target, element);
              return {
                getPropertyValue: name => {
                  assert.equal(name, 'height');
                  reads++;
                  // A second read would hide an initial mismatch.
                  return matches || reads > 1 ? input.equals : '99px';
                },
              };
            },
          }),
      };
      if (matches) await expectWebValue(locator, input);
      else await assert.rejects(expectWebValue(locator, input), /got "99px"/);
      assert.equal(reads, 1);
    }
  }
});

test('scrollability retains all twenty-seven ordered CSS checks and the single toggle', async () => {
  assert.equal(document.cases.length, 2);
  assert.ok(document.afterEach[0].recordToReport);
  const item = document.cases[0];
  assert.equal(item.name, 'basic-element-scroll-view-scrollable');
  const expected = [];
  const callback = ts.transpileModule(
    '(' + originals.get(item.name).getText(original) + ')',
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    },
  ).outputText.trim().replace(/;$/, '');
  const page = {
    locator: selector => ({
      selector,
      click: async () => expected.push(['click', selector]),
    }),
  };
  await runInNewContext(callback + '({page}, {title})', {
    page,
    title: item.name,
    goto: async (_page, title) => expected.push(['goto', title], ['fonts']),
    wait: async ms => expected.push(['wait', ms]),
    expect: locator => ({
      toHaveCSS: async (css, value) =>
        expected.push(['css', locator.selector, css, value]),
    }),
  });
  const actual = item.steps.flatMap(step => {
    if (step.recordToReport) return [];
    if (step.gotoUrl) return [['goto', step.gotoUrl.split('?casename=')[1]]];
    if (step.javascript === 'document.fonts.ready.then(() => true)') {
      return [['fonts']];
    }
    if (step.javascript) {
      const match =
        /^new Promise\(resolve => setTimeout\(\(\) => resolve\(true\), (\d+)\)\)$/
          .exec(step.javascript);
      assert.ok(match);
      return [['wait', Number(match[1])]];
    }
    if (step.aiAct) {
      assert.match(step.aiAct.prompt, /small outlined button labeled scrof/);
      assert.match(step.aiAct.prompt, /Stop after that single click/);
      assert.deepEqual(step.aiAct.options, {
        deepThink: true,
        deepLocate: true,
        cacheable: false,
      });
      return [['click', '.toggle-scroll']];
    }
    const input = step['web.expect'];
    assert.deepEqual(Object.keys(input).sort(), ['css', 'equals', 'selector']);
    return [['css', input.selector, input.css, input.equals]];
  });
  assert.deepEqual(actual, expected);
  assert.equal(actual.filter(event => event[0] === 'css').length, 27);
  assert.equal(actual.filter(event => event[0] === 'click').length, 1);
});

test('list measurement retains immediate exact height reads and the original scrollTo API body', () => {
  const item = document.cases[1];
  assert.equal(item.name, 'basic-element-list-estimated-main-axis-size-px');
  const body = originals.get(item.name).body;
  assert.equal(
    body.statements.length,
    5,
    'Every original statement must be mapped',
  );
  const expected = [];
  for (const statement of body.statements) {
    assert.ok(ts.isExpressionStatement(statement));
    const expression = ts.isAwaitExpression(statement.expression)
      ? statement.expression.expression
      : statement.expression;
    assert.ok(ts.isCallExpression(expression));
    const name = expression.expression.getText(original);
    if (name === 'goto') expected.push(['goto', item.name], ['fonts']);
    else if (name === 'wait') {
      expected.push([
        'wait',
        Number(expression.arguments[0].getText(original)),
      ]);
    } else if (name === 'page.evaluate') {
      expected.push([
        'api',
        normalize(expression.arguments[0].body.getText(original)),
      ]);
    } else {
      assert.equal(
        normalize(name),
        normalize(
          'expect(await page.locator(\'#target\').evaluate((e) => getComputedStyle(e).getPropertyValue(\'height\'))).toBe',
        ),
      );
      expected.push([
        'css',
        '#target',
        'height',
        expression.arguments[0].text,
        true,
      ]);
    }
  }
  const actual = item.steps.map(step => {
    if (step.gotoUrl) return ['goto', step.gotoUrl.split('?casename=')[1]];
    if (step['web.expect']) {
      const input = step['web.expect'];
      assert.deepEqual(Object.keys(input).sort(), [
        'css',
        'equals',
        'immediate',
        'selector',
      ]);
      return ['css', input.selector, input.css, input.equals, input.immediate];
    }
    if (step.javascript === 'document.fonts.ready.then(() => true)') {
      return ['fonts'];
    }
    const timer =
      /^new Promise\(resolve => setTimeout\(\(\) => resolve\(true\), (\d+)\)\)$/
        .exec(step.javascript);
    if (timer) return ['wait', Number(timer[1])];
    const script = ts.createSourceFile(
      'step.js',
      step.javascript,
      ts.ScriptTarget.Latest,
      true,
    );
    const callback = script.statements[0].expression.expression.expression;
    assert.equal(callback.body.statements.length, 2);
    assert.equal(callback.body.statements[1].getText(script), 'return true;');
    return [
      'api',
      normalize('{' + callback.body.statements[0].getText(script) + '}'),
    ];
  });
  assert.deepEqual(actual, expected);
});
