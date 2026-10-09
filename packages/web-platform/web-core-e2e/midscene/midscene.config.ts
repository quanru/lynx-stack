import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PlaywrightAgent } from '@midscene/web/playwright/agent';
import { defineNode } from '@midscene/test';
import { defineProjectSetup, defineTestProject } from '@midscene/test/config';
import { createMidsceneNodes } from '@midscene/test/midscene';
import type {
  AgentProvider,
  AgentReleaseResult,
  MidsceneUIAgent,
} from '@midscene/test/midscene';
import { chromium, type Browser, type Page } from 'playwright';
import { expectWebValue, type ExpectInput } from './expectation.js';
import {
  prepareLynxViewStyle,
  type FixtureStyleInput,
} from './fixture-style.js';

// @midscene/core writes agent reports to
// <cwd>/midscene_run/report/<reportFileName>.html. releaseAgent must return the
// same absolute path so the test-run report can embed each case's step details.
// Sharing one agent would attach details to the wrong scope and mark the summary unresolved.
const reportDir = resolve('./midscene_run/report');
const reportPath = (runId: string) => resolve(reportDir, `web-${runId}.html`);

// Project context produced by setup and available to YAML nodes.
interface AgentRegistry {
  getAgent(runId: string): MidsceneUIAgent | Promise<MidsceneUIAgent>;
  releaseAgent(runId: string): Promise<AgentReleaseResult | void>;
}

interface WebProjectContext {
  agentRegistry: AgentRegistry;
  // Return the Playwright Page for a case run to web.expect.
  getPage(runId: string): Promise<Page>;
}

// Playwright drives Chromium against the web-core-e2e development shell.
// ReactLynx renders inside <lynx-view>'s open shadow root, which Playwright's
// CSS and locator engines can pierce for exact assertions. Midscene still
// handles visual semantics such as color and spatial relationships. The browser
// is shared by the project; every case run owns and closes its context, page,
// and agent.
const webSetup = defineProjectSetup<WebProjectContext>({
  name: 'web',
  async setup({ onTeardown }) {
    const browser: Browser = await chromium.launch({ headless: true });
    onTeardown(() => browser.close());

    const pages = new Map<string, Page>();
    const agents = new Map<string, PlaywrightAgent>();

    const getPage = async (runId: string) => {
      let page = pages.get(runId);
      if (!page) {
        const context = await browser.newContext({
          viewport: { width: 393, height: 851 },
        });
        page = await context.newPage();
        pages.set(runId, page);
      }
      return page;
    };

    const registry: AgentRegistry = {
      async getAgent(runId) {
        let agent = agents.get(runId);
        if (!agent) {
          const page = await getPage(runId);
          agent = new PlaywrightAgent(page, {
            reportFileName: `web-${runId}.html`,
            aiContexts: {
              aiAct:
                'Follow the coordinate format requested by the active action protocol. When it requests normalized 0–1000 coordinates, convert screenshot pixel positions using x / screenshot width * 1000 and y / screenshot height * 1000 before emitting locate.point. Do not label raw screenshot pixels as normalized coordinates. The center of the full screenshot is [500, 500] in that normalized format, regardless of its pixel dimensions. Check that the converted point lies inside the described target, using its left/right and upper/lower relationships.',
            },
          });
          agents.set(runId, agent);
        }
        return agent;
      },
      async releaseAgent(runId) {
        const agent = agents.get(runId);
        const page = pages.get(runId);
        agents.delete(runId);
        pages.delete(runId);
        if (agent) await agent.destroy();
        if (page) await page.context().close();
        // Return a report path only after an AI task caused core to write the
        // agent HTML. DOM-only cases create an agent lazily for gotoUrl but do
        // not emit a report on destroy; returning a missing path fails the runner.
        const report = reportPath(runId);
        return agent && existsSync(report) ? { reportPath: report } : undefined;
      },
    };
    return {
      agentRegistry: registry,
      getPage,
    };
  },
});

const webExpectNode = defineNode<ExpectInput, void, WebProjectContext>({
  name: 'web.expect',
  description:
    'Preserve upstream text, input value, attribute, JavaScript property, computed CSS, and bounding-box assertions through the open Lynx shadow root.',
  async execute(execution) {
    if (execution.scope !== 'case') {
      throw new Error('web.expect can only be used as a case-level step.');
    }
    const page = await execution.context.getPage(execution.case.runId);
    await expectWebValue(
      execution.input.matchingText !== undefined
        ? page.getByText(execution.input.matchingText)
        : page.locator(execution.input.selector ?? '').nth(
          execution.input.index ?? 0,
        ),
      execution.input,
    );
  },
});

const webFixtureStyleNode = defineNode<
  FixtureStyleInput,
  void,
  WebProjectContext
>({
  name: 'web.prepareLynxView',
  description:
    'Install the original offset or transform fixture before navigation and initial layout events.',
  async execute(execution) {
    if (execution.scope !== 'case') {
      throw new Error(
        'web.prepareLynxView can only be used as a case-level step.',
      );
    }
    const page = await execution.context.getPage(execution.case.runId);
    await prepareLynxViewStyle(page, execution.input);
  },
});

// createMidsceneNodes needs a provider while loading the config, but setup
// creates the registry later. A project-level slot connects those lifecycles.
// getAgent uses execution.context; releaseAgent only receives runId and uses
// the slot closure.
function createWebProject(
  name: string,
  include: string,
  variables: Record<string, string>,
) {
  // Each project owns its registry: one project's teardown must never release
  // another project's agent, even when the runner executes both projects.
  const registrySlot: { current?: AgentRegistry } = {};
  return {
    name,
    setup: defineProjectSetup<WebProjectContext>({
      name: 'web',
      async setup(args) {
        const context = await webSetup.setup(args);
        registrySlot.current = context.agentRegistry;
        return context;
      },
    }),
    nodes: [
      ...createMidsceneNodes<WebProjectContext>({
        agentClass: PlaywrightAgent,
        agentProvider: {
          getAgent: (runId, execution) =>
            execution.context.agentRegistry.getAgent(runId),
          releaseAgent: (runId) => {
            if (!registrySlot.current) {
              throw new Error(
                'agentRegistry is unavailable before project setup.',
              );
            }
            return registrySlot.current.releaseAgent(runId);
          },
        } satisfies AgentProvider<WebProjectContext>,
      }),
      webExpectNode,
      webFixtureStyleNode,
    ],
    files: { include: [include] },
    variables,
    // Bound retries for transient worker/Wasm startup and interaction timing.
    // Missing vision capability must fail preflight; retries cannot repair a
    // text-only model path or make its hallucinated observations trustworthy.
    retry: 2,
  };
}

export default defineTestProject<WebProjectContext>({
  projects: [
    createWebProject(
      'web-shell',
      process.env.MIDSCENE_CASE_FILES ?? 'cases/web/**/*.{yaml,yml}',
      { shellUrl: process.env.WEB_SHELL_URL ?? 'http://localhost:3080/' },
    ),
    createWebProject(
      'web-elements',
      process.env.MIDSCENE_ELEMENTS_CASE_FILES
        ?? 'cases/web-elements/**/*.{yaml,yml}',
      { elementsUrl: process.env.WEB_ELEMENTS_URL ?? 'http://localhost:3081/' },
    ),
  ],
  test: {
    // Midscene 1.13.1 applies this limit to projects, not cases. Keep this
    // projects serial; case concurrency requires separately scoped shards.
    maxConcurrency: 1,
    testTimeout: 180_000,
  },
  output: {
    reportDir: './midscene_run/report',
  },
});
