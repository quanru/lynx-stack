import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
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
    ['expansion', 'basic-lazy-component'],
    ['expansion', 'basic-lazy-component-relative-path'],
    ['expansion', 'basic-lazy-component-when-needed'],
    ['reentrant-lazy', 'basic-lazy-component-when-need-with-itself'],
    ['relative-coordinate-tap', 'api-bindtap-lynx-view-relative'],
  ]
) {
  test(
    name
      + ' retains the complete original click, wait and CSS sequence with independent grounding',
    async () => {
      const item = YAML.parse(
        readFileSync(
          new URL('../cases/web/' + file + '.yaml', import.meta.url),
          'utf8',
        ),
      ).cases.find(c => c.name === name);
      const actions = item.steps.filter(s => s.aiAct);
      const expected = [];
      let actionIndex = 0;
      const page = {
        locator(selector) {
          return {
            selector,
            index: 0,
            nth(index) {
              return { ...this, index };
            },
            async click() {
              const action = actions[actionIndex++];
              assert.ok(action);
              assert.deepEqual(action.aiAct.options, {
                effort: 'deepThink',
                deepLocate: selector === '#target2' && [
                  'basic-lazy-component',
                  'basic-lazy-component-relative-path',
                  'basic-lazy-component-when-needed',
                ].includes(name),
                cacheable: false,
              });
              const prompt = action.aiAct.prompt;
              if (selector === '#target2') {
                assert.match(prompt, /BLUE.*RIGHT/);
                if (file === 'reentrant-lazy') {
                  assert.match(
                    prompt,
                    this.index === 0 ? /upper row ABOVE/ : /lower row BELOW/,
                  );
                }
              } else if (selector === '#target') {
                assert.match(prompt, /[Rr][Ee][Dd]/);
                assert.match(
                  prompt,
                  file === 'reentrant-lazy'
                    ? /square with no visible text/
                    : /Load Component/,
                );
              } else {
                assert.equal(selector, '#tap-area');
                assert.match(
                  prompt,
                  /BLUE square above the pink square in the offset Lynx view/,
                );
              }
              assert.match(prompt, /Stop after that single click/);
              assert.doesNotMatch(prompt, /#[\w-]+|\b\d+\s*(?:px|pixels)\b/);
              expected.push(action);
            },
          };
        },
      };
      const context = {
        isSSR: false,
        offsetCss: 'margin-top: 200px; margin-left: 200px;',
        test: {
          skip(value) {
            assert.equal(value, false);
          },
        },
        async installLynxViewStyle(target, css) {
          assert.equal(target, page);
          assert.equal(css, 'margin-top: 200px; margin-left: 200px;');
          expected.push({ 'web.prepareLynxView': { style: 'offset' } });
        },
        async goto(target, title) {
          assert.equal(target, page);
          expected.push({ gotoUrl: '${shellUrl}?casename=' + title }, {
            javascript: 'document.fonts.ready.then(() => true)',
          });
        },
        async wait(ms) {
          expected.push({
            javascript:
              'new Promise(resolve => setTimeout(() => resolve(true), ' + ms
              + '))',
          });
        },
        expect(locator) {
          return {
            async toHaveCSS(css, equals) {
              expected.push({
                'web.expect': {
                  selector: locator.selector,
                  index: locator.index,
                  css,
                  equals,
                },
              });
            },
          };
        },
      };
      await runInNewContext(
        ts.transpile('(' + callbacks.get(name).getText(source) + ')', {
          target: ts.ScriptTarget.ES2022,
        }),
        context,
      )({ page }, { title: name });
      const actual = item.steps.filter(s => !s.recordToReport).map(s =>
        s['web.expect']
          ? {
            'web.expect': {
              ...s['web.expect'],
              index: s['web.expect'].index ?? 0,
            },
          }
          : s
      );
      assert.deepEqual(actual, expected);
      assert.equal(actionIndex, actions.length);
      assert.equal(item.steps.filter(s => s.recordToReport).length, 2);
      assert.ok(
        item.steps.findIndex(s => s.recordToReport)
          < item.steps.findIndex(s => s['web.expect']),
      );
      assert.ok(item.steps.at(-1).recordToReport);
    },
  );
}
