# Midscene AI E2E（web-core-e2e shell）

叠加在本包现有 Playwright E2E 之上的**视觉语义层**：ReactLynx 页面渲染在
`<lynx-view>` 的 closed shadow + worker 中，Playwright 选择器无法穿透，
Midscene 纯视觉驱动并断言交互语义。本地验证（2026-09-20）：5/5。

## 为什么是独立子目录

本目录在 pnpm workspace glob（`packages/web-platform/*`）的第三级之下，
**不是** workspace 成员：自带 `package.json` / lockfile，用 `npm ci` 安装，
与仓库的 pnpm / turbo 体系互不干扰。Playwright 钉 `1.61.1`，与仓库一致。

## 用例

| YAML                          | case bundle                                                    | 语义                                  |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `cases/web/shell.yaml` (2)    | `basic-bindtap`                                                | 点击穿透 shadow/worker，粉↔绿状态翻转 |
| `cases/web/elements.yaml` (3) | `basic-element-text-color` / `-image-src` / `-input-bindinput` | 渐变文本、远端图片加载、输入事件镜像  |

## 本地运行

前置：仓库依赖已安装、workspace 已构建（`pnpm turbo build --filter='@lynx-js/web-core-e2e...'`，
产出本包 `dist/*.web.bundle`）。Node 需 ≥ 24.11（见仓库 engines）。

```bash
# 终端 1：起 dev shell（默认 PORT=3080）
cd packages/web-platform/web-core-e2e
pnpm run serve

# 终端 2：跑 Midscene
cd packages/web-platform/web-core-e2e/midscene
npm ci
cp .env.example .env       # OpenAI 兼容多模态模型凭证，不要提交
set -a && source .env && set +a
npm test -- --project web-shell
```

## 写作约定

- 断言不写死 CSS 像素：截图按设备 DPR 放大，100 CSS px 在 393px 视口截图里约占
  屏宽 1/4，写"a small square / roughly a quarter of the page width"等相对描述。
- @midscene/test 1.12.9 内置节点没有 `aiInput`，输入用
  `aiAct: click ..., clear ..., type "..."` 表达。

配套 workflow：`.github/workflows/midscene-web.yml`
（Playwright v1.61.1 官方容器 + Node 24 + turbo build + rsbuild serve）。
需要的 secrets：`MIDSCENE_MODEL_API_KEY / NAME / BASE_URL / FAMILY`；
可选 variable `MIDSCENE_PAGES_BRANCH=main` 开启 Pages 报告。
