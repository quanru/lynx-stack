import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { sourceGuardPolicy } from './bulk-source-audit.mjs';

const sha256 = text => createHash('sha256').update(text).digest('hex');
const cache = new Map();
export function browserSourceDescriptor(pkg, file, line, title) {
  const identity = pkg + '/' + file;
  if (!cache.has(identity)) {
    const url = new URL('../../../' + pkg + '/' + file, import.meta.url);
    const source = ts.createSourceFile(
      file,
      readFileSync(url, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const declarations = new Map();
    function visit(node, groups = []) {
      if (
        ts.isCallExpression(node)
        && node.expression.getText(source) === 'test.describe'
      ) groups = [...groups, node.arguments[0].text];
      if (
        ts.isCallExpression(node)
        && ['test', 'test.skip', 'test.fixme'].includes(
          node.expression.getText(source),
        ) && node.arguments.length >= 2
      ) {
        declarations.set(
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          { node, groups },
        );
      }
      ts.forEachChild(node, child => visit(child, groups));
    }
    visit(source);
    cache.set(identity, { source, declarations });
  }
  const { source, declarations } = cache.get(identity);
  const { node, groups } = declarations.get(line) ?? {};
  assert.ok(node, identity + ':' + line);
  assert.equal(node.expression.getText(source), 'test');
  const name = node.arguments[0], callback = node.arguments.at(-1);
  let expansion;
  if (ts.isTemplateExpression(name)) {
    // Only the two reviewed CSS inheritance loops expand in this batch.
    assert.ok(
      ['tests/reactlynx.spec.ts', 'tests/ssr-no-js.spec.ts'].includes(file),
    );
    assert.equal(name.head.text, 'config-css-inheritance-');
    assert.equal(name.templateSpans.length, 1);
    assert.equal(name.templateSpans[0].expression.getText(source), 'setting');
    assert.equal(name.templateSpans[0].literal.text, '');
    let loop = node.parent;
    while (loop && !ts.isForOfStatement(loop)) loop = loop.parent;
    assert.ok(loop);
    assert.equal(loop.initializer.getText(source), 'const setting');
    assert.ok(ts.isArrayLiteralExpression(loop.expression));
    const values = loop.expression.elements.map(element => {
      assert.ok(ts.isStringLiteral(element));
      return element.text;
    });
    assert.deepEqual(values, ['true', 'false', 'default']);
    assert.ok(
      values.some(value => title === 'config-css-inheritance-' + value),
    );
    expansion = {
      variable: 'setting',
      values,
      loopSha256: sha256(loop.getText(source)),
    };
  } else {
    assert.ok(ts.isStringLiteral(name));
    assert.equal(name.text, title);
  }
  const policy = sourceGuardPolicy(callback, source);
  const fullTitle = [...groups, title].join(' ');
  return {
    package: pkg,
    file,
    suite: groups[0] ?? null,
    group: groups.at(-1) ?? null,
    title,
    fullTitle,
    key: file + '::' + fullTitle,
    sourceId: 'line:' + line,
    line,
    callbackSha256: sha256(callback.getText(source)),
    skipBrowsers: policy.skipBrowsersByMode.CSR.filter(browser =>
      browser !== 'chromium'
    ),
    earlyReturnBrowsers: policy.earlyReturnBrowsersByMode.CSR.filter(browser =>
      browser !== 'chromium'
    ),
    guardEvidence: policy.guardEvidence,
    ...(expansion ? { expansion } : {}),
  };
}
