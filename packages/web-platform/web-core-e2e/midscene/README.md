# Midscene E2E for web-core and web-elements

## Required-matrix regression and corrected YAML profiles

Run `node scripts/check-required-browser-coverage.mjs` from this directory
(or `node --test scripts/required-browser-coverage.test.mjs`). The check collects
original suites with Playwright `--list`, joins exact file/title/group/browser/mode
identities against the retained catalogs and Chromium-only YAML mappings, and
fails for any uncovered required eligible variant or unknown source guard.
Current collection has **zero required CSR/component browser gaps**; **729
optional hydrated-SSR variants** remain separately identified. Explicit empty
callbacks and repeated non-UI template allocations are not counted as passes.
This is a selection regression, not runtime acceptance or an assertion-equivalence
proof; source-specific differential contracts remain necessary.

Commit `5f7437d` corrects **217 ordinary YAML contexts** (178 web-shell and 39
web-elements) to inherit the original Chromium Pixel 5 profile: viewport
393 × 727, screen 393 × 851, DPR 2.75, mobile/touch settings, user agent and all
13 launch flags. The prior ordinary viewport was 393 × 851. Assertions,
timeouts, fixtures and source callbacks are unchanged. The earlier hosted
471-case green result used the previous profile and **does not accept this
corrected profile**; a fresh hosted run is required.

The root Turbo build passed 74/74 before this documentation freeze. Final
combined model-free tests/typecheck and fresh hosted execution are separate
gates; collection alone cannot establish that all 2424 evidence rows pass.

## Required Firefox/WebKit extension (collection verified; hosted acceptance pending)

The required browser-variant extension adds 461 unchanged source declarations /
465 expanded titles / 930 Firefox-WebKit items: core CSR contributes 271
declarations / 275 titles / 550 items, and components contribute 190 / 190 / 380.
Ten original source skips remain, leaving 920 statically eligible items.
The two CSS inheritance loops each produce three titles but count as one source.

The corresponding catalog totals are 701 sources / 1835 original-runner items,
plus the separate retained group at 33 sources / 102 items: **734 original
sources / 1937 execution items**, alongside **487 YAML cases**. These produce
2424 combined evidence rows, not 2424 passing tests. Original outcomes include
238 source skips, one source early return and 1698 statically eligible items,
including one non-UI template contract. Neither skips nor returns are passes.

This extension selects only Firefox and WebKit, without adding Chromium or
optional hydrated SSR. Original SSR-No-JS tests retain their fixed SSR URL and
test-level JavaScript-disabled setting; they are not optional hydrated SSR.
The separately audited 729 optional hydrated-SSR variants remain outside this
extension. No product code, fixture, callback, assertion or browser profile is
changed, and these original callbacks are not new AI migrations.

The five source-catalog files at `f4ac279` passed three model-free source
contracts and actual browser-free collection for all 930 items. This checks
exact titles, source locations, two fixed dynamic expansions, callback/loop
hashes and source guards. It does not establish runtime acceptance. The prior
independent full-build/test checkpoint below predates this extension; new-head
hosted execution and final combined validation remain separate gates.

## Previous independently verified checkpoint — 2026-10-16 (local acceptance only)

Implementation checkpoint: Web `bac0c85` (bulk integration `a25fddc`);
Native `25b69bd`. The Web inventory contains **487 YAML cases**, separately
from **273 original source declarations / 1007 execution items**. Sixteen
original runners collect 240 sources / 905 items; the additional retained
collection contributes 33 sources / 34 expanded titles / 102 items.

The 1007 original items comprise 219 source-declared skips, one source early
return and 787 statically eligible items, including one non-UI template
contract. Skips and the early return are not passes; the template contract has
no applicable screenshot. These counts describe collection and evidence policy,
not executed or passing tests.

Independent local verification passed: full root Turbo build 74/74, Web
311/311 model-free tests and TypeScript, Native 253/253 model-free tests and
TypeScript, both original collection checks, and byte-for-byte shared renderer
parity. No browser was launched for collection or model-free verification.

The frozen plan's 174 active source dispositions are implemented, but this is
not full browser/SSR parity or completed migration acceptance. The broader
browser/render variant audit is ongoing. The 24 conditional AI candidates are
temporarily retained with their original callbacks and specific reasons; they
are not declared permanently unsuitable for AI.

No hosted acceptance exists for this new local head. Last verified Web
publication remains run 38871678621 at `bdd709c`: 471 first-attempt YAML passes,
471 linked screenshots and report links, and 473 unique evidence URLs returning
HTTP 200. Its original runners reported one flaky pass and 54 source skips.
Native run 38874311848 at `aa0bece` still has Android running and an iOS WDA
startup failure before XCTest/case execution. Do not transfer those older
results to the new local inventory.

## Historical implementation checkpoints

The sections below record earlier batches. Their counts and pending states are
historical; the current checkpoint above supersedes them.

## Dynamic image and complete original-runner evidence (hosted acceptance pending)

The retained collection now contains 33 source declarations / 34 expanded
titles / 102 browser items. The new unchanged detached-image callback expands
over x-image and inline-image, sharing one source identity while retaining six
independent browser rows. Its complete load queue, reconnect and detach sequence,
six deep-equality assertions and original case deadline remain unchanged.
AST checks pin the two-value loop and callback; actual browser-free collection
confirms both titles at the same source line across all three original profiles.

All preexisting original runners now have unified evidence wiring: 120 unique
source declarations / 380 execution items, including 54 source-declared skips
and one non-UI template contract. The latter has no applicable screenshot;
skips are not passes. Combined with the separate retained collection, the
original-runner totals are 153 source declarations / 482 execution items,
alongside 487 YAML cases. The prior original-runner evidence wiring gap is zero,
but this does not establish hosted acceptance or completion of all remaining
source migrations. No original callback, fixture or product code changed.

## Host observation and SVG evidence follow-up (hosted acceptance pending)

