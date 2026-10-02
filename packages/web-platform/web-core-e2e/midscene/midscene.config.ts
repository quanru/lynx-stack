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

// Preserve the upstream input-event contract exactly. AI controls the user
// interaction, but the final event payload is not delegated to visual judgment.
interface ExpectInput {
  selector: string;
  text: string;
  timeoutMs?: number;
}

const webExpectNode = defineNode<ExpectInput, void, WebProjectContext>({
  name: 'web.expect',
  description: 'Assert exact rendered text through the open Lynx shadow root.',
  async execute(execution) {
    if (execution.scope !== 'case') {
      throw new Error('web.expect can only be used as a case-level step.');
    }
    const { selector, text, timeoutMs = 15_000 } = execution.input;
    const page = await execution.context.getPage(execution.case.runId);
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    const deadline = Date.now() + timeoutMs;
    let actual: string | null = null;
    for (;;) {
      actual = await locator.innerText().catch(() => null);
      if (actual === text) return;
      if (Date.now() >= deadline) {
        throw new Error(
          `text of ${selector} timed out; expected ${
            JSON.stringify(text)
          }, got ${JSON.stringify(actual)}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  },
});

// createMidsceneNodes needs a provider while loading the config, but setup
// creates the registry later. A project-level slot connects those lifecycles.
// getAgent uses execution.context; releaseAgent only receives runId and uses
// the slot closure.
const registrySlot: { current?: AgentRegistry } = {};

export default defineTestProject<WebProjectContext>({
  projects: [
    {
      name: 'web-shell',
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
      ],
      files: { include: ['cases/web/**/*.{yaml,yml}'] },
      variables: {
        // Served by the web-core-e2e Rsbuild development shell on PORT=3080 by default.
        shellUrl: process.env.WEB_SHELL_URL ?? 'http://localhost:3080/',
      },
      // Bound retries for transient worker/Wasm startup and interaction timing.
      // Missing vision capability must fail preflight; retries cannot repair a
      // text-only model path or make its hallucinated observations trustworthy.
      retry: 2,
    },
  ],
  test: {
    maxConcurrency: 1,
    testTimeout: 180_000,
  },
  output: {
    reportDir: './midscene_run/report',
  },
});
