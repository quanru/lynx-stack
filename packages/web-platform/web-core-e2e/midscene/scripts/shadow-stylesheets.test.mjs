import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { expectWebValue, readShadowCSS } from '../expectation.ts';

test('shadow CSS reader preserves the original helper callback body', () => {
  function body(path, name) {
    const ast = ts.createSourceFile(
      path,
      readFileSync(new URL(path, import.meta.url), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    let found;
    function visit(node, inside = false) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
        found = node.body;
      }
      if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
        inside = true;
      }
      if (
        inside && ts.isCallExpression(node)
        && node.expression.getText(ast) === 'locator.evaluate'
      ) found = node.arguments[0].body;
      ts.forEachChild(node, child => visit(child, inside));
    }
    visit(ast);
    assert.ok(found);
    return ts.createPrinter({ removeComments: true }).printNode(
      ts.EmitHint.Unspecified,
      found,
      ast,
    );
  }
  assert.equal(
    body('../expectation.ts', 'readShadowCSS'),
    body('../../tests/reactlynx.spec.ts', 'getInShadowCSS'),
  );
});

test('inline and fetched shadow styles are joined in original order; fetch errors propagate', async () => {
  const calls = [];
  const savedFetch = globalThis.fetch;
  const element = {
    shadowRoot: {
      querySelectorAll: selector => {
        if (selector === 'style') {
          return [{ textContent: 'inline' }, {
            textContent: null,
          }];
        }
        assert.equal(selector, 'link[rel="stylesheet"]');
        return [{ href: 'https://example.test/style1.css' }, {
          href: 'https://example.test/style2.css',
        }];
      },
    },
  };
  try {
    globalThis.fetch = async url => {
      calls.push(url);
      return {
        text: async () =>
          url.endsWith('1.css') ? ':host, lynx-view {' : 'linked2',
      };
    };
    assert.equal(
      await readShadowCSS(element),
      'inline\n\n:host, lynx-view {\nlinked2',
    );
    assert.deepEqual(calls, [
      'https://example.test/style1.css',
      'https://example.test/style2.css',
    ]);
    globalThis.fetch = async () => {
      throw new Error('stylesheet fetch failed');
    };
    await assert.rejects(readShadowCSS(element), /stylesheet fetch failed/);
    await assert.rejects(readShadowCSS({ shadowRoot: null }));
  } finally {
    globalThis.fetch = savedFetch;
  }
});

test('shadow host-rule checks retain exact regex and single-read semantics', async () => {
  for (const value of [':host,lynx-view {', ':host \n,\t lynx-view\n{']) {
    await expectWebValue({
      evaluate: async fn => {
        assert.equal(fn, readShadowCSS);
        return value;
      },
    }, { selector: 'lynx-view', shadowCssHostRule: true });
  }
  for (
    const value of [
      'LYNX-VIEW {',
      'lynx-view, :host {',
      ':host .lynx-view {',
      ':host, lynx-view-extra {',
    ]
  ) {
    let reads = 0;
    await assert.rejects(
      expectWebValue({
        evaluate: async () => {
          reads++;
          return reads === 1 ? value : ':host,lynx-view {';
        },
      }, { selector: 'lynx-view', shadowCssHostRule: true }),
      /original host rule/,
    );
    assert.equal(reads, 1);
  }
  for (
    const input of [
      { shadowCssHostRule: true },
      { selector: 'x', shadowCssHostRule: false },
      { selector: 'x', shadowCssHostRule: true, text: 'x' },
      { selector: 'x', shadowCssHostRule: true, index: -1 },
    ]
  ) {
    await assert.rejects(
      expectWebValue({
        evaluate: async () => assert.fail('must not read'),
      }, input),
      /requires a selector/,
    );
  }
});
