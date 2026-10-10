import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';

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
    && node.arguments[0]?.text?.startsWith(
      'basic-element-x-foldview-ng-method-setFoldExpanded',
    )
  ) {
    originals.set(node.arguments[0].text, node.arguments[1].body);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const compact = node => node.getText(ast).replace(/\s/g, '');
const cases = file =>
  YAML.parse(readFileSync(new URL('../cases/' + file, import.meta.url), 'utf8'))
    .cases;

test('FoldView pixels retain both original snapshots around one ordinary AI click', () => {
  const item = cases('web-pixels/foldview.yaml')[0];
  const body = originals.get(item.name);
  assert.deepEqual(
    body.statements.map(compact),
    [
      'await goto(page,title);',
      'await diffScreenShot(page,elementName,title,\'initial\');',
      'await page.locator(\'#tap\').click();',
      'await diffScreenShot(page,elementName,title,\'should-be-scrolled-by-method\',);',
    ].map(s => s.replace(/\s/g, '')),
  );
  assert.deepEqual(item.steps.map(s => Object.keys(s)[0]), [
    'gotoUrl',
    'javascript',
    'web.pixels',
    'aiAct',
    'web.pixels',
  ]);
  assert.equal(item.steps[0].gotoUrl, '${shellUrl}?casename=' + item.name);
  assert.equal(
    item.steps[1].javascript,
    'document.fonts.ready.then(() => true)',
  );
  for (
    const [index, suffix] of [[2, 'initial'], [
      4,
      'should-be-scrolled-by-method',
    ]]
  ) {
    const baseline = 'x-foldview-ng/' + item.name + '/' + suffix;
    assert.deepEqual(item.steps[index]['web.pixels'], { baseline });
    assert.ok(
      existsSync(
        new URL(
          '../../tests/reactlynx.spec.ts-snapshots/' + baseline
            + '-chromium-linux.png',
          import.meta.url,
        ),
      ),
    );
  }
  assert.deepEqual(item.steps[3].aiAct.options, {
    deepLocate: true,
    cacheable: false,
  });
  assert.match(item.steps[3].aiAct.prompt, /orange rectangular item/);
  assert.match(item.steps[3].aiAct.prompt, /Do not drag or scroll/);
});

test('FoldView overflow retains original one-read numeric scrollTop=200 after 100 ms', () => {
  const item = cases('web/foldview-overflow.yaml')[0];
  const statements = originals.get(item.name).statements;
  assert.equal(statements.length, 5);
  assert.equal(compact(statements[0]), 'awaitgoto(page,title);');
  assert.equal(compact(statements[1]), 'awaitpage.locator(\'#tap\').click();');
  assert.equal(compact(statements[2]), 'awaitwait(100);');
  assert.equal(
    compact(statements[3]),
    'constscrollTop=awaitpage.locator(\'#foldview\').evaluate((element,)=>element.scrollTop);',
  );
  assert.equal(compact(statements[4]), 'expect(scrollTop).toBe(200);');
  assert.deepEqual(item.steps.map(s => Object.keys(s)[0]), [
    'gotoUrl',
    'javascript',
    'aiAct',
    'javascript',
    'web.expect',
  ]);
  assert.equal(item.steps[0].gotoUrl, '${shellUrl}?casename=' + item.name);
  assert.equal(
    item.steps[1].javascript,
    'document.fonts.ready.then(() => true)',
  );
  assert.deepEqual(item.steps[2].aiAct.options, {
    deepLocate: true,
    cacheable: false,
  });
  assert.match(item.steps[2].aiAct.prompt, /orange rectangular item/);
  assert.match(item.steps[2].aiAct.prompt, /Do not drag or scroll/);
  assert.equal(
    item.steps[3].javascript,
    'new Promise(resolve => setTimeout(() => resolve(true), 100))',
  );
  assert.deepEqual(item.steps[4]['web.expect'], {
    selector: '#foldview',
    property: 'scrollTop',
    equals: 200,
    immediate: true,
  });
  const fixture = readFileSync(
    new URL(
      '../../tests/reactlynx/' + item.name + '/index.jsx',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(fixture, /offset: 99999/);
  assert.match(fixture, /smooth: false/);
  assert.match(
    fixture,
    /background-color:orange;.*bindtap=\{handleTap\} id='tap'/,
  );
});
