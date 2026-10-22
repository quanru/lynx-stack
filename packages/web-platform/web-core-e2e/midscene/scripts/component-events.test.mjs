import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const document = YAML.parse(
  readFileSync(
    new URL('../cases/web-elements/component-events.yaml', import.meta.url),
    'utf8',
  ),
);
const original = readFileSync(
  new URL(
    '../../../web-elements/tests/component-event.spec.ts',
    import.meta.url,
  ),
  'utf8',
);

async function replay(index, migrated, defect) {
  const trace = [];
  const callbacks = [];
  let events;
  let references = 0;
  const listeners = new Set();
  const emit = status => {
    events ??= [];
    events.push({
      type: 'custom-event',
      status,
      ...(defect === 'extra-field' ? { extra: true } : {}),
    });
  };
  function enable(name) {
    assert.equal(name, 'custom-event');
    if (references++ === 0 || defect === 'duplicate-enable') emit(true);
  }
  function disable(name) {
    assert.equal(name, 'custom-event');
    if (--references === 0 || defect === 'early-disable') emit(false);
  }
  const element = {
    enableEvent(name) {
      trace.push(['enable', name]);
      enable(name);
    },
    disableEvent(name) {
      trace.push(['disable', name]);
      disable(name);
    },
    addEventListener(name, handler) {
      trace.push(['add', name, typeof handler]);
      assert.ok(!listeners.has(handler));
      listeners.add(handler);
      enable(name);
    },
    removeEventListener(name, handler) {
      trace.push(['remove', name, typeof handler]);
      assert.ok(listeners.delete(handler), 'Remove the exact original handler');
      disable(name);
    },
  };
  const window = {
    get eventEvents() {
      trace.push(['read', events?.length]);
      return events;
    },
    set eventEvents(value) {
      trace.push(['reset']);
      events = value;
    },
  };
  const context = vm.createContext({
    window,
    document: {
      fonts: { ready: Promise.resolve() },
      querySelector(selector) {
        assert.equal(selector, 'x-event-test');
        return element;
      },
    },
    customElements: {
      async whenDefined(name) {
        trace.push(['whenDefined', name]);
      },
      get(name) {
        trace.push(['get', name]);
        return element;
      },
    },
    expect: value => ({
      toBeUndefined: () => assert.equal(value, undefined),
      toBe: expected => assert.equal(value, expected),
      toHaveLength: expected => assert.equal(value.length, expected),
      toEqual: expected =>
        assert.deepEqual(
          JSON.parse(JSON.stringify(value)),
          JSON.parse(JSON.stringify(expected)),
        ),
    }),
  });
  const playwrightTest = (_name, callback) => callbacks.push(callback);
  playwrightTest.describe = (_name, callback) => callback();
  context.test = playwrightTest;
  // Only remove imports/types; execute the complete unchanged original callbacks.
  const ast = ts.createSourceFile(
    'original.ts',
    original,
    ts.ScriptTarget.Latest,
    true,
  );
  const source = ast.statements.filter(statement =>
    !ts.isImportDeclaration(statement)
  ).map(statement => statement.getText(ast)).join('\n');
  vm.runInContext(
    ts.transpile(source, { target: ts.ScriptTarget.ES2022 }),
    context,
  );
  const page = {
    async goto(url, options) {
      assert.equal(options.waitUntil, 'load');
      trace.push(['goto', url]);
    },
    async evaluate(callback) {
      return callback();
    },
  };
  let passed = true;
  try {
    if (migrated) {
      for (const step of document.cases[index].steps) {
        if (step.gotoUrl) {
          trace.push([
            'goto',
            '/' + step.gotoUrl.slice('${elementsUrl}'.length),
          ]);
        } else {
          await vm.runInContext(
            `(async () => { ${step.javascript}\n })()`,
            context,
          );
        }
      }
    } else {
      await callbacks[index]({ page });
    }
  } catch {
    passed = false;
  }
  return { passed, trace };
}

test('both component-event translations preserve the complete original API and immediate read sequence', async () => {
  assert.equal(document.cases.length, 2);
  assert.ok(document.afterEach[0].recordToReport);
  for (const index of [0, 1]) {
    const upstream = await replay(index, false);
    assert.equal(upstream.passed, true);
    assert.deepEqual(await replay(index, true), upstream);
  }
});

test('original and translated component events reject premature disable, duplicate enable and nonexact payloads', async () => {
  for (const index of [0, 1]) {
    for (const defect of ['early-disable', 'duplicate-enable', 'extra-field']) {
      const upstream = await replay(index, false, defect);
      assert.equal(upstream.passed, false);
      assert.deepEqual(await replay(index, true, defect), upstream);
    }
  }
});
