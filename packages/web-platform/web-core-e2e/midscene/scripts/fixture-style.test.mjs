import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import {
  lynxViewInitScript,
  lynxViewStyles,
  prepareLynxViewStyle,
} from '../fixture-style.ts';
import { loadTestProject } from '@midscene/test/config';
import { fileURLToPath } from 'node:url';

test('fixture init script is identical to original pre-navigation helper', () => {
  function callback(path, helper) {
    const ast = ts.createSourceFile(
      path,
      readFileSync(new URL(path, import.meta.url), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    let result;
    function visit(node, inside = false) {
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === helper) {
        inside = true;
      }
      if (
        inside && ts.isCallExpression(node)
        && node.expression.getText(ast) === 'page.addInitScript'
      ) result = node.arguments[0];
      ts.forEachChild(node, child => visit(child, inside));
    }
    visit(ast, !helper);
    assert.ok(result);
    return ts.createPrinter({ removeComments: true }).printNode(
      ts.EmitHint.Expression,
      result,
      ast,
    );
  }
  const ast = ts.createSourceFile(
    'init.js',
    lynxViewInitScript,
    ts.ScriptTarget.Latest,
    true,
  );
  const expression = ast.statements[0].expression;
  assert.equal(
    ts.createPrinter().printNode(ts.EmitHint.Expression, expression, ast),
    callback('../../tests/reactlynx.spec.ts', 'installLynxViewStyle'),
  );
});

test('only original fixture styles are accepted, before navigation', async () => {
  const calls = [];
  const page = {
    url: () => 'about:blank',
    addInitScript: async (...args) => calls.push(args),
  };
  for (const style of ['offset', 'transform']) {
    await prepareLynxViewStyle(page, { style });
    assert.equal(
      calls.at(-1)[0].content,
      `(${lynxViewInitScript})(${JSON.stringify(lynxViewStyles[style])});`,
    );
  }
  for (
    const input of [null, {}, { style: 'toString' }, { style: 'arbitrary-css' }]
  ) {
    await assert.rejects(prepareLynxViewStyle(page, input), /requires style/);
  }
  await assert.rejects(
    prepareLynxViewStyle({ ...page, url: () => 'http://localhost:3080/' }, {
      style: 'offset',
    }),
    /before navigating/,
  );
  assert.equal(calls.length, 2);
});

test('original init script injects with an existing head or waits and disconnects', async () => {
  const config = await loadTestProject(
    fileURLToPath(new URL('../midscene.config.ts', import.meta.url)),
  );
  const fixtureNode = config.projects[0].nodes.get('web.prepareLynxView');
  for (const ready of [true, false]) {
    let script;
    const page = {
      url: () => 'about:blank',
      addInitScript: async input => {
        script = input;
      },
    };
    await fixtureNode.execute({
      scope: 'case',
      case: { runId: 'serialization-regression' },
      input: { style: 'offset' },
      context: { getPage: async () => page },
    });
    const styles = [];
    const head = { appendChild: style => styles.push(style) };
    const document = {
      head: ready ? head : null,
      documentElement: null,
      createElement: tag => {
        assert.equal(tag, 'style');
        return {};
      },
    };
    let notify;
    let disconnected = false;
    class MutationObserver {
      constructor(fn) {
        notify = fn;
      }
      observe(target, options) {
        assert.equal(target, document);
        assert.equal(options.childList, true);
        assert.equal(options.subtree, true);
      }
      disconnect() {
        disconnected = true;
      }
    }
    assert.equal(typeof script.content, 'string');
    assert.doesNotMatch(script.content, /__name/);
    runInNewContext(script.content, { document, MutationObserver });
    if (!ready) {
      assert.equal(styles.length, 0);
      notify();
      assert.equal(disconnected, false);
      document.head = head;
      notify();
      assert.equal(disconnected, true);
    } else assert.equal(notify, undefined);
    assert.equal(styles.length, 1);
    assert.equal(
      styles[0].textContent,
      'lynx-view { margin-top: 200px; margin-left: 200px; }',
    );
  }
});