The retained collection now selects 32 unchanged source callbacks across three
original profiles (96 execution items). Four additions retain the original
list scroll and visible-item events, text page/console-error observation, and
audio request-header interception. Listener and route registration order,
1000/500 ms waits, empty-array acceptance, and every assertion remain unchanged.
The audio header callback deliberately retains its original limitation: without
an intercepted request it can pass without checking a header. No request-count
oracle was added, and route.continue remains unawaited.

The existing SVG/selection/webview invocation now also produces unified evidence:
12 source declarations expand to 15 titles / 45 browser items because one SVG
declaration generates four titles. Existing-runner evidence totals 26 sources /
105 items; combined with the retained collection this is 58 unique sources /
201 execution items, separate from 487 YAML cases. The remaining existing-runner
report gap is 275 collected items: 220 eligible UI items, 54 original skips and
one non-UI contract. This is evidence integration, not AI migration or hosted
acceptance. Source callbacks, fixtures and original runner behavior are unchanged.

## Stable visible actions (hosted validation pending)

Collection is now 487 YAML cases. Three additions use aiAct only for the
original visible clicks: audio mute, audio set-volume and CSR list removal.
The original 3000 ms mute wait, separate play/set-volume actions, and list
500/1000/1000 ms waits remain. Audio retains a single truthy muted read or
strict volume=0.5 read. Each list phase retains separate count and ordered-ID
reads; the full page's open shadow roots are searched, not only one host.

Source replay compares original navigation helpers, action order, waits,
assertion reads and negative cases. A pinned Playwright CSS traversal comparison
covers nested roots and extra matches. Fixture inspection confirms independent
visible controls, but does not prove model grounding. Hosted AI acceptance is
pending; the original WebKit volume exclusion and CSR-only list scope remain.
No fixture, product source, PNG or retained-input selection changes are included.

## Existing original runner evidence follow-up (hosted acceptance pending)

Five existing invocations now record final-attempt screenshots and HTML/JSON
without adding test executions: keyboard CSR/SSR, lazy/reload CSR, animation CSR,
and list APIs. Their 14 unique source declarations expand to 60 browser/render
items. Original callbacks, grep selections, profiles, workers, waits, retries and
server lifecycles are unchanged. The two package-local evidence configurations
inherit the original configurations and only add end-of-test recording.

Each producer outcome is tracked separately, including skipped or cancelled
steps. Manifests are converted before upload and validated against their runner
identity; a CSR manifest cannot stand in for SSR. Publication combines this
evidence with the preceding 28-source/84-item collection through the same
two-section Summary: 42 unique original sources / 144 execution items, separate
from 487 YAML cases. Browser-free collection and synthetic tests do not establish
hosted passes or public report availability.

