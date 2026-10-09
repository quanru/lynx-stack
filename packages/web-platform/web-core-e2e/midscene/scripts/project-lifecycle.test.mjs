import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

test('projects keep independent registries and release only their own case resources', async () => {
  const events = [];
  let browserId = 0;
  class Agent {
    constructor(page) {
      this.page = page;
    }
    async destroy() {
      events.push(['agent', this.page.id]);
    }
  }
  const modules = {
    '@midscene/web/playwright/agent': { PlaywrightAgent: Agent },
    '@midscene/test': { defineNode: x => x },
    '@midscene/test/config': {
      defineProjectSetup: x => x,
      defineTestProject: x => x,
    },
    '@midscene/test/midscene': {
      createMidsceneNodes: options => [{ provider: options.agentProvider }],
    },
    './expectation.js': { expectWebValue: () => {} },
    playwright: {
      chromium: {
        async launch() {
          const id = ++browserId;
          return {
            async close() {
              events.push(['browser', id]);
            },
            async newContext() {
              const context = {
                async close() {
                  events.push(['context', id]);
                },
                async newPage() {
                  return { id, context: () => context };
                },
              };
              return context;
            },
          };
        },
      },
    },
  };
  const require = createRequire(import.meta.url);
  const module = { exports: {} };
  const source = readFileSync(
    new URL('../midscene.config.ts', import.meta.url),
    'utf8',
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: name => modules[name] ?? require(name),
      process,
    },
  );
  const [shell, elements] = module.exports.default.projects;
  const teardowns = [];
  const setup = project =>
    project.setup.setup({ onTeardown: fn => teardowns.push(fn) });
  const shellContext = await setup(shell);
  const elementsContext = await setup(elements);
  // The same run identity deliberately exercises the cross-project collision.
  const runId = 'independent-project-lifecycle-test';
  const first = await shellContext.agentRegistry.getAgent(runId);
  assert.equal(await shellContext.agentRegistry.getAgent(runId), first);
  const second = await elementsContext.agentRegistry.getAgent(runId);
  assert.notEqual(first, second);
  await shell.nodes[0].provider.releaseAgent(runId);
  assert.deepEqual(events, [['agent', 1], ['context', 1]]);
  assert.equal(await elementsContext.agentRegistry.getAgent(runId), second);
  await elements.nodes[0].provider.releaseAgent(runId);
  assert.deepEqual(events.slice(2), [['agent', 2], ['context', 2]]);
  await Promise.all(teardowns.map(fn => fn()));
  assert.deepEqual(events.slice(4), [['browser', 1], ['browser', 2]]);
});
