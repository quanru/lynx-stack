import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

test('cssSelector reload retains original API call, both exact CSS assertions and waits', () => {
  const ast = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL('../../tests/reactlynx.spec.ts', import.meta.url),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  let body;
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && node.arguments[0]?.text === 'config-css-selector-false-reload'
    ) body = node.arguments[1].body;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.deepEqual(
    body.statements.map(s => s.getText(ast).replace(/\s/g, '')),
    [
      'await goto(page,title);',
      'await wait(100);',
      'await expect(page.locator(\'#target\'),).toHaveCSS(\'background-color\',\'rgb(255,0,0)\');',
      'await page.evaluate(()=>{document.querySelector(\'lynx-view\')?.reload();});',
      'await wait(1000);',
      'await expect(page.locator(\'#target\'),).toHaveCSS(\'background-color\',\'rgb(255,0,0)\');',
    ].map(s => s.replace(/\s/g, '')),
  );
  const item = YAML.parse(
    readFileSync(
      new URL('../cases/web/css-selector-reload.yaml', import.meta.url),
      'utf8',
    ),
  ).cases[0];
  assert.equal(item.name, 'config-css-selector-false-reload');
  const steps = item.steps;
  assert.deepEqual(steps.map(s => Object.keys(s)[0]), [
    'gotoUrl',
    'javascript',
    'javascript',
    'web.expect',
    'javascript',
    'javascript',
    'web.expect',
  ]);
  assert.equal(steps[0].gotoUrl, '${shellUrl}?casename=' + item.name);
  assert.equal(steps[1].javascript, 'document.fonts.ready.then(() => true)');
  for (const index of [3, 6]) {
    assert.deepEqual(steps[index]['web.expect'], {
      selector: '#target',
      css: 'background-color',
      equals: 'rgb(255, 0, 0)',
    });
  }
  for (const [index, duration] of [[2, 100], [5, 1000]]) {
    assert.equal(
      steps[index].javascript,
      `new Promise(resolve => setTimeout(() => resolve(true), ${duration}))`,
    );
  }
  const events = [];
  runInNewContext(steps[4].javascript, {
    document: {
      querySelector(selector) {
        events.push(['querySelector', selector]);
        return {
          reload() {
            events.push(['reload']);
          },
        };
      },
    },
  });
  assert.deepEqual(events, [['querySelector', 'lynx-view'], ['reload']]);
  // Preserve optional chaining; no selector-driven action substitute or forced reload.
  runInNewContext(steps[4].javascript, {
    document: { querySelector: () => null },
  });
});
