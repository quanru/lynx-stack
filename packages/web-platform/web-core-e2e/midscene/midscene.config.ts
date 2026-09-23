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
import { chromium, type Browser, type Locator, type Page } from 'playwright';

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

interface ResponseInfo {
  url: string;
  status: number;
  contentType: string;
}

interface WebProjectContext {
  agentRegistry: AgentRegistry;
  // Return the Playwright Page for a case run to web.expect and web.fill.
  getPage(runId: string): Promise<Page>;
  // Return every response recorded since this run created its page, including
  // gotoUrl's first navigation, for deterministic status and content-type checks.
  getResponses(runId: string): ResponseInfo[];
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
    const responseLogs = new Map<string, ResponseInfo[]>();

    const getPage = async (runId: string) => {
      let page = pages.get(runId);
      if (!page) {
        const context = await browser.newContext({
          viewport: { width: 393, height: 851 },
        });
        page = await context.newPage();
        // Start recording immediately. gotoUrl creates the page lazily, so the
        // listener is attached before navigation and sees first-load resources.
        const log: ResponseInfo[] = [];
        responseLogs.set(runId, log);
        page.on('response', (response) => {
          try {
            log.push({
              url: response.url(),
              status: response.status(),
              contentType: response.headers()['content-type'] ?? '',
            });
          } catch {
            // Ignore responses that were already released; recording must not fail a case.
          }
        });
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
        responseLogs.delete(runId);
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
      getResponses: (runId) => responseLogs.get(runId) ?? [],
    };
  },
});

// Exact DOM assertions and input nodes.
// Thin borders and small text against mostly blank screenshots provide a weak
// visual signal. Exact initial and mirrored values use Playwright, which pierces
// the open shadow root and provides automatic waiting.

interface ExpectInput {
  selector: string;
  // Require an exact <input>/<textarea> value. Omit to assert textContent.
  value?: string;
  // Require exact trimmed text. Mutually exclusive with value; omit both for visibility.
  text?: string;
  // Require rounded getBoundingClientRect dimensions in CSS pixels. This gives
  // deterministic evidence that resources such as <x-image> participate in layout.
  width?: number;
  height?: number;
  // Require the image inside an <x-image> to finish decoding successfully.
  imageLoaded?: boolean;
  timeoutMs?: number;
}

interface ExpectResponseInput {
  // Substring required in the response URL, such as a resource filename.
  urlIncludes: string;
  // Expected HTTP status; defaults to 200.
  status?: number;
  // Optional substring required in content-type, such as "image/".
  contentTypeIncludes?: string;
  timeoutMs?: number;
}

interface FillInput {
  selector: string;
  text: string;
  // Press Enter before filling to match the official case's bindconfirm step.
  enter?: boolean;
  timeoutMs?: number;
}

const DEFAULT_DOM_TIMEOUT_MS = 15_000;

