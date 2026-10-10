import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

test('four API pixel flows preserve every original ordered mutation, snapshot and wait', async () => {
  const ast = ts.createSourceFile(
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
      new URL('../cases/web-pixels/api-mutations.yaml', import.meta.url),
      'utf8',
    ),
  ).cases;
  assert.equal(cases.length, 4);
  const originals = new Map();
  function visit(node) {
    if (
      ts.isCallExpression(node) && node.expression.getText(ast) === 'test'
      && cases.some(item => item.name === node.arguments[0]?.text)
    ) originals.set(node.arguments[0].text, node.arguments[1]);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const harness = () => {
    const events = [];
    const view = {
      updateGlobalProps: value =>
        events.push(['updateGlobalProps', JSON.parse(JSON.stringify(value))]),
      removeAttribute: name => events.push(['removeAttribute', name]),
      setAttribute: (name, value) => events.push(['setAttribute', name, value]),
      shadowRoot: {
        querySelector: selector => {
          events.push(['shadowQuerySelector', selector]);
          return view;
        },
      },
    };
    const document = {
      querySelector(selector) {
        events.push(['querySelector', selector]);
        return view;
      },
      fonts: { ready: Promise.resolve() },
    };
    return {
      events,
      document,
      page: {
        evaluate: callback => callback(),
        evaluateHandle: callback => callback(),
        locator: selector => ({
          click: async () => events.push(['click', selector]),
        }),
      },
      goto: async (_, title) => {
        events.push(['goto', title]);
        events.push(['fonts-ready']);
      },
      wait: async duration => events.push(['wait', duration]),
      diffScreenShot: async (_, category, name, suffix = 'index') =>
        events.push(['pixels', [category, name, suffix].join('/')]),
      elementName: 'lynx-view',
    };
  };
  for (const item of cases) {
    const original = harness();
    original.elementName = item.name.includes('x-viewpager-ng')
      ? 'x-viewpager-ng'
      : 'lynx-view';
    const callback = ts.transpile(
      '(' + originals.get(item.name).getText(ast) + ')',
      { target: ts.ScriptTarget.ES2022 },
    );
    await runInNewContext(callback, original)({ page: original.page }, {
      title: item.name,
    });
    const translated = harness();
    for (const step of item.steps) {
      if (step.gotoUrl) {
        assert.equal(step.gotoUrl, '${shellUrl}?casename=' + item.name);
        translated.events.push(['goto', item.name]);
      } else if (step.aiAct) {
        assert.equal(
          item.name,
          'basic-element-x-viewpager-ng-method-selecttab',
        );
        assert.equal(
          step.aiAct.prompt,
          'Click once in the center of the large red panel with a black border at the top of the page. Do not swipe or perform another action.',
        );
        assert.deepEqual(step.aiAct.options, {
          deepLocate: true,
          cacheable: false,
        });
        assert.deepEqual(Object.keys(step), ['aiAct']);
        translated.events.push(['click', 'x-viewpager-ng']);
      } else if (step['web.pixels']) {
        const baseline = step['web.pixels'].baseline;
        assert.deepEqual(Object.keys(step['web.pixels']), ['baseline']);
        assert.ok(
          existsSync(
            new URL(
              '../../tests/reactlynx.spec.ts-snapshots/' + baseline
                + '-chromium-linux.png',
              import.meta.url,
            ),
          ),
        );
        translated.events.push(['pixels', baseline]);
      } else {
        assert.equal(typeof step.javascript, 'string');
        if (step.javascript === 'document.fonts.ready.then(() => true)') {
          translated.events.push(['fonts-ready']);
        } else {await runInNewContext(step.javascript, {
            document: translated.document,
            setTimeout: (callback, duration) => {
              translated.events.push(['wait', duration]);
              callback();
            },
          });}
      }
    }
    assert.deepEqual(translated.events, original.events);
  }
});
