import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const source = ts.createSourceFile(
  'web-elements.spec.ts',
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
const names = [
  'crossorigin',
  'referrerpolicy',
  'should not have loading attribute by default',
];
const callbacks = new Map();
const helpers = new Map();
function visit(node) {
  if (
    ts.isCallExpression(node) && node.expression.getText(source) === 'test'
    && names.includes(node.arguments[0]?.text)
  ) {
    assert.ok(!callbacks.has(node.arguments[0].text));
    callbacks.set(node.arguments[0].text, node.arguments[1]);
  }
  if (
    ts.isVariableDeclaration(node)
    && ['gotoWebComponentPage', 'getTitle'].includes(node.name.getText(source))
  ) {
    helpers.set(node.name.getText(source), node.initializer);
  }
  ts.forEachChild(node, visit);
}
visit(source);
const compile = node =>
  ts.transpile('(' + node.getText(source) + ')', {
    target: ts.ScriptTarget.ES2022,
  });

async function execute(name, state, translated) {
  const trace = [];
  const context = {
    document: {
      fonts: {
        get ready() {
          trace.push(['fonts']);
          return Promise.resolve();
        },
      },
      querySelector(selector) {
        trace.push(['host', selector]);
        if (state === 'missing-host') return null;
        return {
          shadowRoot: state === 'missing-shadow' ? null : {
            querySelector(selector) {
              trace.push(['shadow', selector]);
              if (state === 'missing-image') return null;
              return {
                getAttribute(attribute) {
                  trace.push(['attribute', attribute]);
                  if (state === 'absent') return null;
                  if (state === 'wrong') return 'wrong';
                  return ({
                    crossorigin: 'anonymous',
                    referrerpolicy: 'no-referrer',
                    loading: null,
                  })[attribute];
                },
              };
            },
          },
        };
      },
    },
    path: { join: (...parts) => parts.join('/') },
    expect(actual) {
      return {
        toBe: expected => assert.equal(actual, expected),
        toBeNull: () => assert.equal(actual, null),
      };
    },
  };
  let passed = true;
  try {
    if (translated) {
      const cases = YAML.parse(
        readFileSync(
          new URL(
            '../cases/web-elements/image-attributes.yaml',
            import.meta.url,
          ),
          'utf8',
        ),
      ).cases;
      const item = cases.find(item =>
        item.name === 'web-elements/x-image/' + name
      );
      assert.ok(item);
      assert.deepEqual(item.steps.map(step => Object.keys(step)), [
        ['gotoUrl'],
        ['javascript'],
        ['recordToReport'],
        ['javascript'],
        ['recordToReport'],
      ]);
      for (const step of item.steps) {
        if (step.gotoUrl) {
          trace.push(['goto', step.gotoUrl.replace('${elementsUrl}', '/')]);
        }
        if (step.javascript) {
          await runInNewContext(step.javascript, context, { timeout: 1000 });
        }
      }
    } else {
      assert.equal(callbacks.size, 3);
      for (const [key, node] of helpers) {
        context[key] = runInNewContext(compile(node), context);
      }
      const page = {
        async goto(url, options) {
          assert.equal(options.waitUntil, 'load');
          trace.push(['goto', url]);
        },
        async evaluate(fn) {
          return fn();
        },
      };
      await runInNewContext(compile(callbacks.get(name)), context)({ page }, {
        titlePath: ['suite', 'x-image', name],
      });
    }
  } catch (error) {
    // Missing YAML/schema is a broken test setup, not an expected negative assertion.
    if (
      error.code === 'ENOENT' || error.code === 'ERR_ASSERTION' && translated
    ) throw error;
    passed = false;
  }
  return { trace, passed };
}

for (const name of names) {
  test(`x-image/${name} preserves original single-read values and missing-element failures`, async () => {
    for (
      const state of [
        'correct',
        'wrong',
        'absent',
        'missing-host',
        'missing-shadow',
        'missing-image',
      ]
    ) {
      const original = await execute(name, state, false);
      const translated = await execute(name, state, true);
      assert.deepEqual(translated, original, `${name}: ${state}`);
      assert.equal(
        original.passed,
        state === 'correct'
          || state === 'absent' && name.startsWith('should not'),
      );
      assert.equal(
        original.trace.filter(([kind]) => kind === 'host').length,
        1,
      );
      assert.ok(
        original.trace.filter(([kind]) => kind === 'attribute').length <= 1,
      );
    }
  });
}