The preexisting report gap was 120 unique source declarations / 380 collected
browser/render items. This patch wires 60 of those items, leaving 320 without
unified per-case evidence: 265 statically eligible UI items, 54 original skips,
and one non-UI template contract. Skips are never passes; the template contract
must report screenshots as not applicable rather than manufacture a blank page.
See [the detailed ledger](MIGRATION.md#existing-original-runner-evidence-ledger).

## Scrollend payload follow-up (hosted validation pending)

Collection is now 484 YAML cases. The original scroll-view scrollend callback
retains its 300 ms wait, programmatic scrollTop=200, 200 ms wait and single
innerHTML JSON read. Event type must equal scrollend; the four geometry fields
only have to differ from undefined, exactly as originally asserted. Null,
strings and other defined values are not silently rejected by stronger checks.
Source replay covers missing DOM, malformed JSON and missing fields without
polling. Hosted Chromium acceptance is pending; other browser profiles remain
separate. Retained original runner coverage is not added to this YAML count.

## Exposure viewport batch (hosted validation pending)

Collection is now 483 YAML cases. Three exposure contracts preserve thirteen
original PNG checkpoints and twenty-three individual 100 ms waits. Only ten
source-bound web-core checkpoints use fullPage=false; initial images and all
other checkpoints retain fullPage=true. YAML cannot supply arbitrary screenshot
options. Differential replay verifies the original API calls, property writes,
missing-element failures and browser guards; backend spies verify all thirteen
original PNG byte buffers and complete screenshot options. Hosted Chromium
acceptance remains pending; Firefox/WebKit and SSR coverage are not inferred.

## Retained input evidence integration (hosted acceptance pending)

`web-elements/playwright.retained-inputs.config.ts` selects 28 original input,
timing and audio declarations across the three unchanged browser profiles (84 execution
items). It adds end-of-test screenshots and HTML/JSON reporters without editing
the original callbacks. `check-retained-input-collection.mjs` validates actual
Playwright collection after the root build without launching browsers.

The producer-side evidence writer converts absolute attachment paths into a
portable relative manifest before upload. The independent publisher preserves
final-attempt screenshots and distinguishes case failures from infrastructure
or missing-evidence failures. The workflow now executes this collection before
starting the persistent Midscene fixture servers and stages the portable
evidence with the current attempt. Publication uses the same two Summary
sections, with separate YAML and source/browser counts. The 84 browser items
are not additional AI/YAML cases. Hosted browser and report acceptance remains
pending; model-free checks and collection alone do not prove it.

The second retained batch adds the exact four-event auto-scroll window, circular
swiper coordinate-click targeting and twelve audio contracts. It keeps the
original listener registration order, raw clicks, separate state reads, error
codes, waits and all assertion tails byte-for-byte. Audio interval observation
starts after play, as in the original callback. None of these additions is
counted as an AI migration or a hosted pass. The YAML collection remains 483.

A fully evidenced flaky pass keeps the original runner's successful exit policy
but remains visible as a Summary warning. Missing evidence or producer failures
cannot be hidden by passed assertions. A validated failure report may still be
published while its preparation check remains failed; this retains diagnostic
screenshots without turning a failed run green.

## Foldview follow-up (hosted validation pending)

Collection is now 480 YAML cases. The original x-foldview-ng/item-fixed
callback retains both 100 ms waits, scrollBy(0, 200), optional missing-host
behavior and two unchanged Linux PNG checkpoints. Differential replay executes
the original navigation, fonts and screenshot helpers. Hosted Chromium
acceptance remains pending. The input and textarea bindselection candidates
remain unported until their original case deadline can be preserved; a matching
single host innerText read alone does not establish full timeout equivalence.

## Programmatic scroll batch (hosted validation pending)

Collection is now 479 YAML cases. api-exposure-area and x-list/item-snap retain
their original programmatic scroll calls, individual waits and six unchanged
Linux PNG checkpoints. These APIs are not replaced with AI gestures. Source
replay executes the original navigation, font and screenshot helpers as well
as the test callbacks, covering missing host/shadow/content behavior. The
original WebKit exclusion for item-snap is unchanged. Hosted Chromium
acceptance remains pending; this batch does not establish Firefox or SSR parity.

## Unpublished report fallback

If Pages is not configured, the report job still shows individual case rows:
failures first and passed cases in a collapsed appendix. Screenshots are marked
`Not published`; artifact links open the run's download list, not a public HTML
report. The same manifest identity and complete-coverage checks apply to this
fallback. This improves visibility but does not count as Pages acceptance.

## Input contract follow-up (hosted validation pending)

Collection is now 477 YAML cases. The two additional source contracts preserve
the single-read autocomplete assertion and the textarea selection test's
original x-input/method fixture alias. Attachment is awaited before reading,
but a missing shadow input or incorrect attribute fails immediately rather
than polling into a pass. The selection API parameters, two 100 ms waits,
original textarea PNG and Firefox exclusion remain unchanged. Source-derived
replay covers normal, delayed, missing and duplicate targets and invalid
autocomplete states. Hosted Chromium acceptance is pending.

## Selection and public API batch (hosted validation pending)

The collection now contains 475 YAML cases. Four new original contracts cover
viewpager select-index=0, input select(), input setSelectionRange(2, 4), and
custom-truncation text mutation. Their six original Linux PNG checkpoints,
fixture aliases, separate waits and programmatic operations are preserved.
Locator attachment is awaited with the existing 30-second budget; duplicate
matches fail instead of silently choosing one. Source replay compares present,
delayed, missing and duplicate targets. No product code, fixture or PNG changes
are included. These cases are not accepted until hosted Chromium validation;
the original browser skips remain unchanged and WebKit coverage is separate.

## Single-artifact publication correction (hosted validation pending)

Run 38715707855 passed 470/470 cases (467 first attempts), but its successful
publication jobs produced an incorrect empty Summary. The pinned download action
flattens a single matching artifact even with `merge-multiple: false`; the
selector previously expected the artifact-name directory from multi-artifact
downloads. It now validates manifests and exact case coverage in either layout,
rejects ambiguous duplicate attempts, and fails publication when a successful
producer has no report. Do not treat that earlier run's green publication jobs
as evidence of working screenshot/report links. Hosted publication validation
of this correction remains pending.

## Overlay event migration (hosted validation pending)

The collection now contains 471 YAML cases. The added
`web-elements/x-overlay-ng/event-layoutchange` contract preserves the original
programmatic open, 100 ms wait, single payload read, six numeric type checks and
exact event ID assertion. Source-derived replay covers valid, missing and invalid
payloads without adding polling or stricter geometry requirements. Original
fixtures and product code are unchanged. Hosted acceptance is pending.

## List layout migration (hosted validation pending)

The preceding batch increased the collection to 470 YAML cases. Four list contracts preserve their
original programmatic mutations: recyclable-false, waterfall-size-change,
waterfall-insert and list-type-change. All nine PNG checkpoints, the first-item
CSS assertion, fixture/baseline aliases, exact insertion payload and individual
waits remain unchanged. No AI action is invented for a programmatic API test.
Source replay checks compare the original and YAML operation traces, including
missing-element behavior. Linux pixel acceptance remains pending for this batch.

Parent single-job run [38695930470](https://github.com/quanru/lynx-stack/actions/runs/38695930470)
passed 466/466 cases and published reports/Pages. It includes retries; current-run
screenshot/link acceptance is separate from the successful publication jobs.

## Single-job Web execution

CI now runs the complete YAML inventory once in one Web job, with
`maxConcurrency: 1`. Generated partitions and shard-specific report selection
are removed. Retained original Playwright suites still run exactly once;
their browser profiles, assertions and timing are unchanged. The website-safe
Pages publisher and screenshot Summary remain in place.

The preceding serial four-shard run
[38686405001](https://github.com/quanru/lynx-stack/actions/runs/38686405001)
spent 88m46s in its test jobs, including 52m30s in Midscene case execution.
Removing repeated setup suggests approximately 65–70 minutes before publication;
this is an estimate, not measured single-job performance. The new job has a
150-minute limit and a 120-minute test-process limit. Original per-step
deadlines and retries are not extended. The original 466-case single-job run
completed successfully; the four new list cases await their own hosted run.

## Source-safe reload and Markdown follow-up (hosted acceptance pending)

Full [SDK 1.15.3 run 38671616387](https://github.com/quanru/lynx-stack/actions/runs/38671616387)
at `da9e389` passes all jobs and 467/467 cases, but two cases need retries:
clicked Lynx reload passes its second attempt, Markdown events its third.
The five preceding lazy/offset fixes pass first attempt, with exactly 12 physical
taps and all 16 original CSS assertions. Live Summary loads all 467 images,
starts with successes collapsed, and a clicked screenshot opens its exact HTML
step. All 472 public image/report URLs return HTTP 200. Report publication is
verified separately from first-attempt input acceptance.

The retry evidence is not a network issue. Reload's balanced inline point
[50,240] maps to physical (20,204), below the 200px column. Its successful retry
uses (20,170), inside the intended lower control. Both original DOM buttons
share one continuous color, and clicking the upper target again could also
return pink without reloading. Retain the unchanged `basic-lynx-reload` callback
in the existing three-browser CSR original runner alongside the two repeated
blue-cell cases. This preserves distinct #target/#reload inputs, all three
100ms waits and both single-read style assertions; it also removes the visual
pilot's polling/omitted-wait divergence. No fixture change or AI replacement
claim is made. The group now contains nine original browser executions.

Markdown's first two link inputs are (40.5,10), on black `is`; the final input
(51,11.5) hits blue `link`. Balanced planning seeds refinement with an incorrect
inline point. Both Markdown actions now explicitly use deepThink, independent
refinement and caching disabled. Original event waits, independent reads and
all five exact payload comparisons remain. No extra taps or relaxed deadlines.

Collection is 466 YAML cases, not 467: one ambiguous-input pilot is removed
while its complete source contract remains in all three original browsers.
The retained originals are not extra YAML cases. Product implementation,
original tests, fixtures, PNGs and retry policy are unchanged. Complete focused
and full new-head hosted validation is still required; no local browser E2E
suite is run.

## Refined color-pair follow-up (hosted acceptance pending)

Full run [38660155180](https://github.com/quanru/lynx-stack/actions/runs/38660155180)
still finishes 464/467. Offset bindtap and reentrant lazy now pass first attempts,
but ordinary lazy, relative-path and when-needed fail all three attempts.
Independent full-frame location does run; it is not sufficient for these scenes.
For example, the real locator returns [188,31], mapping to [74,26] in the green
neighbor. Do not count the previous candidate as an accepted fix.

Immutable screenshot control
[38669272626](https://github.com/quanru/lynx-stack/actions/runs/38669272626)
compares the same two images, same response model and SDK, with no browser or
app interaction. Full-frame location hits 2/4 diagnostic target bounds; public
deepLocate refinement hits 4/4. The two horizontal baseline misses both reproduce
[75,26]; refined inputs land near [150,50]. This is bounded locator evidence,
not complete-case acceptance or a statistical reliability claim. The control
branch is separate from this PR and contains only diagnostic code and synthetic
CI screenshots; those extra files are not part of the upstream change.

Only the blue toggles in the three ordinary color-pair cases now enable
deepLocate. The existing first-pass offset and reentrant paths remain unchanged.
Ordinary lazy also restores its original 500/100/100 ms waits, font readiness
and ordered CSS sequence. No original input, assertion, fixture, PNG or retry
policy changes. The five-case source replay and official-SDK refined-coordinate
control are model-free regressions; fresh complete cases are still required.

## Independent grounding follow-up (hosted acceptance pending)

The first SDK-alignment run
[38588141912](https://github.com/quanru/lynx-stack/actions/runs/38588141912)
passes 464/467 cases. Three lazy-component cases fail after three attempts;
offset bindtap passes only its third attempt. Actual raw replies from the same
`deepseek-v4-1-flash-260910` model explain the misses: the new run emits pixel
points such as `[150,50]` under the normalized 0–1000 protocol. The SDK converts
this to `[59,43]` on the captured 393×851 screenshot, inside the green neighbor
instead of the blue target. The preceding accepted run emits normalized points
such as `[375,56]`. This establishes the failure mechanism, not a decoder bug or
an isolated causal attribution to the SDK version alone.

These four cases now use public deepThink with independent full-frame location
and caching disabled, without additional conversion prompts. Source replay
preserves every original click, selector/index, ordered CSS assertion and wait:
relative-path 500/100/100 ms, when-needed 500/300/100/100 ms, and reentrant lazy
500/300/100/100/100 ms. Standard captures retain report evidence. These waits
do not establish physical-click-relative sampling equivalence because model
planning itself adds latency. No product source, original test, fixture, PNG,
assertion deadline or retry count changes. Fresh complete-case hosted validation
and actual input/screenshot inspection are required before acceptance.

## Rome SDK alignment (pending hosted acceptance)

The integration now pins all Midscene packages to `1.15.3`, matching Rome's
`codex/pr-974-e2e-reference` branch at `d1b3183`. Run `npm run check:model`
to invoke the official `midscene-test model verify` checks for text, image
understanding and AI location. A small output filter removes credentials from
the verifier's failure diagnostics; the SDK still determines success or failure.
CI runs both the existing image-only gate and official verification before the
workspace build. Model credentials are injected only into these checks and
case execution. Non-secret model variables take precedence over same-named
repository secrets; existing repository-secret configuration remains supported.

Web agents now use the SDK's coordinate protocol without an extra conversion
prompt. Case-owned registries, serial project execution in one complete job,
exact original assertions, source waits, browser profiles and PNGs remain.
Agent teardown closes the case browser context even if report finalization fails.
The clickable screenshot Summary and website-safe shared Pages publisher remain;
Rome's single-report publisher cannot replace this repository's combined site.
The existing model-free contract checks are retained. Historical run evidence
below predates this upgrade and must not be treated as acceptance of this SDK.

## Current migration batch (2026-10-14)

### Assertion precision follow-up

The 467-case run [38553731891](https://github.com/quanru/lynx-stack/actions/runs/38553731891)
passes all shards, report assembly and Pages: 466 first-attempt passes and one
successful `basic-element-x-input-bindfocus` retry. The list-position addition
and both independently grounded invoke clicks pass on their first attempts.
The retained list API runner passes all 12 original browser executions.

The follow-up restores seven source callbacks' single `innerText()` reads,
exact waits and separate Enter/fill phases. It also gives focus and confirm
actions independent grounding without caching. The shared assertion adapter now
uses Playwright's original five-second default, with attachment and polling
sharing one budget; late matching values cannot pass. Explicit source budgets
and immediate reads remain distinct. Source-replay and fake-clock regressions
cover these semantics. Collection stays at 467; product code, original tests,
fixtures, PNGs and retry budgets are unchanged. This follow-up requires its own
hosted validation; the successful parent run does not validate it.

The next list batch brings the collection to 467 YAML cases. Its ordinary
`scrollToPosition` click uses independently located aiAct, retaining the initial
and final original PNGs and 1000ms preparation wait. Four list API contracts
run unchanged through the original Playwright runner across Chromium, Firefox
and WebKit (12 executions): visible cells, vertical/horizontal container info
and auto-scroll orientation. This retains evaluateHandle/jsonValue boundaries,
separate dimension reads, scrollBy interception and the animation-frame barrier.
Thirteen retained browser invocations have separate diagnostic directories.
No additional Midscene action node or fixture change is introduced.

The preceding 466-case run
[38491581817](https://github.com/quanru/lynx-stack/actions/runs/38491581817)
passes all shards, reports and Pages: 465 first-attempt passes and one successful
`api-invoke-success` retry. All three new image contracts pass first attempt.
The live Summary loads all 466 linked images with a default-closed passed
appendix; clicking the crossorigin preview opens its exact final recording.
All 471 unique public image/HTML URLs return HTTP 200 and the publication
archive passes CRC checks. The invoke miss is an actual edge input: (10,45)
falls on the 10px trigger's right boundary, while retry (8,44) succeeds.
Both invoke cases now use independent deepThink/deepLocate with caching disabled
and restore both original 100ms waits, retaining their exact pink-to-green CSS
checks. This correction and the list batch require current-head hosted validation.

### Image attribute batch

Three additional `x-image` contracts bring the collection to 466 YAML cases:
`crossorigin`, `referrerpolicy` and `should not have loading attribute by default`.
They preserve the source host/shadow-image selectors, font readiness and one
attribute read with exact `anonymous`, `no-referrer` and `null` comparisons.
Missing hosts, shadow roots or internal images yield `undefined` and fail;
they must not be coerced into an absent-attribute pass. Standard `javascript`
steps retain these deterministic checks without locator polling or new custom
nodes. The source cases contain no user action, so no artificial aiAct is added.
Report captures surround the check. Differential tests execute both original
callbacks and real YAML across correct, wrong, absent and missing-element states.
This adds three Chromium mappings, not Firefox/WebKit acceptance or proof of
identical wall-clock sampling. All three pass first attempt in run 38491581817.

The preceding head `177f5ee` passes 463/463 cases on first attempts in
[38425505046](https://github.com/quanru/lynx-stack/actions/runs/38425505046),
including the six retained original lazy-component executions, report assembly
and Pages. All 463 Summary images load and all 468 public URLs return HTTP 200.

### Previous textarea/scroll and original-input batch

That batch adds eight YAML cases and returns two ambiguous visual cases to
their original Playwright runner, bringing the AI collection to 463. The eight
additions are seven source mappings and one supplementary animation case. Five textarea flows and that
animation case retain 13 original PNG checkpoints, including each source-defined
pixel tolerance, and use aiAct for their seven clicks. The scrollable case
preserves all 27 exact CSS checks around one aiAct click. The list-size case
retains its public scroll API call and both immediate height reads. Source-AST
and differential tests compare complete ordered sequences, waits and values.
No new custom action node is introduced. Ordered YAML waits do not establish
click-relative timing equivalence: the `api-animate` trace at `1118e0c` samples
about 11.6 seconds after physical input, versus the original 2-second wait
followed by its screenshot matcher. AI post-input planning adds that delay.
The original animation runner is therefore retained in CSR with all three
browser profiles (three executions, six ordered PNG checkpoints), matching the
upstream workflow's enabled render matrix.
Its click, waits, font readiness, baseline images and matcher stay unchanged;
the AI case supplies additional end-state evidence only.

Three original touch, mouse and wheel contracts also run unchanged in CSR and
SSR across the original browser profiles: 18 collected executions, eight enabled
and ten original browser skips. These validate event phases and input parameters,
so they remain deterministic runner coverage, not additional AI cases. At that
checkpoint all twelve retained browser invocations have distinct output directories;
the list batch adds a thirteenth.

At the preceding `efe14ba` checkpoint, all 156 model-free checks, typechecking
and actionlint pass, as do both
nine-case original runner list checks without launching browsers locally. The
full workspace build passes all 74 tasks using the existing task-local Rust
toolchain and concurrency two. No global toolchain configuration changes.

The first hosted run at `1118e0c`,
[38349980110](https://github.com/quanru/lynx-stack/actions/runs/38349980110),
exposes an adapter validation omission: `immediate: true` is rejected for CSS
before either list-height read executes. The follow-up accepts this existing
single-read execution mode. Two new regression tests reproduce the rejection
before the fix and execute the real YAML inputs through the adapter afterward;
a wrong first value still fails without waiting, polling, trimming or coercion.
Both heights and the original 500 ms wait remain unchanged. The corrected head
`efe14ba` passes all four shards and report/Pages publication in
[run 38358042762](https://github.com/quanru/lynx-stack/actions/runs/38358042762).
That success does not establish animation timing equivalence. The follow-up
original-animation integration requires its own complete hosted acceptance.

Candidate `efd5787` in run `38368894994` passes all three original CSR animation
executions on first attempts. Its additional SSR step fails every initial PNG:
the SSR shell omits the CSR margin reset, shifting the green square by 8 px
(9472 different pixels at scale one). The upstream render matrix enables CSR
only. The follow-up aligns animation execution with that matrix; a regression
test now checks the source workflow as well as the source test. SSR pixel parity
remains pending, not skipped as an already-supported contract. No source shell,
baseline, tolerance or original assertion is changed.

Push and PR path filters now cover all web-core-e2e original tests, browser
profiles and PNG baselines, plus the shared Playwright fixtures. A regression
test guards both triggers. No product source, original test, fixture, baseline,
browser profile or retry limit changes.

The later full run at `6b58e8c` retains all three original CSR animation
executions, which pass first attempt. Its third shard exposes an existing
`basic-lazy-component-multi` grounding error: the planner describes `(150,50)`
in a 393-by-851 screenshot but normalizes using an invented 400-by-200 size.
The actual input `(147,213)` lands below the blue block; the exact pink CSS
check correctly fails. Retry input `(147,54)` hits the intended upper cell and
the full sequence passes. Both attempts' agent JSON and before/after images
are inspected. This is not a product defect or a false-positive assertion.

Candidate `a454199` independently grounds both repeated-blue-cell cases but
still fails full hosted run `38380879616`: 464/465 pass, including two retries.
The locator targets the center of the continuous blue column at y=100.5,
crossing the invisible boundary into the lower component. A successful retry
at y=99 does not establish reliable input. Exact CSS checks correctly reject
the wrong half; all 470 published image/report URLs remain accessible.

The approved follow-up retains `basic-lazy-component-multi` and
`basic-lazy-component-multi-import` unchanged in the original CSR runner across
Chromium, Firefox and WebKit: six executions, twelve source clicks and 36 CSS
checks. Original indexed inputs, 500/100/100 ms waits, SSR guard, profiles and
retry limits are preserved, with separate uploaded diagnostics. Their two AI
YAML replacements are removed, not the underlying coverage. Source-execution
and workflow-selection tests guard this boundary; fixtures and product code
are unchanged. No new selector-based Midscene node is introduced.

The same failed run exposes an inline coordinate-conversion miss on the
requestAnimationFrame text control. Its two existing aiAct prompts now use
independent deepThink/deepLocate grounding with action caching disabled. The
source's 1000/100/100 ms waits and exact loop/stop counts are preserved and
checked against the original callback and text-count helper. Matching those
waits does not prove click-relative timing equivalence. Both changes require
a new full hosted run before acceptance.

## Accepted 457-case checkpoint

Head `fb5afa6` passes **457/457 cases on first attempts** in
[run 38332893199](https://github.com/quanru/lynx-stack/actions/runs/38332893199),
including all four shards, renderer parity, report assembly and Pages. The
actual Summary contains 457 loaded, clickable previews in its default-collapsed
passed-case appendix. All 462 unique public preview/report URLs return HTTP
200, and the publication archive passes CRC verification.

The six original keyboard contracts execute in CSR and SSR across Chromium,
Firefox and WebKit: 35 of 36 pass first attempt; one WebKit CSR execution passes
after its original configured retry. Its first-attempt failure context and retry
trace remain in the diagnostic artifact. Original separated key phases,
modifier payloads and the deliberately unfocused no-op case are unchanged.

`basic-reload` adds the original click,
immediate green inline-style check, public LynxView reload call and immediate
pink check. It is distinct from the existing single-page-count reload case.
The second bindtap pilot now maps the complete `basic-bindtap` source case,
with two aiAct clicks and both original ordered, one-shot style assertions.
The first pilot remains a supplementary visual smoke test. Original 100 ms
waits remain in their original positions; no product code, fixture, API,
assertion value or retry limit changes. A source-AST differential checks the
entire ordered sequence, including API bodies and waits. Both migrations are
accepted in the 457-case checkpoint above.

## Accepted grounding checkpoint

Head `a72377a` passes **456/456 cases on first attempts** in
[38318090275](https://github.com/quanru/lynx-stack/actions/runs/38318090275),
including renderer parity, all four shards, report assembly and Pages. The
actual Summary has 456 loaded, clickable images in the default-collapsed
passed-case appendix. All 461 unique public preview/report URLs return HTTP
200; the publication archive passes CRC verification.

Each animation aiAct and the frame-data update produces exactly one physical
tap, with its actual pre-tap screenshot confirming the intended target. All
original CSS/event/data assertions pass. Public deepThink planning with
independent visual location removes the duplicate toggle and incorrect
dimension grounding observed at `2cb3274`; no selector actions, saved
coordinates, assertion changes or fixture changes are added. This successful
run is not a general zero-flake guarantee.

At `2cb3274`, the complete original mouse-drag and wheel step passes 42 cases
in 18.9 seconds, with the three original WebKit skips and no reported retries.
This is retained deterministic coverage, not an increase to the 456 AI cases.

### Previous complete checkpoint

Head `8569812` passed all 456 UI cases in
[run 38298900360](https://github.com/quanru/lynx-stack/actions/runs/38298900360),
including all four shards, report assembly and Pages. All four swiper mode
cases passed on their first attempts. Two unrelated cases needed one retry:
input bindinput initially saw a blank page, and Markdown link grounding hit
adjacent text on its first attempt. The GitHub Summary contains 456 linked
previews in the collapsed passed-case appendix; all 461 unique public image
and report URLs returned HTTP 200.

The follow-up includes both complete original mouse-drag and wheel suites in
the retained runner. Their exact trajectories, button transitions, wheel
deltas, immediate assertions and waits remain unchanged. The 12 drag-suite
declarations include the already-retained pointer-coalescing contract; the
other 11 drag flows and three wheel flows are newly included. Across the
original three browser projects this schedules 45 cases, including three
original WebKit wheel skips: 42 enabled cases, 39 newly included. These are
retained deterministic contracts, not extra AI UI cases or evidence that
`aiAct` can reproduce the input protocol. This runner expansion is accepted
in the `2cb3274` checkpoint above. The AI collection remains 456.

### Earlier checkpoint

The collection contains 456 UI cases, including 242 original pixel contracts.
At head `f1edebe`, [run 38290334711](https://github.com/quanru/lynx-stack/actions/runs/38290334711)
passed 456/456 cases, all four shards, report assembly and Pages. The two cases
that failed with endpoint RPM limits in the preceding 454/456 run both passed
on their first attempts. Four source partitions run one credentialed shard at
a time. Public SDK provider retries are capped at two, 30 seconds apart, inside
the unchanged step deadlines. Case retries, original assertions and browser
worker limits are unchanged. Unrelated consumers still need adequate provider
quota or separate endpoints.

Only `basic-element-x-swiper-mode-flat-coverflow` needed a case retry. Its
first trace contains one successful physical click: the initially red panel
changes to yellow, then the planner incorrectly fails because red is absent.
The final pixel assertion did not run on that attempt; the complete retry
passed both original PNG assertions. The follow-up clarifies that each of the
four mode actions finishes after its single click, even when that click
replaces the initial target. It retains `aiAct`, original waits and both exact
pixel assertions. All 144 local model-free checks and typechecking pass;
hosted acceptance of this prompt correction is still pending. Older batch
checkpoints below are historical.

This directory adds a visual-semantic layer to the package's existing
Playwright E2E suite. ReactLynx renders inside the open shadow root of
`<lynx-view>` and a worker. Playwright handles the exact event-result check,
while Midscene drives user interactions. The earlier 418-case checkpoint included the
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
two reportError/shared-context interaction contracts, and 84 original
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
URLs returned HTTP 200. Pushed `0fae870` passed all 190 cases in
[run 38018429636](https://github.com/quanru/lynx-stack/actions/runs/38018429636),
including reports and Pages. Downloaded raw reports show 191 attempts, with only
`basic-lazy-component-when-need-with-itself` retried once. All 190 rows have
screenshots and all 195 unique public report/image URLs return HTTP 200.
Pushed `4a94776` passed all four 264-case test shards in run 38021387390, but
report publication failed before Pages: a model-free pixel-adapter check was
started at the repository root and its cwd-relative baseline lookup was wrong.
The adapter now resolves unchanged PNGs relative to its own module. Root and
unrelated-cwd regressions pass, as does the synthetic public-matcher differential
using an unchanged adapter copy in an isolated temporary fixture tree.
Twelve further component pixel cases bring collection to 276. The full
90-check model-free suite also passes from the repository root. Hosted
publication acceptance still belongs to the earlier successful 190-case run.
Three further local translations add the two Chromium-only blur baselines and
the original cssSelector-disabled reload contract. Original and translated
reload executions pass first attempts locally, preserving both exact CSS
assertions and the 100/1000 ms waits. All 92 model-free checks pass; these three
additions await hosted execution and are not in the pushed 276-case head.
Two further local FoldView translations retain before/after PNGs around one
ordinary `aiAct` click and the exact immediate `scrollTop === 200` overflow
assertion after the original 100 ms wait. The original overflow execution passes
locally; translated AI execution and Linux PNG acceptance await CI. All 94
model-free checks pass. The dynamic text-style fixture's 10×10 transparent
button has no visible target and is not counted as an equivalent AI migration.
Two further local pixel flows retain updateGlobalProps' exact blue payload and
both ordered snapshots, and the frame's original height/weight removals plus
full-viewport style. Source callback replay checks every API mutation and wait;
all 95 model-free checks pass. Linux execution is pending. The separate animated
snapshot case remains pending a click-relative observation strategy; AI planning
latency must not silently move its sampling window.
Three further static pixels preserve textarea color, placeholder font size and
the normalized default-display PNG path. Only the exact placeholder-font-size
PNG retains the original test's explicit 0.02 mismatch ratio; every other PNG
keeps the helper's zero default. YAML cannot override that ratio. All 97
model-free checks pass; local collection is 286, with Linux execution pending.
The next local batch adds 39 original web-elements static pixel cases. Both
original packages import the same Chromium/Pixel 5 profile, so these use the
existing isolated pixel project, but with the independent elements fixture URL
and explicit `suite: web-elements` PNG namespace. There is no missing-baseline
fallback, cross-suite tolerance inheritance or source skip activation. All 100
model-free checks pass; 325 cases collect, including 131 pixel cases. These new
Linux baseline executions remain pending and are not counted as hosted accepted.
The next 54 describe-scoped web-elements static pixel contracts bring local
collection to 379 cases, including 185 pixel cases. Model-free replay executes
the unchanged original `getTitle` helper and complete callbacks, checking every
navigation, font/fixed wait and screenshot. Eight placeholder fixtures retain
their original non-placeholder PNG aliases; input/textarea `simpleTitle` paths
are also preserved. All original fixtures and Linux PNGs exist. All 102
model-free checks and typechecking pass; hosted execution of this batch is pending.
Two subsequent local viewpager cases retain the public select-index attribute
mutation and method-selectTab click with both original PNGs. Only the ordinary
click becomes one `aiAct`; source callback replay verifies all ordered actions,
mutations, waits and screenshots. Local collection is 381, with 187 pixel cases.
These two additions are not yet pushed while the 379-case CI runs.
Six further local swiper/list flows preserve all original clicks, fixed waits,
Chromium conditions, screenshot paths and identical helper defaults. Every
ordinary click becomes one aiAct, including all four sequential current-index
clicks. Original callback replay covers every ordered step and all Linux PNGs
exist. Local collection is 387, including 193 pixel cases, with 103 model-free
checks passing. These six flows also await hosted validation.
Nine more local web-elements API pixel contracts retain original source
attribute mutations, addText/setValue/sendDelEvent methods, argument order,
fixed waits and snapshots. The textarea method originals intentionally load
the shared `x-input/method` fixture; migration preserves that source contract
rather than silently substituting a different page. The callback whitelist
rejects scripted UI actions. Collection is 396, including 202 pixel cases;
105 model-free checks and typechecking pass. All 17 additions after pushed
379 await hosted execution.
Three original templated CSS-inheritance branches retain all original ordered
assertions and one Update click through aiAct. The original Chromium tests
pass locally on first attempts. Attribute absence is checked as actual null,
not merely a value other than true; missing elements fail. All CSS/attribute
polls retain the original five-second timeout. Full original callback/loop
replay and negative attribute checks pass. Collection is 399 / 108 model-free
checks; these three AI translations await hosted execution too.
The isolated `web-ssr-no-js` project adds all four expanded cases from
`ssr-no-js.spec.ts`, with JavaScript genuinely disabled and the unchanged
Chromium/Pixel 5 profile. Both originals and translations pass locally on
first attempts, without model calls. Full source declaration/loop replay and
browser-context checks preserve the absence of client-side waits/actions.
The fourth project is included in all shard partitions, manifests and report
publication identities. Collection is 403 / 109 model-free checks; 24 cases
after pushed 379 remain local pending hosted execution. Original Linux pixel
environment guards are unchanged; non-pixel SSR does not claim PNG parity.

Two component-event API cases preserve complete enable/disable and listener
reference-count sequences, immediate event-array reads and exact payloads.
Both unchanged originals and translations pass locally on first attempts using
the independent elements server. Full callback replay and negative differentials
reject premature disable, duplicate enable and extra payload fields identically.
No custom node, AI call or scripted user interaction is introduced. Collection
is 405 with 111 model-free checks; the 26 additions after 379 await hosted execution.

Run 38025912330 at `c826274` now passed all 379 cases, report generation and
Pages, with 380 attempts: only basic-lazy-component-when-need-with-itself retried
once. All 379 rows have linked screenshots; all 384 unique public image/report
URLs returned HTTP 200. This supersedes the earlier pending
statuses above, not the still-local additions after that head.

Two CSS fallback SSR branches bring local collection to 407 with 112 passing
model-free checks and typechecking. Both unchanged originals and translations
pass locally on first attempts for client and SSR (four each). Full source/helper
replay preserves the SSR URL, font readiness, original SSR 300 ms and common
100 ms waits, and five-second CSS assertion timeouts. The previous client
translation omitted its fixed wait and used the longer adapter default; these
two existing cases now retain the original timing rather than replacing it with
pre-assertion report work. afterEach captures retain failure evidence. These
two additions and timing corrections remain local while the 405-case CI runs.

Seven further web-elements swiper cases preserve public current/indicator
attribute mutations, three autoplay flows, original fixed waits, Chromium-only
guards and all PNGs. Eight indicator PNGs retain the original exact clip
`{x:50,y:170,width:100,height:30}`, bound to those source baselines rather than
accepting arbitrary YAML crop overrides. A real synthetic browser differential
confirms both the unchanged public matcher and adapter accept outside-clip
changes and reject inside-clip changes, with unchanged baseline bytes. Synthetic
files live only in an owned temporary tree. Collection is 414, including 209
pixel cases, with 114 model-free checks and typechecking passing; new Linux
baseline/autoplay acceptance remains pending. No AI latency extends sampling.

Do not run the original pixel suite on macOS: its matcher writes missing Darwin
snapshots even without an update flag. A diagnostic run demonstrated that
behavior; both generated Darwin images were moved out of the repository and
are not acceptance evidence. Original Linux PNGs remain unchanged. On macOS,
use source-contract checks and the isolated temporary synthetic backend check.
The animation translations retain original event-sequence match counts and CSS
checks, with ordinary clicks through `aiAct`. No local model credentials are
configured; local checks do not make AI calls.

## Why this is a separate directory

The external-bundle case and its unchanged original Chromium test both passed
locally on the first attempt. `web.expect` with `matchingText`/`count` uses the
same public `page.getByText` locator and checks the complete count, without
selecting the first match or requiring visibility. Duplicate matches fail the
original count-one contract. All 102 model-free checks and typechecking pass.
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
are unchanged. Its 84 cases retain original font readiness, waits and snapshot paths.
Three weighted-layout cases also retain both ordered, immediate width reads;
the extra-font case retains the exact font-load arguments and readiness wait.
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
not execution or acceptance of the 84 Linux repository baselines; those
require hosted CI. Other browsers and SSR pixel variants remain pending.

Four earlier layout dimension migrations are corrected in `layout-bounds.yaml`:
the original `boundingBox()` assertions read once immediately after navigation
and font readiness, rather than waiting for an AI readiness check or polling
into a pass. Their originals and corrected YAML pass locally on first attempts.
A wrong-first/correct-later mock reproduces the old false pass and new rejection.
Screenshots run in `afterEach`, after the observation, including on failure.
A deliberate 361-versus-360 browser failure rejects all three attempts and
still produces a linked final-attempt screenshot in the local Summary replay.
This correction changes no case count and awaits hosted validation.
Both vendored renderers now accept a first, successful afterEach capture only
when it directly follows the final failed case step. Earlier screenshots retain
priority; intervening actions or older attempts cannot supply the preview.
The screenshot still links to the failed assertion. Real failed-report replay
and synthetic cross-attempt/continuation guards cover this evidence boundary.
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

The four independent projects run cases serially, with separate browser contexts, pages,
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
# Run this block in Bash. Keep credentials in this process environment only.
set +x
read -r -p "Model base URL: " MIDSCENE_MODEL_BASE_URL
read -r -p "Model name: " MIDSCENE_MODEL_NAME
read -r -p "Model family: " MIDSCENE_MODEL_FAMILY
read -r -s -p "Model API key (hidden): " MIDSCENE_MODEL_API_KEY
printf '\n'
export MIDSCENE_MODEL_BASE_URL MIDSCENE_MODEL_NAME MIDSCENE_MODEL_FAMILY MIDSCENE_MODEL_API_KEY
npm test -- --project web-shell
npm test -- --project web-elements

# Run the complete original YAML collection, as CI does.
npm test
```

Never write API keys to `.env` files, shell startup files, command arguments or
logs. A credential manager may instead inject the key directly into the process
environment. Keep shell tracing disabled; when finished, run
`unset MIDSCENE_MODEL_API_KEY` and close the credential-bearing shell.

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

One Web job runs all four projects serially against the original YAML files.
It installs and builds once, with a 120-minute test-process limit inside a
150-minute job limit, leaving time for setup and failure artifacts. Original
per-step deadlines, case retries and retained Playwright contracts are unchanged.
Report artifacts retain their commit SHA, attempt and producer outcome.
Publication selects the latest available attempt no newer than the current run,
checks successful reports against the complete unique source case inventory,
and never upgrades a failed producer to success from an earlier artifact.
Missing reports remain failures. The SDK still assembles the HTML report;
passed cases remain in the collapsed appendix with linked screenshots.

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
