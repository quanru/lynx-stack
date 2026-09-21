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

// Agent 报告由 @midscene/core 写到 <cwd>/midscene_run/report/<reportFileName>.html。
// releaseAgent 时把同一绝对路径交还 runner，test-run 汇总报告才能把逐步详情
// 嵌进对应用例（共享单 agent 会让详情挂错 scope，汇总页全部 unresolved）。
const reportDir = resolve('./midscene_run/report');
const reportPath = (runId: string) => resolve(reportDir, `web-${runId}.html`);

// setup 产出、YAML 节点可见的 project 上下文。
interface AgentRegistry {
  getAgent(runId: string): MidsceneUIAgent | Promise<MidsceneUIAgent>;
  releaseAgent(runId: string): Promise<AgentReleaseResult | void>;
}

interface WebProjectContext {
  agentRegistry: AgentRegistry;
  // DOM 节点（web.expect / web.fill）用：按 case runId 取该 run 的 Playwright Page。
  getPage(runId: string): Promise<Page>;
}

// Playwright 驱动 Chromium 打开 web-core-e2e dev shell。ReactLynx 页面渲染在
// <lynx-view> 的 open shadow root 内：Playwright 的 CSS/locator 引擎可以穿透
// open shadow 做精确值断言（官方 web-core-e2e Playwright 套件即如此），而整体
// 布局/视觉语义仍由 Midscene 纯视觉驱动。两类节点配合：精确文本用 DOM，
// 视觉/空间关系用 AI。
// 浏览器全 project 共享；每个 case run 用独立 context+page+agent，结束即关。
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
        // 仅当该 run 真的跑过 AI 任务、core 已落盘 agent HTML 时才回传路径；
        // 像 bindinput 这种纯 DOM 用例（gotoUrl 也会懒建 agent 但无 AI 任务），
        // destroy 不产生报告文件，此时不能回传路径（否则 runner 报 report missing）。
        const report = reportPath(runId);
        return agent && existsSync(report) ? { reportPath: report } : undefined;
      },
    };
    return { agentRegistry: registry, getPage };
  },
});

// ── DOM 精确断言/输入节点 ───────────────────────────────────────────────────
// 细边框小字号输入框这类控件，纯视觉截图里信号太弱（一像素边框 + 小号文字，
// 大片留白），AI 断言不稳定；其"初始值/输入镜像值"是精确文本语义，直接走
// Playwright（自动穿透 open shadow root、自带 auto-wait 重试）更可靠。

interface ExpectInput {
  selector: string;
  // 断言 <input>/<textarea> 的当前值严格相等；省略则断言 textContent。
  value?: string;
  // 断言元素文本（trim 后）严格相等；与 value 二选一；都省略仅断言可见。
  text?: string;
  timeoutMs?: number;
}

interface FillInput {
  selector: string;
  text: string;
  // 填入前先按一次 Enter（对齐官方用例：先触发 bindconfirm 再改值）。
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
    'Assert a DOM condition inside the Lynx open shadow root: input value, element text, or visibility.',
  async execute(execution) {
    if (execution.scope !== 'case') {
      throw new Error('web.expect can only be used as a case-level step.');
    }
    const { selector, value, text, timeoutMs } = execution.input;
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

// createMidsceneNodes 需要在 config 加载时就拿到 provider 对象，而 registry
// 在 setup 时才诞生；用 project 级槽位把两者接起来。getAgent 直接走
// execution.context，releaseAgent 只有 runId，走槽位闭包。
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
        webFillNode,
      ],
      files: { include: ['cases/web/**/*.{yaml,yml}'] },
      variables: {
        // 由 web-core-e2e 的 rsbuild dev shell 提供（默认 PORT=3080）。
        shellUrl: process.env.WEB_SHELL_URL ?? 'http://localhost:3080/',
      },
      retry: 1,
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
