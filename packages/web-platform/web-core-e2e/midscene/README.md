# Midscene E2E for web-core and web-elements

This directory adds a visual-semantic layer to the package's existing
Playwright E2E suite. ReactLynx renders inside the open shadow root of
`<lynx-view>` and a worker. Playwright handles the exact event-result check,
while Midscene drives user interactions. The suite contains 200 cases: the
original five-case pilot, ten event migrations, and 85 additional one-to-one
ReactLynx migrations, plus 15 continuation cases with original deterministic
assertion values, 26 original web-elements CSS/attribute contracts and two
CSS variable fallback contracts, two frame auto-sizing contracts, and the original
external-bundle evaluation/stylesheet contract, two animation callback cases,
the separate middleware entry-point contract, three directory-bundle contracts,
and the original setState callback, lazy-component instance-isolation,
frame-element JavaScript property, four relative-coordinate contracts, the error
display contract, the original input bindinput payload contract, and two
shadow-root stylesheet inclusion contracts and two main-thread autoScroll
contracts, two setNativeProps text-count contracts, three rpx/ppx dimension
contracts, three updateData/processData API contracts and three reload/viewport
unit contracts, three exact console callback/global contracts, two worker
lifecycle contracts, one performance timing-key contract, two main-thread
click/console contracts, one global-event API contract, five error-payload contracts,
two reportError/shared-context interaction contracts, and eight original
Linux Chromium pixel-baseline contracts in an isolated project.
The 147-case four-shard run passed in
[run 37940214877](https://github.com/quanru/lynx-stack/actions/runs/37940214877),
including report generation and Pages publication. Downloaded publication
evidence has 147 linked screenshots and no missing report/preview targets; all
152 unique published report/preview URLs returned HTTP 200. There were 148
attempts, with only `basic-css-var` retried. The animation and external-bundle
translations passed on their first attempts.
In the earlier 144-case run, the textarea input filter case required one retry:
its old action goal incorrectly demanded that
filtered punctuation remain visible. The local correction retains the complete
original input payload and exact `foobar` assertion, but stops after sending the
input rather than trying to undo application filtering. It passed in the later
160-case run described below.
The previous 153-case batch failed in
[run 37944694673](https://github.com/quanru/lynx-stack/actions/runs/37944694673).
Shard 2 failed during endpoint preflight with a network connection timeout,
before any of its 38 cases executed. Shard 4 passed 38/38. In total, 113/115
executed cases passed; 38 did not execute. Report publication succeeded.
Shard 3 completed with 37/38 passing. Its lazy-component readiness incorrectly
required a visible Load Component label, but the fixture's raw view child text
does not render. Local screenshots confirm an unlabelled red square. The local
correction uses visible colors/relationships while retaining four clicks and six
exact CSS assertions; this correction passed in the 160-case run below.
Shard 1 completed with 38/39 passing. The animation event case's action traces
and screenshots show missed text targets: one pixel left of the animation line,
the transition line instead of animation, and blank space below the second
section. Exact assertions correctly failed. Local action descriptions now require
word centers and adjacent-line relationships, with standard `aiAct` deepLocate
and caching disabled. SDK 1.13.1 then performs dedicated visual grounding instead
of directly executing the planning model's point. The 160-case run passed this
case on its first attempt;
no coordinates, selector actions, atomic action nodes or changed assertions are added.
The 160-case batch at `8c3ea9e` passed in
[run 37948938294](https://github.com/quanru/lynx-stack/actions/runs/37948938294).
All 160 cases passed, with 161 attempts: only `basic-lazy-component-multi`
retried once. Report generation and Pages succeeded. The downloaded publication
has 160 linked screenshots; all 165 unique published screenshot/report URLs
returned HTTP 200. The seven additions after 153 cases are now hosted-verified.
The next 13 cases passed first attempt in the 173-case batch at `65d7e5e`,
[run 37954151485](https://github.com/quanru/lynx-stack/actions/runs/37954151485): two further
shadow-root stylesheet cases, two autoScroll cases and two setNativeProps
text-count cases, one scroll-view CSS case, three rpx/ppx cases and three
updateData/processData cases. All 173 passed, with 174 attempts; only
`basic-event-child-trigger` retried once. Report generation and Pages succeeded,
with 173 linked screenshots and all 178 unique public report/image URLs HTTP 200.
The next three reload/viewport cases passed hosted run 38016292683 at `e171662`:
176/176 first attempts, all four shards, report generation and Pages. The
downloaded publication has 176 linked screenshots and all 181 unique public
URLs returned HTTP 200. Pushed `0fae870` collects 190 cases in pending run
38018429636; the next local interaction/pixel cases bring collection to 200.
The animation translations retain original event-sequence match counts and CSS
checks, with ordinary clicks through `aiAct`. No local model credentials are
configured; local checks do not make AI calls.

## Why this is a separate directory

The external-bundle case and its unchanged original Chromium test both passed
locally on the first attempt. `web.expect` with `matchingText`/`count` uses the
same public `page.getByText` locator and checks the complete count, without
selecting the first match or requiring visibility. Duplicate matches fail the
original count-one contract. All 82 model-free checks and typechecking pass.
Two further original tests pass locally: reportError and shared context. Their
YAML translations replace only the ordinary clicks with `aiAct`, retaining
the original 200/500 ms error observation windows, hidden LynxView CSS,
source-map line/column, exact error message/nonempty stack, and second-view
green CSS result. The error predicate matches the unchanged original callback
across 90 valid/malformed inputs. These two AI translations await hosted execution.

## Original Web pixel contracts

The `web-pixels` project uses the original Pixel 5 context and all 13 Chromium
launch flags, including software rendering and font settings. It is restricted
to Linux and pinned Playwright 1.61.1; existing web-shell/web-elements contexts
are unchanged. Its eight static cases retain original waits and snapshot paths.
Missing baselines fail without creating or updating them.

`web.pixels` calls the same pinned `_expectScreenshot` backend as Playwright's
public matcher: full-page CSS-scale screenshots, animations allowed, caret
hidden, zero differing-pixel ratio and original default perceptual threshold,
stable-frame polling and five-second assertion timeout. The private API is
version-guarded and source-contract tested. Failure PNGs (expected, actual,
previous and diff where available) stay under `midscene_run/web-pixels` and
are uploaded with that attempt; ordinary report screenshots remain linked in
Summary. No RGB approximation, AI similarity, masks or baseline update is used.

```bash
node scripts/check-pixel-backend.mjs
npm test -- --project web-pixels  # Linux only; requires the built shell server
```

The first command compares the adapter with the unchanged public matcher on
synthetic same/changed images in a temporary directory. Both agree on pass and
failure, and failure evidence is checked. This local backend conformance is
not execution or acceptance of the eight Linux repository baselines; those
require hosted CI. Other browsers and SSR pixel variants remain pending.
The unchanged middleware original also passes locally. Its migration retains
the separate `/middleware` URL, two ordinary `aiAct` clicks, and immediate
inline-style substring reads; it does not extend the original Chromium-only,
client-only eligibility to SSR or other browsers. The unchanged originals for
split-by-experience, split-by-module and all-in-one development mode also pass
locally. Their translations preserve `hasdir=true`, original computed CSS or
single-read inline styles, and the original client-only scope. Both stylesheet
translations passed locally on their first attempt, with two linked screenshots
and complete HTML reports. The development-mode and middleware translations
passed in hosted run 37948938294; no local model calls were made.

The original frame-element mapping and its translation both passed locally on
their first attempt. The adapter reads the actual JavaScript `tagName`, not an
attribute or a case-folded surrogate.

The four relative-coordinate originals pass locally. Three translations without
AI clicks also pass on their first attempt; all four passed in hosted run 37948938294.
`web.prepareLynxView` installs only the original offset/transform fixture before
navigation, not a selector-based user action. Browser verification found two
initialization hazards: serialized function helpers from the config loader, and
the original helper observing `document.documentElement` before `<html>` exists.
The adapter sends literal browser source, and both helpers now observe Document.
`scripts/check-fixture-style.mjs` uses the real SDK loader and browser to require
actual `(200, 200)` placement and no page errors before CI executes cases.
Original CSS assertions and fixture routes remain unchanged; an origin-position
green result alone is not accepted as migration evidence.
The error-display original and translation also passed locally on their first
attempt. The input bindinput original passes locally; its AI translation retains
Enter, the complete `foobar` payload and the exact `foobar-6-6` result, and passed
in hosted run 37948938294.

Both shadow-root stylesheet originals and their YAML translations passed locally
on their first attempts. They retain the original inline-style and fetched-link
concatenation, exact `/:host\s*,\s*lynx-view\s*\{/` regular expression and single
read. Computed CSS, screenshot appearance, polling and swallowed fetch errors
are not substitutes for stylesheet inclusion in the actual shadow root. These
two cases passed first attempt in hosted run 37954151485.

Both unchanged main-thread autoScroll originals pass locally. The translations
use one ordinary `aiAct` click, then read the actual `scrollTop` JavaScript
property once: exactly zero before the click and strictly greater than 100
afterward. Standard `javascript` timers retain the original 100 ms setup and 3000/2000
ms observation windows; no extra retries, polling, manual scroll action or
visual substitute is added. Both passed first attempt in hosted run 37954151485.

Both setNativeProps text-count originals and YAML translations pass locally on
their first attempts. The first preserves the sequential sum of complete
`getByText('the count is:1').count()` and `getByText('the count is:2').count()`;
exactly one total match is required, not either text being present. The second
retains all three immediate count-one reads for `hello`, `--` and `world`.
Original 500 ms waits remain unchanged. Raw count assertions use `immediate`,
while existing upstream `toHaveCount` translations keep their polling semantics.
Standard `javascript` timers avoid the model configuration required by SDK
`sleep`; no model calls or custom wait nodes are needed. Both passed first attempt
in hosted run 37954151485.

The additional web-elements `scroll-view-must-linear` translation preserves the
original `#target` computed `flex-shrink: 0` assertion. Its unchanged original
passes against the fixture server on port 3081; all eight cases in the translated
contract file pass locally on their first attempts. It does not replace any
neighboring scroll-view pixel, fading-edge or CDP scroll-event case.

All three rpx/ppx dimension originals and their corrected YAML translations pass
locally. Standard JavaScript applies the original fixture's 50 px container width
and, for rpx, `--rpx-unit: 1cqw`; both target width and height must remain exactly
`10px`. AST checks compare the mutation statements with the original locator
callback, and VM checks execute the literal script, without an implicit function
wrapper that would hide a top-level return error. This is fixture/API setup, not
a selector-based user action. Missing or duplicate LynxViews fail closed.

All three updateData/processData originals and translations pass locally on
their first attempts. They retain the actual `updateData` calls, complete
`{ mockData: 'updatedData' }` payload, default/`useless`/`processData` modes,
original waits and ordered pink/green computed CSS assertions. Ordered AST
contracts compare API arguments, routes, waits and assertions, rather than
accepting a matching final screenshot. No custom API action node is added.

Three reload/viewport originals and YAML translations pass locally on their
first attempts. The page-count check reads immediate shadow-root children with
`part=page`, not a visual or eventual count. Global-props reload retains its
original payload, optional API access, waits and immediate inline-style reads.
Viewport-unit coverage retains all three reload phases and six positive/negative
CSS assertions, including 500 px transformed units and 250 px container units.
Source contract checks compare ordered API bodies, waits and assertions. No
selector-based UI action or custom action/wait node is introduced. Hosted
execution of these three additions is pending.

Six further runtime originals and YAML translations pass locally on their first
attempts. Console listeners attach to each case's Page before navigation, as in
the originals; exact message occurrences include worker console events and
retain the original 200 ms/100 ms observation windows without polling.
`updateData` retains its payload, `default` mode and real callback. Worker
checks read `page.workers().length` once, retaining the original upper bounds
3/2/1 and both actual LynxView removals. Performance coverage retains its green
CSS assertion and all 13 timing keys; it is not benchmark threshold coverage.
These are additional modes of the existing `web.expect`, not atomic action
nodes. Console evidence is case/project scoped, bounded and never persisted as
arbitrary logs. Overflow fails rather than accepting partial evidence. A local
replay of all nine current additions has nine screenshots and all 14 local
image/HTML targets exist. Hosted validation of these six additions is pending.

Three further originals pass locally: two main-thread tap/SystemInfo callbacks
and `sendGlobalEvent`. Both taps use one ordinary `aiAct` click and retain exact
`hello world` console occurrence checks after the original 100 ms waits. They
still require hosted AI execution. The global-event YAML also passes locally
on its first attempt, retaining the actual event name, array payload and both
ordered CSS assertions.

Five error callback originals and translations pass locally on their first
attempts. The existing `web.expect` checks exact main/background file names,
release strings, error messages, numeric source-map coordinates and a nonempty
string stack within the original 500 ms windows. Read-only console argument
projections stay in memory and retain one complete event per conjunction.
Assertions never wait for pending extraction or combine fields from different
events. Extraction failures and bounded-evidence overflow cannot pass.
Differential checks execute the unchanged original callbacks on 180 valid and
malformed events. These five additions are client-only here; SSR support is
not newly claimed. All 14 additions after the pushed 176-case head await hosted
validation; 12 non-AI translations pass locally, with two AI clicks pending.

This directory sits one level below the `packages/web-platform/*` pnpm
workspace glob and is not a workspace member. It has its own `package.json`
and lockfile, installs with `npm ci`, and does not affect the repository's pnpm
or Turbo dependency graph. Playwright is pinned to the repository's version,
`1.61.1`.

## Cases

| YAML                                                                             | Case bundles                                                                                                          | Coverage                                                                                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `cases/web/shell.yaml` (2)                                                       | `basic-bindtap`                                                                                                       | Visual click and pink-to-green round-trip through the shadow root and worker                    |
| `cases/web/elements.yaml` (3)                                                    | `basic-element-text-color`, `-image-src`, `-input-bindinput`                                                          | Gradient text, remote image loading, and input-event value mirroring                            |
| `cases/web/events.yaml` (10)                                                     | Global events, tap payloads, simultaneous handlers, and x-input                                                       | AI-driven interactions with exact upstream attribute, text, and input-value checks              |
| `cases/web/expansion.yaml` (85)                                                  | Styling, lazy components, frames, native-module results, events, inputs, and linear layout                            | Original assertion sequences, computed CSS, exact bounding-box dimensions, text, and attributes |
| `cases/web/continuation.yaml` (15)                                               | Dataset, image/scroll sizing, animations, exposure, invoke callbacks, CSS removal, textarea, nested layout and reload | Original deterministic assertions and click counts                                              |
| `cases/web-elements/contracts.yaml` (8)                                          | Layout, dataset, filter-image and x-image events, swiper alignment and scroll-view linear shrink                      | Original HTML fixtures, font readiness, and exact computed CSS                                  |
| `cases/web-elements/attributes.yaml` (18)                                        | Input type/inputmode, spellcheck and enterkeyhint propagation                                                         | Exact attributes on the original inner input and textarea elements                              |
| `cases/web/css-fallback.yaml` (2)                                                | CSS variable fallback and nested fallback                                                                             | Original computed background color, with font readiness and standard report captures            |
| `cases/web/frame-sizing.yaml` (2)                                                | Frame auto-height and auto-width                                                                                      | Exact attributes and their negation; original immediate numeric height comparison               |
| `cases/web/text-count.yaml` (4)                                                  | External bundle, animation callbacks and setState callback                                                            | Original positive/zero getByText counts, event sequences and computed background color          |
| `cases/web/middleware.yaml` (1)                                                  | Middleware basic-bindtap entry point                                                                                  | Original middleware URL, two clicks and single-read inline-style substring checks               |
| `cases/web/properties.yaml` (1)                                                  | Frame element mapping                                                                                                 | Original exact JavaScript tagName property                                                      |
| `cases/web/relative-coordinates.yaml` (3) and `relative-coordinate-tap.yaml` (1) | Offset layout, transformed layout, tap and boundingClientRect                                                         | Pre-navigation initialization, original routes and exact computed CSS                           |

`text-count.yaml` also retains `expectNoText` as an exact zero-match assertion,
not a substring or visibility check. `reentrant-lazy.yaml` preserves the original
four clicks and six indexed computed-style assertions, including the idempotent
second Load Component click. Both unchanged originals pass locally; the
translations passed in hosted run 37948938294.

`cases/web/directory-bundles.yaml` and `directory-interactions.yaml` add three original directory-bundle cases,
retaining the `hasdir=true` entry point rather than testing a flat bundle instead.

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

The next two frame sizing cases and their unchanged original Chromium tests
also passed locally, with both migrated cases passing on the first attempt.
Attribute negation accepts an absent attribute on an existing element, matching
Playwright. The auto-height bounds check retains its original single numeric
read (`greaterThan: 0`, `immediate: true`), not a visual size approximation or
retry-until-positive check. The 142-case run 37931947134 does not include this
subsequent local batch. Local typechecking and all 40 model-free checks pass.

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
