import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';
import {
  createConsoleEvidence,
  expectWebRuntime,
} from '../runtime-contract.ts';

test('console occurrence contracts keep exact messages and never poll or accept partial evidence', () => {
  const evidence = createConsoleEvidence();
  evidence.record('main thread: undefined, undefined');
  assert.throws(
    () => evidence.expectTexts(['background thread: undefined, undefined']),
    /not observed/,
  );
  assert.throws(
    () => evidence.expectTexts(['main thread: undefined, undefined ']),
    /not observed/,
  );
  evidence.record('background thread: undefined, undefined');
  expectWebRuntime(
    {
      consoleTexts: [
        'main thread: undefined, undefined',
        'background thread: undefined, undefined',
      ],
    },
    evidence,
    () => {
      throw new Error('not a worker assertion');
    },
  );
  for (
    const input of [
      { consoleTexts: [] },
      { consoleTexts: [1] },
      { workerCountAtMost: -1 },
      { workerCountAtMost: 2.5 },
      { workerCountAtMost: 1, consoleTexts: ['x'] },
      { selector: '#target', consoleTexts: ['x'] },
    ]
  ) {
    assert.throws(() => expectWebRuntime(input, evidence, () => 0));
  }
  const overflow = createConsoleEvidence();
  overflow.record('expected');
  overflow.record('x'.repeat(2 * 1024 * 1024));
  assert.throws(() => overflow.expectTexts(['expected']), /partial evidence/);
});

test('worker upper bounds are single immediate reads, retaining all boundary values', () => {
  for (const bound of [1, 2, 3]) {
    let reads = 0;
    expectWebRuntime(
      { workerCountAtMost: bound },
      createConsoleEvidence(),
      () => {
        reads++;
        return bound;
      },
    );
    assert.equal(reads, 1);
    assert.throws(
      () =>
        expectWebRuntime(
          { workerCountAtMost: bound },
          createConsoleEvidence(),
          () => bound + 1,
        ),
      /workers/,
    );
  }
});

