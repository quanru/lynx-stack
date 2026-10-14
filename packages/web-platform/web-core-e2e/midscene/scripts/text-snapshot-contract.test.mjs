import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const source = ts.createSourceFile(
  'original.ts',
  readFileSync(
    new URL('../../tests/reactlynx.spec.ts', import.meta.url),
    'utf8',
  ),
  ts.ScriptTarget.Latest,
  true,
);
const callbacks = new Map();
function visit(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    && ts.isStringLiteral(node.arguments[0])
  ) callbacks.set(node.arguments[0].text, node.arguments[1]);
  ts.forEachChild(node, visit);
}
visit(source);

for (
  const [file, name] of [
    ['events', 'basic-element-x-input-bindfocus'],
    ['events', 'basic-element-x-input-bindconfirm'],
    ['expansion', 'basic-lazy-component-fail'],
    ['expansion', 'basic-element-x-input-ng-bindinput'],
    ['expansion', 'basic-element-x-input-input-filter'],
    ['continuation', 'basic-element-x-textarea-input-filter'],
    ['remaining-inputs', 'basic-element-input-bindinput'],
  ]
) {
  test(`${name} retains the complete original input phases, waits and single raw text read`, async () => {
    const item = YAML.parse(
      readFileSync(
        new URL('../cases/web/' + file + '.yaml', import.meta.url),
        'utf8',
      ),
    ).cases.find(c => c.name === name);
    assert.ok(item);
    assert.equal(item.steps.filter(s => s.recordToReport).length, 2);
    assert.ok(
      item.steps.findIndex(s => s.recordToReport)
        < item.steps.findIndex(s => s['web.expect']),
    );
    assert.ok(item.steps.at(-1).recordToReport);
    const actions = item.steps.filter(s => s.aiAct);
    for (const action of actions) {
      assert.deepEqual(action.aiAct.options, {
        effort: 'deepThink',
        deepLocate: true,
        cacheable: false,
      });
    }
    const expected = [];
    let actionIndex = 0;
    let reads = 0;
    function action(kind, value) {
      const step = actions[actionIndex++];
      assert.ok(step, name + ' must retain each separate source action');
      if (kind === 'press') {
        assert.equal(value, 'Enter');
        assert.match(step.aiAct.prompt, /Enter/);
      } else if (kind === 'fill') {
        assert.ok(
          step.aiAct.prompt.includes(JSON.stringify(value)),
          'Keep the complete original literal input',
        );
      } else {
        assert.deepEqual({ ...value }, { force: true });
        assert.match(step.aiAct.prompt, /password input/);
      }
      expected.push(step);
    }
    const page = {
      locator(selector) {
        return {
          selector,
          first() {
            return this;
          },
          async click(options) {
            assert.equal(selector, 'input');
            action('click', options);
          },
          async press(key) {
            assert.ok(['input', 'textarea'].includes(selector));
            action('press', key);
          },
          async fill(value) {
            assert.ok(['input', 'textarea'].includes(selector));
            action('fill', value);
          },
          async innerText() {
            reads++;
            return { selector };
          },
        };
      },
    };
    const run = runInNewContext(
      ts.transpile('(' + callbacks.get(name).getText(source) + ')', {
        target: ts.ScriptTarget.ES2022,
      }),
      {
        isSSR: false,
        test: {
          skip(condition) {
            assert.equal(condition, false);
          },
        },
        async goto(actual, title) {
          assert.equal(actual, page);
          expected.push({ gotoUrl: '${shellUrl}?casename=' + title }, {
            javascript: 'document.fonts.ready.then(() => true)',
          });
        },
        async wait(ms) {
          expected.push({
            javascript:
              `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
          });
        },
        expect(snapshot) {
          return {
            toBe(text) {
              expected.push({
                'web.expect': {
                  selector: snapshot.selector,
                  text,
                  immediate: true,
                },
              });
            },
          };
        },
      },
    );
    await run({ page }, { title: name });
    assert.equal(reads, 1);
    assert.equal(actionIndex, actions.length);
    assert.deepEqual(item.steps.filter(s => !s.recordToReport), expected);
  });
}
