import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

function originals(relative) {
  const source = ts.createSourceFile(
    'original.ts',
    readFileSync(new URL(relative, import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const callbacks = new Map();
  function visit(node, group = '') {
    if (
      ts.isCallExpression(node)
      && node.expression.getText(source) === 'test.describe'
    ) group = node.arguments[0]?.text ?? group;
    if (
      ts.isCallExpression(node) && node.expression.getText(source) === 'test'
      && ts.isStringLiteral(node.arguments[0])
    ) {
      callbacks.set(group + '/' + node.arguments[0].text, node.arguments[1]);
    }
    ts.forEachChild(node, child => visit(child, group));
  }
  visit(source);
  return { source, callbacks };
}
const elements = originals('../../../web-elements/tests/web-elements.spec.ts');
const workflow = YAML.parse(
  readFileSync(
    new URL(
      '../../../../../.github/workflows/midscene-web.yml',
      import.meta.url,
    ),
    'utf8',
  ),
);
const compile = (node, source) =>
  ts.transpile('(' + node.getText(source) + ')', {
    target: ts.ScriptTarget.ES2022,
  });

test('list API contracts retain exactly four original callbacks across three browsers before persistent servers', () => {
  const steps = workflow.jobs['web-shell-ai-e2e'].steps;
  const matches = steps.filter(step =>
    step.name === 'Validate original list API and orientation contracts'
  );
  assert.equal(matches.length, 1);
  const step = matches[0];
  assert.equal(step.if, 'matrix.shard == 1');
  assert.equal(step['working-directory'], 'packages/web-platform/web-elements');
  assert.deepEqual(step.env, { PORT: '3081' });
  assert.ok(
    step.run.startsWith(
      'pnpm exec playwright test tests/web-elements.spec.ts ',
    ),
  );
  assert.deepEqual([...step.run.matchAll(/--project (\w+)/g)].map(m => m[1]), [
    'chromium',
    'firefox',
    'webkit',
  ]);
  assert.match(step.run, /--workers=2 /);
  assert.match(
    step.run,
    /--output midscene-original-results\/list-api --reporter line$/,
  );
  const filter = new RegExp(step.run.match(/--grep '([^']+)'/)[1]);
  assert.deepEqual(
    [...elements.callbacks.keys()].filter(name =>
      filter.test(name.replace('/', ' '))
    ),
    [
      'x-list/auto-scroll-follows-orientation',
      'x-list/get-visible-cells',
      'x-list/get-scroll-container-info',
      'x-list/get-scroll-container-info-horizontal',
    ],
  );
  assert.ok(
    steps.indexOf(step)
      < steps.findIndex(step =>
        step.name === 'Start independent web-elements fixture server'
      ),
  );
  assert.doesNotMatch(
    step.run,
    /--(?:retries|timeout|update-snapshots|config)(?:[=\s]|$)/,
  );
});

test('list scroll-to-position retains original two PNGs and wait, replacing only the visible click', async () => {
  const item = YAML.parse(
    readFileSync(
      new URL(
        '../cases/web-pixels/elements-list-position.yaml',
        import.meta.url,
      ),
      'utf8',
    ),
  ).cases[0];
  assert.equal(item.name, 'web-elements/x-list/scroll-to-position');
  assert.equal(item.steps.filter(step => step.recordToReport).length, 2);
  const actions = item.steps.filter(step => step.aiAct);
  assert.equal(actions.length, 1);
  assert.match(actions[0].aiAct.prompt, /"scrollToPosition".*once/);
  assert.deepEqual(actions[0].aiAct.options, {
    effort: 'deepThink',
    deepLocate: true,
    cacheable: false,
  });
  const expected = [];
  const page = {
    locator(selector) {
      assert.equal(selector, '#scrollToPosition');
      return {
        async click() {
          expected.push(actions[0]);
        },
      };
    },
  };
  const run = runInNewContext(
    compile(
      elements.callbacks.get('x-list/scroll-to-position'),
      elements.source,
    ),
    {
      getTitle: titles => titles.slice(-2).join('/'),
      async gotoWebComponentPage(actual, title) {
        assert.equal(actual, page);
        expected.push({
          gotoUrl: '${elementsUrl}tests/fixtures/' + title + '.html',
        }, { javascript: 'document.fonts.ready.then(() => true)' });
      },
      async wait(ms) {
        expected.push({
          javascript:
            `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
        });
      },
      async diffScreenShot(actual, title, subcase, ...options) {
        assert.equal(actual, page);
        assert.deepEqual(options, []);
        expected.push({
          'web.pixels': {
            suite: 'web-elements',
            baseline: title + '/' + subcase,
          },
        });
      },
    },
  );
  await run({ page }, { titlePath: ['suite', 'x-list', 'scroll-to-position'] });
  assert.deepEqual(item.steps.filter(step => !step.recordToReport), expected);
});

test('both invoke callbacks retain original waits and exact pink-to-green assertions with independent visual location', async () => {
  const { callbacks, source } = originals('../../tests/reactlynx.spec.ts');
  const cases = YAML.parse(
    readFileSync(
      new URL('../cases/web/continuation.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  for (const name of ['api-invoke-success', 'api-invoke-fail']) {
    const item = cases.find(item => item.name === name);
    const action = item.steps.find(step => step.aiAct);
    assert.deepEqual(action.aiAct.options, {
      effort: 'deepThink',
      deepLocate: true,
      cacheable: false,
    });
    assert.match(action.aiAct.prompt, /tiny BLUE square.*LEFT.*exactly once/);
    const ready = item.steps.find(step => step.aiWaitFor);
    const expected = [];
    const page = {
      locator(selector) {
        return {
          selector,
          async click() {
            assert.equal(selector, '#target');
            expected.push(action);
          },
        };
      },
    };
    const callback = [...callbacks].find(([key]) =>
      key.endsWith('/' + name)
    )[1];
    const run = runInNewContext(compile(callback, source), {
      async goto(actual, title) {
        assert.equal(actual, page);
        expected.push({ gotoUrl: '${shellUrl}?casename=' + title }, ready);
      },
      async wait(ms) {
        expected.push({
          javascript:
            `new Promise(resolve => setTimeout(() => resolve(true), ${ms}))`,
        });
      },
      expect(locator) {
        return {
          async toHaveCSS(css, equals) {
            expected.push({
              'web.expect': { selector: locator.selector, css, equals },
            });
          },
        };
      },
    });
    await run({ page }, { title: name });
    assert.deepEqual(item.steps, expected);
  }
});