test('console and worker YAML preserve original messages, callback API, waits and release count', () => {
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
  const originals = new Map();
  function find(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) originals.set(node.arguments[0].text, node.arguments[1].body);
    ts.forEachChild(node, find);
  }
  find(ast);
  for (const file of ['console-contracts', 'worker-lifecycle', 'timing-keys']) {
    const cases = YAML.parse(
      readFileSync(
        new URL('../cases/web/' + file + '.yaml', import.meta.url),
        'utf8',
      ),
    ).cases;
    for (const item of cases) {
      const body = originals.get(item.name);
      assert.ok(body);
      const waits = [], messages = [], bounds = [], timingKeys = [];
      let removals = 0, booleanAssertions = 0;
      function inspect(node) {
        if (ts.isCallExpression(node)) {
          const name = node.expression.getText(ast);
          if (name === 'wait') {
            waits.push(Number(node.arguments[0].getText(ast)));
          }
          if (name.endsWith('.toBeLessThanOrEqual')) {
            bounds.push(Number(node.arguments[0].getText(ast)));
          }
          if (name.endsWith('.toContainEqual')) {
            timingKeys.push(node.arguments[0].text);
          }
          if (name.endsWith('.remove')) removals++;
          if (name.endsWith('.toBe')) {
            assert.equal(node.arguments[0].getText(ast), 'true');
            booleanAssertions++;
          }
          if (/\.to[A-Z]/.test(name)) {
            assert.match(
              name,
              /\.(toBe|toBeLessThanOrEqual|toContainEqual|toHaveCSS)$/,
            );
          }
        }
        if (
          ts.isBinaryExpression(node)
          && node.left.getText(ast) === 'message.text()'
        ) messages.push(node.right.text);
        ts.forEachChild(node, inspect);
      }
      inspect(body);
      const scripts = item.steps.filter(s => s.javascript).map(s =>
        s.javascript
      );
      assert.deepEqual(
        scripts.flatMap(s => {
          const m =
            /^new Promise\(resolve => setTimeout\(\(\) => resolve\(true\), (\d+)\)\)$/
              .exec(s);
          return m ? [Number(m[1])] : [];
        }),
        waits,
        item.name,
      );
      const checks = item.steps.filter(s => s['web.expect']).map(s =>
        s['web.expect']
      );
      if (file === 'worker-lifecycle') {
        assert.deepEqual(checks.map(c => c.workerCountAtMost), bounds);
        assert.equal(
          scripts.filter(s =>
            s === 'document.body.querySelector(\'lynx-view\')?.remove()'
          ).length,
          removals,
        );
        assert.equal(
          item.steps[0].gotoUrl,
          '${shellUrl}?casename=api-setSharedData&casename2=api-getSharedData',
        );
      } else if (file === 'console-contracts') {
        assert.equal(
          item.steps[0].gotoUrl,
          '${shellUrl}?casename=' + item.name,
        );
        if (item.name === 'api-updateData-callback') {
          assert.match(
            body.getText(ast),
            /message\.text\(\) === 'update Data success'/,
          );
          const received = [];
          runInNewContext(scripts[1], {
            document: {
              querySelector: () => ({
                updateData: (data, mode, callback) => {
                  received.push(JSON.parse(JSON.stringify(data)), mode);
                  callback();
                },
              }),
            },
            console: { log: text => received.push(text) },
          });
          assert.deepEqual(received, [
            { mockData: 'updatedData' },
            'default',
            'update Data success',
          ]);
          assert.deepEqual(checks, [{ consoleTexts: ['update Data success'] }]);
          const originalAPI = [];
          function api(node) {
            if (
              ts.isCallExpression(node)
              && node.expression.getText(ast) === 'page.evaluate'
            ) {
              originalAPI.push(
                node.arguments[0].body.statements.map(s => s.getText(ast)).join(
                  '\n',
                ),
              );
            }
            ts.forEachChild(node, api);
          }
          api(body);
          assert.equal(originalAPI.length, 1);
          const translated = ts.createSourceFile(
            'script.ts',
            scripts[1],
            ts.ScriptTarget.Latest,
            true,
          );
          const statements =
            translated.statements[0].expression.expression.expression.body
              .statements;
          const normalize = code =>
            ts.transpileModule(code, {
              compilerOptions: { target: ts.ScriptTarget.ES2022 },
            })
              .outputText.replace(/,\s*([})])/g, '$1').replace(/[\s();]/g, '');
          assert.equal(
            normalize(
              statements.slice(0, -1).map(s => s.getText(translated)).join(
                '\n',
              ),
            ),
            normalize(originalAPI[0]),
          );
          assert.equal(booleanAssertions, 1);
        } else {
          assert.deepEqual(checks.flatMap(c => c.consoleTexts), messages);
          assert.equal(
            booleanAssertions,
            item.name.startsWith('basic-mts-') ? 1 : 2,
          );
        }
        assert.ok(
          body.getText(ast).indexOf('page.on(\'console\'')
            < body.getText(ast).indexOf('goto(page'),
        );
        const originalClicks =
          (body.getText(ast).match(/await target\.click\(\)/g) ?? []).length;
        assert.equal(item.steps.filter(s => s.aiAct).length, originalClicks);
        if (originalClicks) {
          assert.match(
            item.steps.find(s => s.aiAct).aiAct,
            /pink square.*once.*single click/,
          );
        }
      } else {
        const script = scripts.at(-1);
        const timing = Object.fromEntries(timingKeys.map(key => [key, 0]));
        assert.equal(timingKeys.length, 13);
        assert.equal(runInNewContext(script, { timing }), true);
        for (const missing of timingKeys) {
          const partial = { ...timing };
          delete partial[missing];
          assert.throws(
            () => runInNewContext(script, { timing: partial }),
            /missing/,
          );
        }
        assert.deepEqual(checks, [{
          selector: '#target',
          css: 'background-color',
          equals: 'rgb(0, 128, 0)',
        }]);
      }
    }
  }
});
