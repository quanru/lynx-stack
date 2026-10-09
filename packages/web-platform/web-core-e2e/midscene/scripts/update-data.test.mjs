import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import YAML from 'yaml';

test('updateData cases preserve original ordered API payloads, modes, CSS assertions, routes and waits', () => {
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
      new URL('../cases/web/update-data.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  const originals = new Map();
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(original) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) originals.set(node.arguments[0].text, node.arguments[1].body);
    ts.forEachChild(node, visit);
  }
  visit(original);
  function argumentValue(arg) {
    if (ts.isStringLiteral(arg)) return arg.text;
    if (ts.isObjectLiteralExpression(arg)) {
      return Object.fromEntries(arg.properties.map(property => {
        assert.ok(ts.isPropertyAssignment(property));
        assert.ok(
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name),
        );
        return [property.name.text, argumentValue(property.initializer)];
      }));
    }
    assert.fail('unsupported original API argument');
  }
  assert.equal(cases.length, 3);
  for (const item of cases) {
    const body = originals.get(item.name);
    assert.ok(body);
    const events = [];
    function collect(node) {
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(original);
        if (name === 'goto') {
          events.push([
            'goto',
            ts.isStringLiteral(node.arguments[1])
              ? node.arguments[1].text
              : item.name,
          ]);
        } else if (name === 'wait') {
          events.push(['wait', Number(node.arguments[0].getText(original))]);
        } else if (name.endsWith('.toHaveCSS')) {
          events.push([
            'css',
            ...node.arguments.map(arg => arg.text),
          ]);
        } else if (name.endsWith('.updateData')) {
          events.push(['api', ...node.arguments.map(argumentValue)]);
        } else if (/\.(click|fill|press|toBe|toEqual|toHaveText)$/.test(name)) {
          assert.fail('unsupported source contract: ' + name);
        }
      }
      ts.forEachChild(node, collect);
    }
    collect(body);
    const actual = [];
    for (const step of item.steps) {
      const kind = Object.keys(step)[0];
      if (kind === 'recordToReport') continue;
      if (kind === 'gotoUrl') {
        actual.push(['goto', step.gotoUrl.split('?casename=')[1]]);
      } else if (kind === 'web.expect') {
        assert.equal(step['web.expect'].selector, '#target');
        actual.push(['css', step['web.expect'].css, step['web.expect'].equals]);
      } else if (kind === 'javascript') {
        const script = step.javascript;
        const timer =
          /^new Promise\(resolve => setTimeout\(\(\) => resolve\(true\), (\d+)\)\)$/
            .exec(script);
        if (timer) actual.push(['wait', Number(timer[1])]);
        else {
          const ast = ts.createSourceFile(
            'script.js',
            script,
            ts.ScriptTarget.Latest,
            true,
          );
          let calls = 0;
          function find(node) {
            if (
              ts.isCallExpression(node)
              && node.expression.getText(ast).endsWith('.updateData')
            ) {
              calls++;
              assert.equal(
                node.expression.expression.getText(ast),
                'document.querySelector(\'lynx-view\')',
              );
              actual.push(['api', ...node.arguments.map(argumentValue)]);
            }
            ts.forEachChild(node, find);
          }
          find(ast);
          assert.equal(calls, 1);
          const received = [];
          assert.equal(
            runInNewContext(script, {
              document: {
                querySelector(selector) {
                  assert.equal(selector, 'lynx-view');
                  return { updateData: (...args) => received.push(args) };
                },
              },
            }),
            true,
          );
          assert.equal(received.length, 1);
          assert.deepEqual(JSON.parse(JSON.stringify(received[0][0])), {
            mockData: 'updatedData',
          });
        }
      } else assert.fail('unsupported translated step: ' + kind);
    }
    assert.deepEqual(actual, events, item.name);
    assert.ok(
      item.steps.findIndex(s => s.recordToReport)
        < item.steps.findIndex(s => s['web.expect']),
    );
  }
});
