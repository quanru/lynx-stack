import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';
import {
  originalPixelOptions,
  pixelOptions,
  expectWebPixels,
} from '../web-pixels.ts';

test('textarea/default-display pixels preserve all source statements, paths, waits and the original 2% exception', () => {
  const ast = ts.createSourceFile(
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
      new URL('../cases/web-pixels/textarea-static.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  assert.equal(cases.length, 3);
  const originals = new Map();
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && cases.some(item => item.name === node.arguments[0]?.text)
    ) originals.set(node.arguments[0].text, node.arguments[1].body);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const item of cases) {
    const original = originals.get(item.name);
    const waits = [];
    let baseline, overrides = {};
    for (const statement of original.statements) {
      assert.ok(
        ts.isExpressionStatement(statement)
          && ts.isAwaitExpression(statement.expression),
      );
      const call = statement.expression.expression;
      assert.ok(ts.isCallExpression(call));
      const name = call.expression.getText(ast);
      assert.ok(
        ['goto', 'wait', 'diffScreenShot'].includes(name),
        'Do not drop any action or acceptance statement',
      );
      if (name === 'goto') assert.equal(call.getText(ast), 'goto(page, title)');
      else if (name === 'wait') {
        waits.push(Number(call.arguments[0].getText(ast)));
      } else {
        const parts = call.arguments.slice(1, 4).map(arg =>
          arg.getText(ast) === 'title' ? item.name : arg.text
        );
        if (parts.length === 2) parts.push('index');
        // Original screenshot path normalizes the explicitly empty subcase.
        baseline = parts.filter(part => part !== '').join('/');
        if (call.arguments[4]) {
          overrides = JSON.parse(
            JSON.stringify(
              runInNewContext('(' + call.arguments[4].getText(ast) + ')'),
            ),
          );
        }
      }
    }
    assert.deepEqual(item.steps.map(s => Object.keys(s)[0]), [
      'gotoUrl',
      'javascript',
      ...waits.map(() => 'javascript'),
      'web.pixels',
    ]);
    assert.equal(item.steps[0].gotoUrl, '${shellUrl}?casename=' + item.name);
    assert.equal(
      item.steps[1].javascript,
      'document.fonts.ready.then(() => true)',
    );
    assert.deepEqual(
      item.steps.slice(2, -1),
      waits.map(duration => ({
        javascript:
          `new Promise(resolve => setTimeout(() => resolve(true), ${duration}))`,
      })),
    );
    assert.deepEqual(item.steps.at(-1)['web.pixels'], { baseline });
    assert.deepEqual(originalPixelOptions(baseline), {
      ...pixelOptions,
      ...overrides,
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
  }
});

test('pixel backend applies 2% only to the one exact source PNG and accepts normalized two-part paths', async () => {
  const special = 'x-textarea/placeholder-font-size/font-size/index';
  for (
    const [baseline, ratio] of [[special, 0.02], [
      'config-css-default-display-linear-false/index',
      0,
    ], ['x-textarea/basic-element-x-textarea-color/initial', 0]]
  ) {
    const expected = readFileSync(
      new URL(
        '../../tests/reactlynx.spec.ts-snapshots/' + baseline
          + '-chromium-linux.png',
        import.meta.url,
      ),
    );
    let calls = 0;
    await expectWebPixels(
      {
        _expectScreenshot: async options => {
          calls++;
          assert.deepEqual(options, {
            ...pixelOptions,
            maxDiffPixelRatio: ratio,
            expected,
          });
          return {};
        },
      },
      baseline,
      'source-ratio',
    );
    assert.equal(calls, 1);
  }
  for (
    const baseline of [
      special + '-other',
      special.toUpperCase(),
      'text/nest-text/index',
    ]
  ) {
    assert.equal(originalPixelOptions(baseline).maxDiffPixelRatio, 0);
  }
  originalPixelOptions(special).maxDiffPixelRatio = 1;
  assert.equal(originalPixelOptions(special).maxDiffPixelRatio, 0.02);
  for (const bad of ['text//index', 'text/../index']) {
    await assert.rejects(expectWebPixels({}, bad, 'bad-path'), /Invalid/);
  }
});
