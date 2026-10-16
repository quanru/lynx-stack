import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';
import { originalPixelOptions, pixelOptions } from '../web-pixels.ts';

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
  ) {
    originals.set(node.arguments[0].text, node.arguments[1].body);
  }
  ts.forEachChild(node, visit);
}
visit(original);
const document = YAML.parse(readFileSync(
  new URL('../cases/web-pixels/textarea-interactions.yaml', import.meta.url),
  'utf8',
));
const names = [
  'basic-element-x-textarea-disabled',
  'basic-element-x-textarea-maxlines',
  'basic-element-x-textarea-min-height-max-height',
  'basic-element-x-textarea-placeholder',
  'basic-element-x-textarea-placeholder-style',
  'api-animate',
];

// Ordered YAML statements do not prove click-relative timing: the animation
// case is supplementary. original-animation.test.mjs guards its source runner.
test('five textarea flows and supplementary animation retain thirteen PNGs and seven ordered clicks', () => {
  assert.deepEqual(document.cases.map(item => item.name), names);
  assert.equal(document.afterEach.length, 1);
  assert.ok(document.afterEach[0].recordToReport);
  let pixels = 0, clicks = 0;
  for (const item of document.cases) {
    const expected = [];
    const clickTarget = item.name === 'api-animate'
      ? 'page.locator(\'#target\').click'
      : [
          'basic-element-x-textarea-maxlines',
          'basic-element-x-textarea-min-height-max-height',
        ].includes(item.name)
      ? 'page.getByTestId(\'setValue\').click'
      : 'page.locator(\'.block\').first().click';
    for (const statement of originals.get(item.name).statements) {
      assert.ok(
        ts.isExpressionStatement(statement)
          && ts.isAwaitExpression(statement.expression),
        'Do not silently drop an original guard, action or assertion',
      );
      const call = statement.expression.expression;
      assert.ok(ts.isCallExpression(call));
      const name = call.expression.getText(original);
      if (name === 'goto') {
        assert.equal(call.getText(original), 'goto(page, title)');
        expected.push(['goto', item.name], ['fonts']);
      } else if (name === 'wait') {
        assert.equal(call.arguments.length, 1);
        expected.push(['wait', Number(call.arguments[0].getText(original))]);
      } else if (name === clickTarget) {
        assert.equal(call.arguments.length, 0);
        expected.push(['click']);
      } else {
        assert.equal(name, 'diffScreenShot');
        const parts = call.arguments.slice(1, 4).map(arg =>
          arg.getText(original) === 'title' ? item.name : arg.text
        );
        assert.ok(parts.every(part => typeof part === 'string'));
        if (parts.length === 2) parts.push('index');
        const baseline = parts.filter(Boolean).join('/');
        const options = call.arguments[4]
          ? JSON.parse(
            JSON.stringify(
              runInNewContext('(' + call.arguments[4].getText(original) + ')'),
            ),
          )
          : {};
        assert.deepEqual(originalPixelOptions(baseline), {
          ...pixelOptions,
          ...options,
        });
        assert.ok(
          readFileSync(
            new URL(
              '../../tests/reactlynx.spec.ts-snapshots/' + baseline
                + '-chromium-linux.png',
              import.meta.url,
            ),
          ).length > 8,
        );
        expected.push(['pixels', baseline]);
        pixels++;
      }
    }
    const actual = item.steps.map(step => {
      assert.equal(Object.keys(step).length, 1);
      if (step.gotoUrl) return ['goto', step.gotoUrl.split('?casename=')[1]];
      if (step.javascript === 'document.fonts.ready.then(() => true)') {
        return ['fonts'];
      }
      if (step.javascript) {
        const match =
          /^new Promise\(resolve => setTimeout\(\(\) => resolve\(true\), (\d+)\)\)$/
            .exec(step.javascript);
        assert.ok(match);
        return ['wait', Number(match[1])];
      }
      if (step.aiAct) {
        assert.match(step.aiAct.prompt, /Stop after that single click/);
        assert.match(
          step.aiAct.prompt,
          item.name === 'api-animate' ? /green square/ : /sky-blue/,
        );
        assert.doesNotMatch(
          step.aiAct.prompt,
          /#[\w-]+|testid|\b\d+\s*(px|pixels)\b/,
        );
        assert.deepEqual(step.aiAct.options, {
          deepThink: true,
          deepLocate: true,
          cacheable: false,
        });
        clicks++;
        return ['click'];
      }
      assert.deepEqual(Object.keys(step), ['web.pixels']);
      assert.deepEqual(Object.keys(step['web.pixels']), ['baseline']);
      return ['pixels', step['web.pixels'].baseline];
    });
    assert.deepEqual(actual, expected, item.name);
  }
  assert.equal(pixels, 13);
  assert.equal(clicks, 7);
});

test('source-specific ratio exceptions never leak to neighboring paths or web-elements', () => {
  const baselines = document.cases.flatMap(item =>
    item.steps.filter(step => step['web.pixels']).map(step =>
      step['web.pixels'].baseline
    )
  );
  assert.equal(
    baselines.filter(path =>
      originalPixelOptions(path).maxDiffPixelRatio === 0.02
    ).length,
    10,
  );
  for (const baseline of baselines) {
    assert.equal(
      originalPixelOptions(baseline, 'web-elements').maxDiffPixelRatio,
      0,
    );
    assert.equal(
      originalPixelOptions(baseline + '-other').maxDiffPixelRatio,
      0,
    );
    assert.equal(
      originalPixelOptions(baseline.toUpperCase()).maxDiffPixelRatio,
      0,
    );
  }
  assert.equal(
    originalPixelOptions('x-textarea/disabled/true/index').maxDiffPixelRatio,
    0,
  );
  assert.equal(
    originalPixelOptions('x-textarea/maxlength/default/index')
      .maxDiffPixelRatio,
    0,
  );
  originalPixelOptions(baselines[0]).maxDiffPixelRatio = 1;
  assert.equal(originalPixelOptions(baselines[0]).maxDiffPixelRatio, 0.02);
});
