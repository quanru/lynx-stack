import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the complete original callback against a recording adapter. Only its
// two visible clicks are translated; payload waits and comparisons stay exact.
export async function originalMarkdownEvents() {
  const title = 'should fire bindlink and bindimageTap events';
  const ast = ts.createSourceFile(
    'original.ts',
    readFileSync(
      new URL(
        '../../../web-elements/tests/x-markdown.spec.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  let callback;
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && node.arguments[0]?.text === title
    ) {
      assert.equal(callback, undefined);
      callback = node.arguments[1];
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(callback);
  const steps = [];
  let reads = 0;
  let clicks = 0;
  const page = {
    locator(selector) {
      assert.equal(selector, 'x-markdown');
      return {
        locator(child) {
          assert.ok(['a', 'img'].includes(child));
          return {
            async click() {
              clicks++;
              steps.push({
                aiAct: {
                  prompt: child === 'a'
                    ? 'Click once on the visible blue word "link" in the first line of markdown text. Do not click the picture or perform another action.'
                    : 'Click once in the center of the visible Firefox logo picture below the markdown text. Do not click the link or perform another action.',
                  options: { deepLocate: true, cacheable: false },
                },
              });
            },
          };
        },
      };
    },
    async waitForFunction(predicate) {
      const source = predicate.toString();
      assert.match(source, /window\._bind(?:link|image)_detail !== null/);
      steps.push({
        javascript:
          `new Promise((resolve, reject) => { const deadline = Date.now() + 30000; const check = () => { if ((${source})()) return resolve(true); if (Date.now() >= deadline) return reject(new Error('Original markdown event wait timed out')); requestAnimationFrame(check); }; check(); })`,
      });
    },
    async evaluate(fn) {
      const source = fn.toString();
      assert.match(source, /window\._bind(?:link|image)_detail/);
      const variable = `window.__originalMarkdownPayload${reads++}`;
      steps.push({
        javascript: `${variable} = structuredClone((${source})())`,
      });
      return new Proxy({}, {
        get: (_target, property) => ({
          expression: `${variable}[${JSON.stringify(property)}]`,
        }),
      });
    },
  };
  const run = vm.runInNewContext(
    ts.transpile('(' + callback.getText(ast) + ')', {
      target: ts.ScriptTarget.ES2022,
    }),
    {
      async goto(actualPage, fixture) {
        assert.equal(actualPage, page);
        assert.equal(fixture, 'x-markdown/events');
        steps.push({
          gotoUrl: '${elementsUrl}tests/fixtures/x-markdown/events.html',
        }, { javascript: 'document.fonts.ready.then(() => true)' });
      },
      expect(actual) {
        assert.ok(actual.expression);
        return {
          toBe(expected) {
            steps.push({
              javascript: `if (${actual.expression} !== ${
                JSON.stringify(expected)
              }) throw new Error('Original markdown exact event field mismatch')`,
            });
          },
          toContain(expected) {
            steps.push({
              javascript:
                `if (typeof ${actual.expression} !== 'string' || !${actual.expression}.includes(${
                  JSON.stringify(expected)
                })) throw new Error('Original markdown event URL mismatch')`,
            });
          },
        };
      },
    },
  );
  await run({ page });
  assert.equal(clicks, 2);
  assert.equal(reads, 2);
  return { name: 'web-elements/x-markdown/bindlink-bindimageTap', steps };
}
