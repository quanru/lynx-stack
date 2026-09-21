import { resolve } from 'node:path';
import { PlaywrightAgent } from '@midscene/web/playwright/agent';
import { defineProjectSetup, defineTestProject } from '@midscene/test/config';
import { createMidsceneNodes } from '@midscene/test/midscene';
import type {
  AgentProvider,
  AgentReleaseResult,
  MidsceneUIAgent,
} from '@midscene/test/midscene';
import { chromium, type Browser, type Page } from 'playwright';

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
}

// Playwright 驱动 Chromium 打开 web-core-e2e dev shell。ReactLynx 页面在
// <lynx-view> 的 closed shadow/worker 内渲染，DOM 选择器不可达；
// Midscene 纯视觉驱动，正好补上 Playwright 选择器覆盖不到的交互语义。
// 浏览器全 project 共享；每个 case run 用独立 context+page+agent，结束即关。
const webSetup = defineProjectSetup<WebProjectContext>({
  name: 'web',
  async setup({ onTeardown }) {
    const browser: Browser = await chromium.launch({ headless: true });
    onTeardown(() => browser.close());

    const entries = new Map<string, { page: Page; agent: PlaywrightAgent }>();
    const registry: AgentRegistry = {
      async getAgent(runId) {
        let entry = entries.get(runId);
        if (!entry) {
          const context = await browser.newContext({
            viewport: { width: 393, height: 851 },
          });
          const page = await context.newPage();
          const agent = new PlaywrightAgent(page, {
            reportFileName: `web-${runId}.html`,
          });
          entry = { page, agent };
          entries.set(runId, entry);
        }
        return entry.agent;
      },
      async releaseAgent(runId) {
        const entry = entries.get(runId);
        if (!entry) return;
        entries.delete(runId);
        await entry.agent.destroy();
        await entry.page.context().close();
        return { reportPath: reportPath(runId) };
      },
    };
    return { agentRegistry: registry };
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
