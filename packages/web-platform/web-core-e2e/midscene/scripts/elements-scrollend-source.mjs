import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Preserve the entire original event callback in one browser execution. In
// particular, jsonValue reads once after 300 ms; assertions must not poll a
// later event collection into passing or mix fields from different events.
export function originalScrollEnd() {
  const ast = ts.createSourceFile(
    'elements.ts',
    readFileSync(
      new URL(
        '../../../web-elements/tests/web-elements.spec.ts',
        import.meta.url,
      ),
      'utf8',
    ),
    ts.ScriptTarget.Latest,
    true,
  );
  const matches = [];
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === 'scroll-view/event-scrollend'
    ) {
      matches.push(node.arguments[1]);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(matches.length, 1);
  // JavaScript template interpolation must not be interpreted as project
  // variables by the YAML collector. Compile only template strings to concat;
  // preserve the original callback and every assertion expression otherwise.
  const transformed = ts.transform(matches[0], [context => {
    const visit = node => {
      if (ts.isTemplateExpression(node)) {
        return ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createStringLiteral(node.head.text),
            'concat',
          ),
          undefined,
          node.templateSpans.flatMap(
            span => [
              ts.visitNode(span.expression, visit),
              ts.factory.createStringLiteral(span.literal.text),
            ],
          ),
        );
      }
      return ts.visitEachChild(node, visit, context);
    };
    return root => ts.visitNode(root, visit);
  }]);
  const printed = ts.createPrinter().printNode(
    ts.EmitHint.Expression,
    transformed.transformed[0],
    ast,
  );
  transformed.dispose();
  const callback = ts.transpile('(' + printed + ')', {
    target: ts.ScriptTarget.ES2022,
  }).trim().replace(/;$/, '');
  const title = 'scroll-view/event-scrollend';
  const javascript = `
(async () => {
  const title = ${JSON.stringify(title)};
  const page = {
    evaluate: async fn => fn(),
    locator: selector => ({
      evaluateHandle: async fn => {
        const deadline = Date.now() + 30000;
        const handle = await new Promise((resolve, reject) => {
          const check = () => {
            const matches = document.querySelectorAll(selector);
            if (matches.length > 1) return reject(new Error('Original scrollend locator strictness violation'));
            if (matches.length === 1) {
              try { return resolve(fn(matches[0])); } catch (error) { return reject(error); }
            }
            if (Date.now() >= deadline) return reject(new Error('Original scrollend locator attachment timed out'));
            requestAnimationFrame(check);
          };
          check();
        });
        return { jsonValue: async () => JSON.parse(JSON.stringify(handle)) };
      },
    }),
  };
  const gotoWebComponentPage = async (actualPage, fixture) => {
    if (actualPage !== page || fixture !== title) throw new Error('Original scrollend fixture changed');
  };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const expect = (actual, message) => ({
    toBe: expected => {
      if (!Object.is(actual, expected)) throw new Error(message + ': actual ' + String(actual));
    },
    not: { toEqual: expected => {
      if (expected !== undefined) throw new Error('Unsupported original scrollend assertion');
      if (actual === undefined) throw new Error(message);
    } },
  });
  await (${callback})({ page }, { title });
  return true;
})()`;
  return {
    name: 'web-elements/' + title,
    steps: [
      { gotoUrl: '${elementsUrl}tests/fixtures/' + title + '.html' },
      { javascript: 'document.fonts.ready.then(() => true)' },
      { javascript },
    ],
  };
}
