import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import YAML from 'yaml';

const read = relative =>
  readFileSync(new URL(relative, import.meta.url), 'utf8');
const audioSource = ts.createSourceFile(
  'elements.ts',
  read('../../../web-elements/tests/web-elements.spec.ts'),
  ts.ScriptTarget.Latest,
  true,
);
const coreSource = ts.createSourceFile(
  'core.ts',
  read('../../tests/reactlynx.spec.ts'),
  ts.ScriptTarget.Latest,
  true,
);
const cases = [
  ...YAML.parse(read('../cases/web-elements/audio-stable-actions.yaml')).cases,
  ...YAML.parse(read('../cases/web/list-remove-action.yaml')).cases,
];
const titles = [
  'method-mute',
  'method-set-volume',
  'basic-element-list-remove-action',
];
function extract(source, title) {
  let callback;
  const helpers = new Map();
  function visit(node, groups = []) {
    if (
      ts.isVariableDeclaration(node)
      && ['wait', 'goto', 'gotoWebComponentPage', 'getTitle'].includes(
        node.name.getText(source),
      )
    ) {
      helpers.set(node.name.getText(source), node.initializer);
    }
    if (
      ts.isCallExpression(node)
      && node.expression.getText(source) === 'test.describe'
    ) {
      ts.forEachChild(
        node.arguments[1],
        child => visit(child, [...groups, node.arguments[0].text]),
      );
      return;
    }
    if (
      ts.isCallExpression(node) && node.expression.getText(source) === 'test'
      && node.arguments[0]?.text === title
      && (source === coreSource || groups.at(-1) === 'x-audio-tt')
    ) {
      assert.ok(!callback);
      callback = node.arguments[1];
    }
    ts.forEachChild(node, child => visit(child, groups));
  }
  visit(source);
  assert.ok(callback);
  const compile = node =>
    ts.transpile('(' + node.getText(source) + ')', {
      target: ts.ScriptTarget.ES2022,
    });
  return {
    text: callback.getText(source),
    run(env, browserName = 'chromium') {
      for (const [name, node] of helpers) {
        env[name] = runInNewContext(
          compile(node),
          env,
        );
      }
      return runInNewContext(compile(callback), env)({
        page: env.page,
        browserName,
      }, {
        title,
        titlePath: ['web-elements test suite', 'x-audio-tt', title],
      });
    },
  };
}
const originals = titles.map((title, index) =>
  extract(index === 2 ? coreSource : audioSource, title)
);
const skip = new Error('original skip');
function environment(index, options = {}) {
  const trace = [];
  let clicks = 0;
  const states = options.states
    ?? [['1', '2', '3', '5'], ['1', '4', '5'], ['1', '2', '3', '5']];
  const audio = {};
  for (const property of ['muted', 'volume']) {
    Object.defineProperty(audio, property, {
      get() {
        trace.push(['read', property]);
        return Object.hasOwn(options, property)
          ? options[property]
          : property === 'muted'
          ? true
          : 0.5;
      },
    });
  }
  const root = {
    querySelectorAll(selector) {
      if (selector === '*') return [];
      assert.equal(selector, 'list-item');
      trace.push(['list-query']);
      return (states[clicks] ?? []).map(id => ({
        get id() {
          trace.push(['id', id]);
          return id;
        },
      }));
    },
  };
  const document = {
    fonts: {
      get ready() {
        trace.push(['fonts']);
        return Promise.resolve();
      },
    },
    querySelector(selector) {
      trace.push(['query', selector]);
      assert.equal(selector, 'x-audio-tt');
      if (options.missing === 'host') return null;
      return {
        shadowRoot: options.missing === 'shadow' ? null : {
          querySelector(inner) {
            trace.push(['query', inner]);
            assert.equal(inner, 'audio');
            return options.missing === 'audio' ? null : audio;
          },
        },
      };
    },
    querySelectorAll(selector) {
      if (selector === '*') return [{ shadowRoot: root }];
      assert.equal(selector, 'list-item');
      // The shell has no light-DOM list items, but all open roots are searched.
      return [];
    },
  };
  const click = selector => {
    trace.push(['click', selector]);
    if (index === 2) clicks++;
  };
  const page = {
    on(event) {
      assert.equal(event, 'console');
    },
    goto: async (url, options) =>
      trace.push(['goto', url, JSON.parse(JSON.stringify(options))]),
    evaluate: fn => fn(),
    locator(selector) {
      return {
        click: async () => click(selector),
        count: async () => root.querySelectorAll(selector).length,
        evaluateAll: async fn => fn(root.querySelectorAll(selector)),
      };
    },
  };
  const expect = actual => ({
    toBe: expected => assert.equal(actual, expected),
    toBeTruthy: () => assert.ok(actual),
    toEqual: expected =>
      assert.equal(JSON.stringify(actual), JSON.stringify(expected)),
    resolves: { toBe: async expected => assert.equal(await actual, expected) },
  });
  return {
    trace,
    document,
    page,
    expect,
    path,
    isSSR: options.isSSR ?? false,
    test: {
      skip(condition) {
        if (condition) throw skip;
      },
    },
    setTimeout(fn, ms) {
      trace.push(['wait', ms]);
      fn();
    },
    click,
  };
}
async function runYaml(index, env) {
  const actions = index === 0
    ? ['#mute']
    : index === 1
    ? ['#play', '#setVolume']
    : ['#target', '#target'];
  let action = 0;
  for (const step of cases[index].steps) {
    assert.equal(Object.keys(step).length, 1);
    if (step.recordToReport) continue;
    if (step.gotoUrl) {
      await env.page.goto(
        step.gotoUrl.replace('${elementsUrl}', '/').replace('${shellUrl}', '/'),
        { waitUntil: 'load' },
      );
    } else if (step.javascript) await runInNewContext(step.javascript, env);
    // This maps intended actions only; it is not a visual model acceptance test.
    else if (step.aiAct) env.click(actions[action++]);
    else assert.fail('Unexpected node');
  }
  assert.equal(action, actions.length);
}
async function compare(index, options) {
  const original = environment(index, options),
    translated = environment(index, options);
  const passes = action => action.then(() => true, () => false);
  const expected = await passes(originals[index].run(original));
  assert.equal(await passes(runYaml(index, translated)), expected);
  assert.deepEqual(translated.trace, original.trace);
  return expected;
}
test('stable action cases preserve original navigation, waits, action order and assertion reads', async () => {
  assert.deepEqual(cases.map(item => item.name), [
    'web-elements/x-audio-tt/method-mute',
    'web-elements/x-audio-tt/method-set-volume',
    titles[2],
  ]);
  for (let index = 0; index < cases.length; index++) {
    assert.equal(await compare(index), true);
  }
  const expected = [[3000], [], [500, 1000, 1000]];
  for (let index = 0; index < cases.length; index++) {
    const env = environment(index);
    await runYaml(index, env);
    assert.deepEqual(
      env.trace.filter(row => row[0] === 'wait').map(row => row[1]),
      expected[index],
    );
  }
});
test('audio assertions retain original truthiness, strict volume equality and optional-chain failures', async () => {
  for (const muted of [true, 1, 'true', {}, []]) {
    assert.equal(await compare(0, { muted }), true);
  }
  for (const muted of [false, 0, '', null, undefined]) {
    assert.equal(await compare(0, { muted }), false);
  }
  for (const volume of [0, 1, '0.5', null, undefined]) {
    assert.equal(await compare(1, { volume }), false);
  }
  for (const missing of ['host', 'shadow', 'audio']) {
    for (const index of [0, 1]) {
      assert.equal(await compare(index, { missing }), false);
    }
  }
});
test('list checks retain every phase, separate count and ordered ID reads, without polling', async () => {
  for (let phase = 0; phase < 3; phase++) {
    for (const mutation of ['missing', 'extra', 'reordered', 'wrong-id']) {
      const states = [['1', '2', '3', '5'], ['1', '4', '5'], [
        '1',
        '2',
        '3',
        '5',
      ]];
      if (mutation === 'missing') states[phase].pop();
      if (mutation === 'extra') states[phase].push('duplicate');
      if (mutation === 'reordered') states[phase].reverse();
      if (mutation === 'wrong-id') states[phase][0] = 'wrong';
      assert.equal(await compare(2, { states }), false);
    }
  }
  const env = environment(2);
  await runYaml(2, env);
  assert.equal(env.trace.filter(row => row[0] === 'list-query').length, 6);
});
test('list traversal matches the pinned Playwright CSS engine across light and nested shadow roots', async () => {
  // Extract only the pure recursive query from the installed, pinned engine.
  const bundle = read('../node_modules/playwright-core/lib/coreBundle.js');
  const literal = bundle.match(/source4 = ('(?:\\.|[^'\\])*');/);
  assert.ok(
    literal,
    'Pinned Playwright injected source must remain inspectable',
  );
  const injected = runInNewContext(literal[1]);
  const method = injected.slice(injected.indexOf('_queryCSS(context, css) {'));
  const start = method.indexOf('function query(root) {');
  const end = method.indexOf('query(context.scope);', start);
  assert.ok(start >= 0 && end > start);
  function root(ids, children = [], ownShadow) {
    return {
      shadowRoot: ownShadow,
      querySelectorAll: selector =>
        selector === '*' ? children : ids.map(id => ({ id })),
    };
  }
  const document = root(['1'], [{
    shadowRoot: root(['3'], [{ shadowRoot: root(['5']) }]),
  }], root(['2']));
  const expected = runInNewContext(
    'let result = []; ' + method.slice(start, end)
      + 'query(context.scope); result.map(item => item.id);',
    {
      context: { scope: document, pierceShadow: true },
      css: 'list-item',
    },
  );
  assert.equal(JSON.stringify(expected), JSON.stringify(['1', '2', '3', '5']));
  const checks = cases[2].steps.filter(step =>
    step.javascript?.includes('query(document)')
  );
  // The first source count and ID assertions see matches in every root.
  for (const step of checks.slice(0, 2)) {
    assert.equal(await runInNewContext(step.javascript, { document }), true);
  }
  const duplicate = root(['1'], [{ shadowRoot: root(['1', '2', '3', '5']) }]);
  for (const step of checks.slice(0, 2)) {
    assert.throws(() =>
      runInNewContext(step.javascript, { document: duplicate })
    );
  }
});
test('original browser and render exclusions remain explicit, without claiming skipped acceptance', async () => {
  await assert.rejects(
    originals[1].run(environment(1), 'webkit'),
    error => error === skip,
  );
  await assert.rejects(
    originals[2].run(environment(2, { isSSR: true })),
    error => error === skip,
  );
  assert.doesNotMatch(originals[0].text, /test\.skip/);
  assert.match(
    originals[2].text,
    /page\.on\('console', msg => console\.log\('\[PAGE\]', msg\.text\(\)\)\)/,
  );
});
test('unchanged fixtures provide independent visible targets and stable action state', () => {
  for (const title of titles.slice(0, 2)) {
    const fixture = read(
      '../../../web-elements/tests/fixtures/x-audio-tt/' + title + '.html',
    );
    assert.match(fixture, /height: 60rpx/);
    assert.match(fixture, /background-color: red/);
    assert.match(fixture, /color: #fff/);
    assert.match(fixture, /margin-top: 30rpx/);
    assert.doesNotMatch(fixture, /setTimeout|setInterval/);
    if (title === 'method-mute') {
      assert.match(fixture, /id="mute">mute</);
      assert.match(fixture, /mute\(\{ mute: true \}\)/);
    } else {
      assert.match(fixture, /id="play">play</);
      assert.match(fixture, /id="setVolume">set volume</);
      assert.match(fixture, /volume: 0\.5/);
    }
  }
  const fixture = read('../../tests/reactlynx/' + titles[2] + '/index.jsx');
  assert.match(
    fixture,
    /width: '100px', height: '100px', backgroundColor: 'blue'/,
  );
  assert.match(fixture, /handleTap = \(\) => setLoading\(!loading\)/);
  assert.doesNotMatch(fixture, /setTimeout|setInterval/);
  assert.deepEqual(
    cases.map(item =>
      item.steps.filter(step => step.aiAct).map(step => step.aiAct)
    ),
    [
      ['Click the red button labeled mute exactly once.'],
      [
        'Click the red button labeled play exactly once.',
        'Click the red button labeled set volume exactly once.',
      ],
      [
        'Click the solid blue square above the colored list exactly once.',
        'Click the solid blue square above the colored list exactly once.',
      ],
    ],
  );
});