async function pollUntil(
  read: () => Promise<string | null>,
  expected: string,
  describe: () => string,
  timeoutMs: number,
) {
  const deadline = Date.now() + timeoutMs;
  let last: string | null = null;
  for (;;) {
    try {
      last = await read();
    } catch {
      last = null;
    }
    if (last === expected) return;
    if (Date.now() >= deadline) {
      throw new Error(
        `${describe()} timed out after ${timeoutMs}ms; expected ${
          JSON.stringify(expected)
        }, got ${JSON.stringify(last)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

const webExpectNode = defineNode<ExpectInput, void, WebProjectContext>({
  name: 'web.expect',
  description:
    'Assert a DOM condition inside the Lynx open shadow root: input value, element text, visibility, rendered box size, or decoded image.',
  async execute(execution) {
    if (execution.scope !== 'case') {
      throw new Error('web.expect can only be used as a case-level step.');
    }
    const { selector, value, text, width, height, imageLoaded, timeoutMs } =
      execution.input;
    const page = await execution.context.getPage(execution.case.runId);
    const locator: Locator = page.locator(selector).first();
    const timeout = timeoutMs ?? DEFAULT_DOM_TIMEOUT_MS;
    await locator.waitFor({ state: 'visible', timeout });
    if (value !== undefined) {
      await pollUntil(
        () => locator.inputValue().catch(() => null),
        value,
        () => `value of ${selector}`,
        timeout,
      );
    } else if (text !== undefined) {
      await pollUntil(
        async () => {
          const t = await locator.textContent().catch(() => null);
          return t === null ? null : t.trim();
        },
        text,
        () => `text of ${selector}`,
        timeout,
      );
    }
    if (width !== undefined || height !== undefined) {
      const deadline = Date.now() + timeout;
      let gotW: number | null = null;
      let gotH: number | null = null;
      for (;;) {
        const box = await locator.boundingBox().catch(() => null);
        gotW = box ? Math.round(box.width) : null;
        gotH = box ? Math.round(box.height) : null;
        const okW = width === undefined || gotW === width;
        const okH = height === undefined || gotH === height;
        if (okW && okH) break;
        if (Date.now() >= deadline) {
          throw new Error(
            `box size of ${selector} timed out after ${timeout}ms; expected ${
              width ?? '*'
            }x${height ?? '*'}, got ${gotW}x${gotH}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    if (imageLoaded) {
      await pollUntil(
        async () => {
          const image = locator.locator('img').first();
          return image.evaluate(async (node: HTMLImageElement) => {
            if (!node.complete) return 'pending';
            try {
              await node.decode();
            } catch {
              return 'pending';
            }
            return node.naturalWidth > 0 && node.naturalHeight > 0
              ? 'loaded'
              : 'pending';
          });
        },
        'loaded',
        () => `decoded image inside ${selector}`,
        timeout,
      );
    }
  },
});

const webExpectResponseNode = defineNode<
  ExpectResponseInput,
  void,
  WebProjectContext
>({
  name: 'web.expectResponse',
  description:
    'Assert a network response recorded since page creation matches a URL substring, HTTP status and content-type (deterministic resource-loaded check).',
  async execute(execution) {
    if (execution.scope !== 'case') {
      throw new Error(
        'web.expectResponse can only be used as a case-level step.',
      );
    }
    const {
      urlIncludes,
      status = 200,
      contentTypeIncludes,
      timeoutMs,
    } = execution.input;
    const timeout = timeoutMs ?? DEFAULT_DOM_TIMEOUT_MS;
    const deadline = Date.now() + timeout;
    for (;;) {
      const hit = execution.context
        .getResponses(execution.case.runId)
        .find(
          (r) =>
            r.url.includes(urlIncludes)
            && r.status === status
            && (!contentTypeIncludes
              || r.contentType.includes(contentTypeIncludes)),
        );
      if (hit) return;
      if (Date.now() >= deadline) {
        const seen = execution.context
          .getResponses(execution.case.runId)
          .filter((r) => r.url.includes(urlIncludes))
          .map((r) => `${r.status} ${r.contentType} ${r.url}`)
          .slice(-5);
        throw new Error(
          `response ${
            JSON.stringify(urlIncludes)
          } status=${status} contentType*=${
            JSON.stringify(contentTypeIncludes)
          } timed out after ${timeout}ms; matching responses seen: ${
            seen.length ? `\n${seen.join('\n')}` : 'none'
          }`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  },
});

const webFillNode = defineNode<FillInput, void, WebProjectContext>({
  name: 'web.fill',
  description:
    'Focus a DOM input inside the Lynx open shadow root, optionally press Enter, then fill text.',
  async execute(execution) {
    if (execution.scope !== 'case') {
      throw new Error('web.fill can only be used as a case-level step.');
    }
    const { selector, text, enter, timeoutMs } = execution.input;
    const page = await execution.context.getPage(execution.case.runId);
    const locator: Locator = page.locator(selector).first();
    const timeout = timeoutMs ?? DEFAULT_DOM_TIMEOUT_MS;
    await locator.waitFor({ state: 'visible', timeout });
    if (enter) await locator.press('Enter');
    await locator.fill(text, { timeout });
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
        webExpectResponseNode,
        webFillNode,
      ],
      files: { include: ['cases/web/**/*.{yaml,yml}'] },
      variables: {
        // Served by the web-core-e2e Rsbuild development shell on PORT=3080 by default.
        shellUrl: process.env.WEB_SHELL_URL ?? 'http://localhost:3080/',
      },
      // Allow three attempts to absorb two intermittent failures: a new page's
      // Lynx worker/Wasm cold start can outlast the fixed wait and capture a
      // blank frame, and the ARK deepseek vision gateway can return an HTTP-200
      // semantic "image base64 truncated / cannot decode" failure that does not
      // trigger per-call retries. The official Playwright CI uses retries: 20;
      // model calls are costlier, so this suite limits the total to three.
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
