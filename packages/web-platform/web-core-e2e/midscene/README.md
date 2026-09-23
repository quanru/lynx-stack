# Midscene AI E2E for the web-core-e2e shell

This directory adds a visual-semantic layer to the package's existing
Playwright E2E suite. ReactLynx renders inside the open shadow root of
`<lynx-view>` and a worker. Playwright handles precise DOM and network checks,
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
- Use the deterministic `web.expect`, `web.fill`, and `web.expectResponse`
  nodes for exact values, box dimensions, image decode state, and resource
  responses. Reserve visual
  assertions for color, spatial relationships, and other visual semantics.

The companion workflow is `.github/workflows/midscene-web.yml`. It uses the
official Playwright 1.61.1 container, Node.js 24, Turbo builds, and the Rsbuild
development server. Configure `MIDSCENE_MODEL_API_KEY`,
`MIDSCENE_MODEL_NAME`, `MIDSCENE_MODEL_BASE_URL`, and
`MIDSCENE_MODEL_FAMILY` as secrets. Optionally set
`MIDSCENE_PAGES_BRANCH=main` to publish Pages reports after pushes to `main`.
Same-repository pull requests also publish review evidence. The report job adds
an English Actions Summary with totals, durations, failure details, and a
three-column node screenshot grid. Each screenshot and case name links to the
exact step in the complete HTML report. Reports use
`runs/<run-id>-<attempt>/` paths and are retained on the
`midscene-pages-archive` branch, so later Pages deployments do not replace old
Summary targets. External-fork pull requests run a model-free type and
report-contract check, but are intentionally excluded from credentialed E2E
runs; maintainers must validate on a trusted same-repository branch before
treating the suite as an upstream PR gate.
