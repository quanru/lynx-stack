# Midscene AI E2E for the web-core-e2e shell

This directory adds a visual-semantic layer to the package's existing
Playwright E2E suite. ReactLynx renders inside the open shadow root of
`<lynx-view>` and a worker. Playwright handles the exact event-result check,
while Midscene validates visual interaction semantics. Local validation on
September 20, 2026 passed all 5 cases.

## Why this is a separate directory

This directory sits one level below the `packages/web-platform/*` pnpm
workspace glob and is not a workspace member. It has its own `package.json`
and lockfile, installs with `npm ci`, and does not affect the repository's pnpm
or Turbo dependency graph. Playwright is pinned to the repository's version,
`1.61.1`.

## Cases

| YAML                          | Case bundles                                                 | Coverage                                                                     |
| ----------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `cases/web/shell.yaml` (2)    | `basic-bindtap`                                              | Visual click and pink-to-green round-trip through the shadow root and worker |
| `cases/web/elements.yaml` (3) | `basic-element-text-color`, `-image-src`, `-input-bindinput` | Gradient text, remote image loading, and input-event value mirroring         |

## Run locally

Install repository dependencies and build the workspace first with
`pnpm turbo build --filter='@lynx-js/web-core-e2e...'`. The build must produce
this package's `dist/*.web.bundle` files. Node.js 24.11 or later is required by
the repository's engines constraint.

```bash
# Terminal 1: start the development shell on PORT=3080 by default.
cd packages/web-platform/web-core-e2e
pnpm run serve

# Terminal 2: run Midscene.
cd packages/web-platform/web-core-e2e/midscene
npm ci
cp .env.example .env       # Add multimodal model credentials; do not commit.
set -a && source .env && set +a
npm test -- --project web-shell
```

## Case-writing guidelines

- Use `aiAct` for visible user interactions. Describe the user goal instead of
  decomposing it into `aiTap`, `aiScroll`, or other atomic AI operations.
- Use `aiAssert` for visual outcomes and semantic UI state.
- Do not assert fixed screenshot pixels. Device pixel ratio scales 100 CSS px
  to roughly one quarter of a 393 px viewport screenshot, so use relative
  descriptions such as "a small square" or "roughly a quarter of the page
  width."
- Use `aiWaitFor` for page readiness instead of fixed sleeps.
- Use `aiAct` for input editing, including focus and keyboard actions.
- Retain `web.expect` only for the upstream input-event contract: exact
  `innerText` equality with `foobar-6-6`, without trimming whitespace.
- The original Playwright pixel snapshots and exact assertions are unchanged.
  AI rendering assertions are additive semantic coverage, not equal-precision
  replacements for pixel snapshots. HTTP/decode/initial-value checks added by
  this POC have been removed; they were not assertions in the original cases.

The model preflight reads an image-only OCR challenge before the workspace
build. Text connectivity or HTTP 200 alone does not establish visual capability.
See [model diagnostics](./MODEL_DIAGNOSTICS.md) for the historical base64-as-text
failure and the controlled comparison with the current model.

The companion workflow is `.github/workflows/midscene-web.yml`. It uses the
official Playwright 1.61.1 container, Node.js 24, Turbo builds, and the Rsbuild
development server. Configure `MIDSCENE_MODEL_API_KEY`,
`MIDSCENE_MODEL_NAME`, `MIDSCENE_MODEL_BASE_URL`, and
`MIDSCENE_MODEL_FAMILY` as secrets in the destination repository; fork secrets
are not transferred by merging a pull request. Pages publication defaults to
the repository's default branch (`main` upstream). `MIDSCENE_PAGES_BRANCH`
can override it. Same-repository pull requests also publish review evidence.
The Web job always writes results and artifact access to Summary. The publisher
adds screenshots and exact-step HTML links only after deployment succeeds.

The existing website and reports share `.github/workflows/workflow-pages.yml`.
The website owns the root, REPL, and GenUI paths. Reports own
`/midscene/runs/<run-id>-<attempt>/`; upstream URLs use
`https://lynx-stack.dev/midscene/`, resolved from Pages metadata rather than an
assumed github.io origin. Both producers serialize archive updates and deployment
with the same concurrency group. The `pages-site-archive` branch retains the
composed site, including older report screenshots. A website rebuild removes
obsolete website files while preserving `/midscene/`; a report publication
preserves the website. Never deploy the report artifact directly to Pages.

On the first upstream run, reports that finish before the website build are
archived without deploying a report-only site. The first successful `Deploy`
website build publishes both. If that build fails, fix and rerun it; the existing
website remains live and report artifacts remain downloadable. Forks can publish
a report-only site and retain their previous root-level report URLs during the
archive migration.

Before merging, a repository administrator must ensure Settings → Pages → Build
and deployment uses **GitHub Actions**, and the `github-pages` environment permits
the default branch (and same-repository PR refs if PR publication is wanted).
The workflows need `contents: write` for the archive branch, `pages: write`, and
`id-token: write`; repository rules must allow archive updates. A normal
`GITHUB_TOKEN` cannot enable Pages for the first time. The upstream website already
uses Actions Pages, so no separate Midscene Pages site should be created.
Merge the native companion PR first for the cross-repository renderer check.

External-fork pull requests run a model-free type and
report-contract check, but are intentionally excluded from credentialed E2E
runs; maintainers must validate on a trusted same-repository branch before
treating the suite as an upstream PR gate.

The report renderer is vendored from the native Lynx suite so this workflow
remains self-contained. `scripts/check-renderer-parity.sh` compares it with the
canonical renderer in the sibling `lynx` repository and fails on drift. The
check runs before credentialed Web E2E and also runs weekly on its own, without
model credentials or Pages publication. It checks `develop` by default,
falling back to the native feature branch while the fork PR is unmerged. For
upstream integration, merge the native suite first so the canonical file exists
on `lynx/develop`.
