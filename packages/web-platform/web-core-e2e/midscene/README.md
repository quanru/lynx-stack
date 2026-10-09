# Midscene E2E for web-core and web-elements

This directory adds a visual-semantic layer to the package's existing
Playwright E2E suite. ReactLynx renders inside the open shadow root of
`<lynx-view>` and a worker. Playwright handles the exact event-result check,
while Midscene drives user interactions. The suite contains 142 cases: the
original five-case pilot, ten event migrations, and 85 additional one-to-one
ReactLynx migrations, plus 15 continuation cases with original deterministic
assertion values, 25 original web-elements CSS/attribute contracts and two
CSS variable fallback contracts. The 140-case
four-shard run passed in
[run 37928102242](https://github.com/quanru/lynx-stack/actions/runs/37928102242),
including report generation and Pages publication. Downloaded publication
evidence has 140 linked screenshots and no missing report/preview targets.
The next two CSS fallback cases require separate hosted validation.

## Why this is a separate directory

This directory sits one level below the `packages/web-platform/*` pnpm
workspace glob and is not a workspace member. It has its own `package.json`
and lockfile, installs with `npm ci`, and does not affect the repository's pnpm
or Turbo dependency graph. Playwright is pinned to the repository's version,
`1.61.1`.

## Cases

| YAML                                      | Case bundles                                                                                                          | Coverage                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `cases/web/shell.yaml` (2)                | `basic-bindtap`                                                                                                       | Visual click and pink-to-green round-trip through the shadow root and worker                    |
| `cases/web/elements.yaml` (3)             | `basic-element-text-color`, `-image-src`, `-input-bindinput`                                                          | Gradient text, remote image loading, and input-event value mirroring                            |
| `cases/web/events.yaml` (10)              | Global events, tap payloads, simultaneous handlers, and x-input                                                       | AI-driven interactions with exact upstream attribute, text, and input-value checks              |
| `cases/web/expansion.yaml` (85)           | Styling, lazy components, frames, native-module results, events, inputs, and linear layout                            | Original assertion sequences, computed CSS, exact bounding-box dimensions, text, and attributes |
| `cases/web/continuation.yaml` (15)        | Dataset, image/scroll sizing, animations, exposure, invoke callbacks, CSS removal, textarea, nested layout and reload | Original deterministic assertions and click counts                                              |
| `cases/web-elements/contracts.yaml` (7)   | Layout, dataset, filter-image and x-image events, swiper alignment                                                    | Original HTML fixtures, font readiness, and exact computed CSS                                  |
| `cases/web-elements/attributes.yaml` (18) | Input type/inputmode, spellcheck and enterkeyhint propagation                                                         | Exact attributes on the original inner input and textarea elements                              |
| `cases/web/css-fallback.yaml` (2)         | CSS variable fallback and nested fallback                                                                             | Original computed background color, with font readiness and standard report captures            |

Both expansion batches map each case name to the same test in
`../tests/reactlynx.spec.ts`; the two event-trigger cases share the original
`basic-event-trigger` fixture. `scripts/expansion-contract.test.mjs` checks the
original assertion targets/indices, counts, values, CSS ordering/negation, and
click counts. Each added case creates visual evidence before deterministic
assertions can fail, so those failures still have an agent report and screenshot.
The repeated upstream `config-css-selector-false-type-selector` name is counted
only once. No snapshot-only, unconditionally skipped, or injected-API tests are
included to inflate the count. This is Chromium client-rendered coverage, not a
replacement for the original SSR or multi-browser matrix.

The 15 continuation cases cover dataset events, image/scroll dimensions,
animations, exposure, invoke callbacks, CSS removal, textarea filtering, nested
layout and reload. Standard `recordToReport` captures provide evidence for
intentionally nonvisual style/size contracts, without inventing visual assertions
or requiring a valid image resource where the original only checks dimensions.
If an exact assertion later fails, its link opens the failed step while its
preview uses the nearest preceding capture from that same attempt.

The two independent projects run cases serially, with separate browser contexts, pages,
agents, and report filenames keyed by case run ID. Midscene 1.13.1 applies
`maxConcurrency` to projects, not cases; increasing it cannot parallelize cases
within a project. CI runs four independent jobs, each with a balanced partition of the
case definitions. Each job remains serial internally. Partitioning preserves
all steps and document lifecycle fields and rejects duplicate case names.
Each case retains two bounded retries;
reports expose retries rather than hiding them behind an aggregate pass count.

### Interaction migration batch

Each row maps one original `tests/reactlynx.spec.ts` case to the same-named
case in `events.yaml`. The fixtures and original Playwright tests are unchanged.
Readiness uses `aiWaitFor`; user actions use `aiAct`.

| Original case                       | Preserved assertions                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `basic-global-bind`                 | Observer style contains green after the first target tap and pink after the second |
| `basic-global-bindkeydown`          | Observer style contains green after the a key                                      |
| `basic-global-bindkeydown-key`      | `data-key === Enter`                                                               |
| `basic-global-bindkeydown-code`     | `data-code === KeyA`                                                               |
| `basic-bindtap-detail`              | Target style contains green, then pink                                             |
| `basic-event-target-id`             | Target style contains green, then pink                                             |
| `basic-bindtap-simultaneous`        | Green style, `data-mts-clicked === true`, and `BTS Clicked` text                   |
| `basic-element-x-input-bindfocus`   | Exact `bindfocus` result text                                                      |
| `basic-element-x-input-bindconfirm` | Exact `bindconfirm` result text                                                    |
| `basic-element-x-input-bindinput`   | Initial input value `bindinput`, then `foobar-6-6` result text                     |

These cases do not replace pixel snapshots, low-level CDP API checks, or the
multi-browser/SSR matrix. The Midscene project runs Chromium CSR.

## Run locally

Install repository dependencies and build the workspace first with
`pnpm turbo build`. The build must produce
this package's `dist/*.web.bundle` files. Node.js 24.11 or later is required by
the repository's engines constraint.

```bash
# Terminal 1: start the development shell on PORT=3080 by default.
cd packages/web-platform/web-core-e2e
pnpm run serve

# Terminal 2: start the independent HTML fixture server.
cd packages/web-platform/web-elements
PORT=3081 pnpm run serve

# Terminal 3: run Midscene.
cd packages/web-platform/web-core-e2e/midscene
npm ci
cp .env.example .env       # Add multimodal model credentials; do not commit.
set -a && source .env && set +a
npm test -- --project web-shell
npm test -- --project web-elements

# Run the same partition used by CI (one-based index, total shard count).
node scripts/run-shard.mjs 1 4
```

All 25 web-elements cases passed locally on the first attempt using
the real Chromium browser and standard report captures, without model calls.
The matching 25 unchanged upstream Playwright cases also passed against the same
source checkout and server (Chromium, one worker, 4.2 seconds). This verifies the
original and migrated contracts for this batch, not the multi-browser matrix.
The source fixtures and upstream tests are unchanged. `javascript` is used only
for the original `document.fonts.ready` prerequisite, not selector-based actions.
Hosted validation passed in run 37928102242 at `3239018` (140 cases).
The next two CSS fallback cases and their unchanged original Chromium tests
also passed locally, with both migrated cases passing on their first attempt.
Their source assertion targets, values and counts are checked separately against
`reactlynx-css-var-fallback.spec.ts`. SSR and other browsers remain pending.

After installing the pinned Rust 1.97.1 toolchain and WASM targets, the full
local `pnpm turbo build --env-mode=loose` passed all 74 tasks. Loose mode is
needed when the toolchain uses task-local `CARGO_HOME`/`RUSTUP_HOME`; Turbo's
strict environment otherwise strips those locations from build subprocesses.
No project source, lockfile or global shell PATH was changed for this build.

## Case-writing guidelines

Shard artifacts retain their index, total count, commit SHA, case names, and
producer outcome. Publication selects the latest attempt independently for
each shard, so a partial rerun keeps successful sibling reports. Missing shards
remain failures in Summary. Reports are kept in separate directories to avoid
overwriting runner indexes, then merged into the HTML report; passed cases
remain in the collapsed appendix with linked screenshots.

- Use `aiAct` for visible user interactions. Describe the user goal instead of
  decomposing it into `aiTap`, `aiScroll`, or other atomic AI operations.
- Use `aiAssert` for visual outcomes and semantic UI state.
- Do not assert fixed screenshot pixels. Device pixel ratio scales 100 CSS px
  to roughly one quarter of a 393 px viewport screenshot, so use relative
  descriptions such as "a small square" or "roughly a quarter of the page
  width."
- Use `aiWaitFor` for page readiness instead of fixed sleeps.
- Use `aiAct` for input editing, including focus and keyboard actions.
- Retain `web.expect` for upstream deterministic assertions: exact text, input
  values, attribute equality, attribute substring checks, computed CSS, and
  numeric bounding-box equality. CSS negation is explicit, and an absent element
  cannot satisfy it. Repeated selectors use a zero-based `index`. Text comparisons
  do not trim whitespace. Do not substitute AI judgment for event payloads.
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
The Web job writes only result counts and artifact access to Summary, without
duplicate case tables or empty screenshot columns. The publisher
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

### Pages setup fallback

If Pages is unavailable, publication emits a warning and a Summary with the setup
path: Settings → Pages → Build and deployment → Source → GitHub Actions.
It skips deployment without failing the test jobs. Case results and downloadable
native reports remain in the test job Summaries and Actions artifacts.
