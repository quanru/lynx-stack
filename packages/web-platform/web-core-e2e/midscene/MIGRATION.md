# Full E2E migration scope

## Stable visible action follow-up (hosted validation pending)

The YAML collection increases from 484 to 487 with
web-elements/x-audio-tt/method-mute,
web-elements/x-audio-tt/method-set-volume and
basic-element-list-remove-action. Only the original visible clicks become
aiAct. All waits and assertions remain, including muted truthiness rather than
a stronger boolean assertion, strict volume=0.5, and separate list count and
ordered ID reads at all three phases. Open shadow traversal follows the pinned
Playwright simple CSS query engine and does not ignore extra matching elements.

Model-free callback replay and fixture visibility checks do not establish
hosted AI success or cross-browser equivalence. WebKit's original set-volume
skip and the list's SSR skip remain. Audio stop was deliberately not included:
its play-to-stop timing equivalence is unresolved. Original source, fixtures and
pixel baselines are unchanged; retained original-runner counts are unchanged.

## Existing original runner evidence ledger

These thirteen preexisting Playwright steps collect 380 browser/render items
from 120 unique source declarations. Counts were verified with original
Playwright collection and source browser/SSR guards, not browser execution.
CSR/SSR declarations are deduplicated in the 120 total; the SVG loop expands one
declaration into four titles. Thus per-step declaration counts cannot be summed
as a repository-wide unique-source count.

| Existing step         | Source declarations | Expanded titles | Collected items | Statically eligible | Unified evidence                  |
| --------------------- | ------------------: | --------------: | --------------: | ------------------: | --------------------------------- |
| Worker/runtime API    |                  35 |              35 |             105 |                  73 | Pending                           |
| Keyboard CSR          |                   6 |               6 |              18 |                  18 | Wired; hosted validation pending  |
| Keyboard SSR          |                   6 |               6 |              18 |                  18 | Wired; hosted validation pending  |
| Pointer CSR           |                   3 |               3 |               9 |                   4 | Pending                           |
| Pointer SSR           |                   3 |               3 |               9 |                   4 | Pending                           |
| Animation CSR         |                   1 |               1 |               3 |                   3 | Wired; hosted validation pending  |
| Lazy/reload CSR       |                   3 |               3 |               9 |                   9 | Wired; hosted validation pending  |
| Performance           |                   7 |               7 |               7 |                   7 | Pending                           |
| SVG/selection/webview |                  12 |              15 |              45 |                  45 | Pending                           |
| Markdown              |                  33 |              33 |              99 |                  90 | Pending                           |
| Drag/wheel            |                  15 |              15 |              45 |                  42 | Pending                           |
| List API              |                   4 |               4 |              12 |                  12 | Wired; hosted validation pending  |
| Template consistency  |                   1 |               1 |               1 |          1 (non-UI) | Pending; no screenshot applicable |

The first evidence follow-up wires 14 unique declarations / 60 existing
executions without adding or duplicating test invocations. The remaining gap is
320 collected items: 265 eligible UI executions, 54 source-declared skips and one
non-UI contract. Source skips must remain explicit, not counted as passed or
silently enabled. Future integration must model skipped/non-UI evidence policies;
the current five-runner batch contains neither exception.

Runner identity includes its package, source file, source key, browser and render
mode. Separate CSR/SSR rows share a source declaration but not an execution ID.
Each runner owns HTML/JSON and final-attempt screenshot paths; producer outcomes
are preserved independently and no previous-attempt evidence is borrowed.
The original 28-source/84-item retained collection remains disjoint, giving
42 original sources / 144 evidence-enabled execution items in total, alongside
484 YAML cases. These are wiring/collection counts, not hosted acceptance.

## Scrollend payload follow-up

The YAML collection increases from 483 to 484 with
basic-element-scroll-view-event-scrollend. Preserve both original waits,
scrollTop=200, one JSON payload read, exact event type and four non-undefined
geometry assertions. No numeric constraints, retries or extra polling were
introduced. Differential replay covers original success and failure semantics;
hosted Chromium acceptance remains pending. Product sources, fixtures and
original callbacks are unchanged.

## Retained timing and audio follow-up

The retained original runner now selects 28 source declarations across three
unchanged browser profiles (84 execution items), separately from 483 YAML cases.
The fourteen additions are list auto-scroll, circular swiper coordinate clicks,
and twelve audio callbacks covering source changes, loop close, pause-on-hide,
interval timing, loading/playback/finished/seek/error events and method-play.
These callbacks remain byte-for-byte unchanged; none has a browser guard or
skip. Actual browser-free Playwright collection verifies the full matrix.
Hosted browser acceptance is pending, especially media timing and codec behavior.
This is original-contract integration, not conversion to AI-generated inputs.

## Current exposure viewport batch

Collection increases from 480 to 483 with api-exposure-basic,
api-exposure-dynamic-screen-margin and api-exposure-dynamic-ui-margin.
All thirteen PNG checkpoints, twenty-three 100 ms waits and original programmatic
scroll operations are unchanged. A suite-scoped exact whitelist permits
fullPage=false only for the ten original viewport checkpoints, with no public
YAML option or global relaxation. The original Firefox exclusion applies only
to basic. Source replay and backend spies pass; hosted Chromium validation is
pending, and no fixture, source callback or baseline was changed.

## Preceding foldview follow-up

Collection increases from 479 to 480 with x-foldview-ng/item-fixed. Preserve
the original programmatic scrollBy(0, 200), two 100 ms waits, optional chaining
and both PNGs. Source replay covers present and missing hosts through the
original helpers. Hosted Chromium acceptance is pending. The two bindselection
candidates remain pending original case-deadline equivalence; neither is
counted as migrated.

## Preceding programmatic scroll batch

Collection increases from 477 to 479 with api-exposure-area and x-list/item-snap.
Exposure retains offsets 200 and 400, its two 200 ms waits and all three original
checkpoint names, including scroll-200-green after offset 400. Item-snap retains
scrollBy(0, 10), scrollBy(0, 250), both 100 ms waits and three PNGs. Source replay
checks exact helper behavior and missing DOM layers without changing the
original optional chaining or WebKit skip. Hosted Chromium acceptance is pending.

## Preceding input contract follow-up

Collection increases from 475 to 477 with x-input/attribute-autocomplete and
x-textarea/method-setSelectionRange. The former preserves one attribute read
after target attachment and rejects null or incorrect values without retry.
The latter intentionally retains the original x-input/method fixture alias,
selectionStart=2, selectionEnd=4, both 100 ms waits and the textarea PNG.
Firefox remains excluded by the original callback. Source replay checks
successful and invalid states; hosted Chromium acceptance remains pending.

## Preceding selection and public API batch

Four additional source callbacks increase collection from 471 to 475:
viewpager select-index-0, input method-select, input method-setSelectionRange,
and text-maxline-with-custom-truncation-innertext-change. Preserve six PNG
checkpoints, exact API parameters, fixture aliases and every wait. Model-free
source replay checks normal, delayed, absent and duplicate locator matches.
The original input selection browser guards are tested and unchanged. Hosted
Chromium PNG acceptance is pending; this is not evidence for WebKit variants.

## Preceding overlay event batch

The `x-overlay-ng/event-layoutchange` source declaration now has a deterministic
YAML mapping, increasing collection from 470 to 471. The original open mutation,
100 ms wait and all eight payload assertions remain unchanged. A source-derived
replay compares operation traces and outcomes for 30 payload variants with and
without the target element. This does not establish hosted browser acceptance;
the original test and fixture remain intact.

## Preceding list layout batch

Four previously unimplemented list declarations now have Chromium pixel-profile
YAML mappings: recyclable-false, waterfall-size-change, waterfall-insert and
list-type-change. Collection increases from 466 to 470. The source-derived
regressions compare each full operation trace, including original waits, nine
PNG checkpoints, the exact CSS assertion and insertion bytes. Original source,
fixtures, baselines and product code are unchanged. Hosted Linux pixel execution
and browser expansion are not inferred from these model-free checks.

The scope includes web-core-e2e and web-elements, not only ReactLynx examples.
Original tests, fixtures, snapshots, browser variants, and SSR variants remain
unchanged until equivalent verification has run successfully, except for the
documented fixture-initialization defect in `installLynxViewStyle`: observing
Document instead of a not-yet-created documentElement makes its existing offset
and transform cases actually exercise their intended placement. Unit tests and
benchmarks are not UI migration candidates. Server-rendering integration tests
remain in scope as deterministic contracts, not visual AI tests.

## Inventory

The status notes in this original inventory describe earlier batches; they are
not current-head acceptance. See the current CI checkpoint in README.md and
the execution evidence below.

Run `node scripts/inventory-upstream.mjs` to refresh this source inventory.
These are source declarations, including named skipped tests, not runtime case
counts. Loops, browser projects, SSR variants, and conditional skips change the
runtime denominator. Do not subtract YAML case totals from these declarations:
the pilot cases are not one-to-one replacements, and upstream names can repeat.

| Suite/file                                      | Source declarations | Migration status                                                                                                                                                              |
| ----------------------------------------------- | ------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| web-core-e2e/reactlynx.spec.ts                  |                 342 | ReactLynx migrations included in successful 173-case run 37954151485; three further reload cases pass locally; pilot overlap and pixel contracts remain separate              |
| web-core-e2e/web-core.test.ts                   |                  35 | Original Chromium runner passed in run 38034593377 (34 enabled, one original skip); Firefox/WebKit next batch remains local                                                   |
| web-core-e2e/reactlynx-css-var-fallback.spec.ts |                   2 | Both Chromium client cases passed locally and in hosted run 37940214877; SSR and other browsers pending                                                                       |
| web-core-e2e/ssr-no-js.spec.ts                  |                   2 | Four expanded original Chromium cases and translations pass locally, first attempts; isolated JavaScript-disabled project, hosted execution pending                           |
| web-core-e2e/middleware.spec.ts                 |                   1 | Original Chromium client case passed locally; translation passed in hosted run 37948938294; SSR/other browsers separate                                                       |
| web-core-e2e/server-tests/server-e2e.test.ts    |                  17 | Original 17 server HTML snapshots passed in runs 38031009467 and 38034593377; no snapshot updates                                                                             |
| web-elements/web-elements.spec.ts               |                 296 | 25 exact CSS/attribute cases passed locally on the first attempt and in hosted run 37928102242; other cases pending                                                           |
| web-elements/x-markdown.spec.ts                 |                  34 | Two aiAct clicks and five exact payload checks passed first attempt in run 38034593377; remaining 33 original Chromium API cases passed separately; browser expansion pending |
| web-elements/scroll-view-mouse-drag.spec.ts     |                  12 | Original synthetic pointer-coalescing contract retained in local next batch; 11 actual mouse-drag flows still pending                                                         |
| web-elements/performance.test.ts                |                   7 | All seven original Chromium CDP metric contracts passed in run 38034593377 with original budgets and serial execution                                                         |
| web-elements/x-webview.spec.ts                  |                   7 | All seven original Chromium iframe API contracts passed in run 38034593377; Firefox/WebKit batch remains local                                                                |
| web-elements/x-svg-inline.spec.ts               |                   3 | All six expanded original Chromium geometry cases passed in run 38034593377; Firefox/WebKit batch remains local                                                               |
| web-elements/x-foldview-ng-wheel.spec.ts        |                   3 | Pending                                                                                                                                                                       |
| web-elements/component-event.spec.ts            |                   2 | Both original and translated Chromium API cases pass locally on first attempts; complete reference counts and immediate exact payloads preserved; hosted execution pending    |
| web-elements/x-text-selection.spec.ts           |                   2 | Both original Chromium offset/direction/listener contracts passed in run 38034593377; original browser skips retained in local expansion                                      |
| web-elements/template.spec.ts                   |                   1 | Non-UI Rust/TypeScript consistency test retained once in local next batch; not an AI UI migration; hosted execution pending                                                   |

The ReactLynx count includes one named `test.skip` declaration; the previously
reported 341 counted ordinary `test()` calls only. Neither count is an executed
case total.

## Execution and acceptance

Parent head `40aed92` passes all 467 cases in run 38553731891, with 466
first-attempt passes and one focus retry; reports and Pages publish successfully.
The next precision correction changes no case count. Seven source callbacks
(`basic-lazy-component-fail`, input focus/confirm, ng-bindinput, input and textarea
filters, and input bindinput) retain single raw text reads, exact waits and
separate Enter/fill phases. The adapter restores the five-second Playwright
default and shares it across attachment and polling, rejecting late replies.
Independent focus grounding addresses the observed initial click below the
password input. Original source tests, fixtures and retry budgets remain intact.
Ordered phases do not prove identical wall-clock sampling after physical input:
aiAct planning remains additional latency. Hosted acceptance of this follow-up
must be recorded separately from its successful parent.

The current local collection contains 467 YAML cases. One list scroll-to-position
case retains both original PNG checkpoints and its 1000ms preparation wait around
one independently located aiAct click. Four list API cases remain in the original
three-browser runner (12 executions), preserving handle serialization, distinct
geometry reads, autoScroll/scrollBy interception and the animation-frame barrier.
These are additional original-runner contracts, not extra AI case counts.
Thirteen retained browser invocations have separate uploaded diagnostics.

Head `8a466c8` passes 466/466 in run 38491581817: 465 first-attempt passes,
one `api-invoke-success` retry, and all three image-attribute additions passing
first attempt. Reports/Pages publish, all 466 Summary images load, the passed
appendix is initially closed, the crossorigin preview opens its exact report
step, and all 471 public image/HTML URLs return HTTP 200. The archive passes CRC.
Actual input (10,45) is on the tiny blue trigger's right edge; retry (8,44)
succeeds. Both invoke cases now use independent location and retain the source's
two 100ms waits and exact CSS sequence. Hosted validation for the list batch
and this grounding correction is pending.

The preceding local collection contains 466 YAML cases. Three new `x-image`
attribute contracts preserve the original single-read shadow-tree selectors and
exact values, including `undefined` versus `null`. They use standard JavaScript
assertions, not AI judgment, polling or new custom action nodes. Differential
tests execute original callbacks and YAML against correct, wrong, absent and
missing host/shadow/image states. These are Chromium mappings; Firefox/WebKit
acceptance is not implied. All three additions pass first attempt in run 38491581817.

The preceding head `177f5ee` passes 463/463 on first attempts in run
38425505046, including six original lazy-component executions without retries,
reports and Pages. Its 463 linked Summary screenshots and 468 public URLs are
verified. This is the accepted baseline, not acceptance of the new additions.

That preceding collection contains 463 YAML cases after two indistinguishable
lazy-component inputs return to their original runner. Eight additions comprise
seven source mappings and one supplementary animation case: five textarea flows
plus animation (13 original PNG checkpoints and seven aiAct clicks), the
scrollable toggle (27 original CSS assertions and one aiAct click), and the
estimated list size (one public scroll API call and two immediate height reads).
Original font readiness, waits, assertion values and per-PNG tolerances remain
unchanged. Source-AST/differential tests verify ordered statements, not elapsed
time from physical input. `api-animate` remains in the original runner in CSR
with all three browser profiles (three executions and six ordered PNG
checkpoints), following the enabled upstream render matrix. Its AI trace at `1118e0c` reaches the final screenshot about
11.6 seconds after input, not after just the original 2-second wait: aiAct has
post-input planning. The AI case is supplementary end-state coverage, not a
timing-equivalent replacement. Original inputs, waits and matcher are unmodified.
No selector-driven action node, fixture change or baseline update is added.

The three original pointer declarations `basic-mts-bindtouchstart`,
`basic-bindmouse` and `basic-bindwheel-view` run unchanged in CSR and SSR with
all three original browser profiles. Their CDP touch trajectory, mouse phases,
wheel delta and browser guards remain intact. Each mode lists nine executions;
across both modes eight are enabled and ten retain original browser skips.
These are retained protocol contracts, not extra AI cases. At that checkpoint
all twelve retained browser invocations own distinct output directories; the
list batch adds a thirteenth. At the preceding
`efe14ba` checkpoint local checks pass: 156 model-free tests, typechecking, actionlint and both browser-free
nine-case list checks. The full workspace build passes all 74 tasks using the
existing task-local Rust toolchain with concurrency two, without global setup
changes or local browser/device execution.

The first candidate `1118e0c` in run `38349980110` fails its estimated-list
case because the adapter rejects immediate CSS parameters before reading the
page. The follow-up corrects that validation boundary, not the original
100/200 px values, single-read behavior or 500 ms wait. Two regression tests
reproduce the pre-fix failure, then execute the actual YAML assertion inputs
through the fixed adapter and reject a wrong first value without polling into
a pass. The corrected `efe14ba` head passes all four shards, report assembly
and Pages in run `38358042762`; that run does not establish animation timing
equivalence. The original-animation integration requires a new complete hosted
run. Candidate `efd5787` passes all three original CSR animation executions in
`38368894994`. Its extra SSR step fails before input because that shell omits
the CSR margin reset: the original square shifts by 8 px, accounting for 9472
different scale-one pixels. Upstream enables CSR only. The follow-up preserves
that matrix and guards it with a regression test; SSR pixel support remains
pending without changing source, baselines or tolerance. Both CI
triggers now cover all web-core-e2e tests/configuration/baselines and shared
Playwright fixtures, with a trigger-coverage regression test.

The full `6b58e8c` run also exposes an older lazy-multi grounding failure. The
planner substitutes a 200 px colored-block height for the actual 851 px image
height, sending its first physical click below the blue block. The original
pink CSS assertion rejects that attempt; a correctly located retry passes.
Actual before/after images and input coordinates establish this cause. Both
multi and multi-import then use independent deepThink/deepLocate at `a454199`,
but hosted run `38380879616` still fails (464/465 pass). Independent location
lands on the invisible boundary between contiguous blue cells at y=100.5;
the successful multi retry at y=99 is not proof of reliable source input.
All 470 published preview/report URLs return HTTP 200 despite that test failure.

The approved follow-up removes only these two AI replacements and retains
both original tests in CSR on Chromium, Firefox and WebKit. Six executions
preserve twelve indexed clicks, 36 ordered CSS checks, the source's
500/100/100 ms waits, original SSR exclusion, browser profiles and retry limits.
Fixture and product files are unchanged. The selected original runner has its
own uploaded output directory. Source-execution and workflow-selection tests
guard both retention and absence from AI totals.

The same run's requestAnimationFrame miss uses inline planner coordinates
without an independent Locate call. Its two existing aiAct prompts now use
deepThink/deepLocate and disable action caching. Source-derived validation
preserves the 1000/100/100 ms waits and exact loop/stop counts. These waits alone
do not establish click-relative timing equivalence. The combined correction
requires a new full hosted run; local checks are not hosted acceptance.

The accepted runner expansion includes six original keyboard declarations:
`basic-global-bindkeydown`, `basic-global-bindkeyup`, the key/code/shift
variants, and `basic-bindkeydown-out-of-view-noop`. The original test file
executes unchanged in CSR and SSR across all three browser projects (36
collected executions). A source-AST selection check rejects missing or extra
cases; the original separated key phases and intentionally unfocused no-op
remain intact. Each of the eight browser invocations at this checkpoint owns a distinct
uploaded output directory, preventing Playwright's startup cleanup from
discarding an earlier invocation's failure artifacts. The 457-case AI collection
is unchanged. Head `fb5afa6` passes all 457 YAML cases on first attempts in
run `38332893199`, including all four shards, renderer parity, report assembly
and Pages. The 36 original keyboard executions pass: 35 first attempt, one
WebKit CSR retry, with first-failure context and retry trace preserved. The
actual Summary contains 457 loaded linked images in its default-collapsed
passed-case appendix; all 462 unique preview/report URLs return HTTP 200.
The publication and original diagnostic archives pass CRC verification.

That accepted batch contains 457 YAML cases: one new `basic-reload` mapping and
the complete original `basic-bindtap` contract in place of the second visual
pilot. Reload retains click → immediate green style → public reload API →
immediate pink style. Bindtap retains both ordered clicks and immediate style
reads. Original 100 ms waits, targets and values are extracted from the source
AST and compared with the translated sequence. Ordinary input uses aiAct;
the public reload API remains an API call, not a browser refresh. No product
code, fixture, retry limit or original test changes. Both are accepted at
the `fb5afa6` checkpoint above.

Head `a72377a` passes 456/456 cases on first attempts in run `38318090275`,
with renderer parity, report assembly and Pages successful. The actual
Summary contains 456 loaded linked previews in a default-collapsed appendix;
all 461 unique public preview/report URLs return HTTP 200, and the publication
archive passes CRC verification. Each of the four animation actions and the
frame-data action contains one physical tap on its intended visible target.
All original CSS/event/data assertions remain unchanged and pass.

Head `2cb3274` run 38310091079 passes all four shards, report assembly and
Pages: 456/456 cases, 454 on their first attempt and two after a complete
retry. The actual GitHub Summary has 456 loaded, clickable screenshots in its
closed passed-case appendix. All 461 unique public image/report URLs return
HTTP 200, and the downloaded publication archive passes its CRC check.
The complete original
gesture step passes 42 enabled cases in 18.9 seconds, with exactly three
original WebKit skips and no reported retries. The newly retained 14 source
declarations are deterministic contracts, not extra AI cases.

One animation-event attempt retries after an actual duplicate physical click:
report agent `c1aeacdf-0da9-4e66-bafe-810418f2cdf4` in artifact `11775674054`
records taps at [67, 291] and [100, 290] on the same lower transition control.
The screenshots show transparent to blue to transparent. The planner's
second action explicitly attempts to correct the first click's centering.
The original CSS assertion correctly fails, and the full second attempt passes.
The follow-up removes the centering requirement, uses public deepThink
planning and independent visual location, and stops after one successful
input. Its four aiAct nodes and all eight ordered source assertions remain;
no coordinates are used as action inputs. Model-free checks are 144/144;
model-backed acceptance is recorded at `a72377a` above.

The other retry is api-frame-data-update, report agent
`502caaa2-23f9-4503-b31d-101077a1b3e9`, artifact `11777910578`.
The planner incorrectly treats a 393 × 851 image as 400 × 371 and repeats
four taps at [29, 305] below the visible update text. Its one aiAct now uses
deepThink with independent visual refinement, while preserving both exact
original before/after assertions. The fixture and all coordinates remain
unmodified; the recorded point is failure evidence only.

Head `8569812` passes 456/456 UI cases in run 38298900360, including report
assembly and Pages. All four swiper mode cases pass their first attempts;
input bindinput and Markdown link events each retry once. The actual Summary
has 456 linked previews and all 461 public report/image URLs return HTTP 200.

The next runner expansion retains both complete mouse-drag and wheel source
suites. It adds the remaining 11 drag and three wheel declarations to CI
without replacing their precise input protocol with visual approximation.
The already-retained pointer-coalescing test stays included. Original
Chromium, Firefox and WebKit profiles schedule 45 cases, of which the three
WebKit wheel cases retain their source skips. Thus 42 enabled cases are
scheduled, 39 newly included; hosted acceptance is recorded at `2cb3274`
above. This is
deterministic coverage, not 14 new AI migrations. The 456-case AI denominator
does not change. No source test, fixture, assertion, wait or browser profile
is modified.

### Earlier checkpoints

The current collection reaches 456 cases, including 242 pixel cases. Head
`f1edebe` passes 456/456 in run 38290334711, including all four shards, report
assembly and Pages. Both previous endpoint-RPM failures pass on their first
attempts. One active model-backed shard and two public SDK provider retries,
30 seconds apart, stay bounded by the original step deadline. No test or
assertion retries are expanded.

Only the flat-coverflow mode case retries once. The failed attempt's visual
trace proves that its one click changes the red panel to yellow, but the
planner still searches for the disappeared red panel. That attempt never
reaches its final PNG assertion; the complete retry passes. The follow-up
defines completion after the single click in all four mode prompts, without
changing `aiAct`, original waits, before/after PNGs, tolerances or fixtures.
All 144 local model-free checks and typechecking pass. This prompt correction
requires its own hosted acceptance; the accepted f1edebe result is not proof
of the follow-up head.

Four further complete layout callbacks preserve one-read overflow, inline
toolbar style polling with its original default budget, and both layoutchange
payloads. Only the two visible rectangle clicks use aiAct; all six numeric
field checks and the exact target ID run against each original single payload.
Screenshots are recorded after each case, including assertion failures.

The complete original `autoScroll` callback retains all four ordered API calls,
both 500ms waits, three unchanged Linux PNG checkpoints, and the Chromium-only
guard. It tests programmatic scrolling rather than user gestures; the retained
Firefox/WebKit skip is not reported as a pass.
Four guarded static callbacks retain their complete source, unchanged Linux
PNGs and original browser skip matrix. The two unconditional percentage-cyclic
skips remain excluded on every browser. These four translations cover only
enabled Chromium variants; other browser variants are not claimed accepted.
Run 38037300565's first shard was blocked before UI cases: Firefox refused
root execution because /github/home belonged to pwuser. The next workflow
changes only that mounted directory's owner to the actual container UID,
with explicit root/directory/non-symlink checks. It does not override HOME,
disable browser sandbox checks, remove browser variants or relax source tests.
Other shards remain useful and must finish before this correction is pushed.
One additional complete scrollend callback retains the programmatic 200-pixel
offset, 300 ms wait, one event read, exact event count and all five payload
field checks. Missing fields or extra events fail without later polling.
Six complete scroll-method callbacks preserve scrollTo index/offset arguments,
block/inline alignment, nested scroll isolation and eleven unchanged PNGs.
These are original programmatic API tests, not selector-driven substitutes
for user gestures. Their new Linux hosted execution remains pending.
Seventeen more static web-elements callbacks replay the complete original
source, including font readiness and fixed waits. Their snapshot directory and
subcase both use the full test title; nested PNG paths are retained exactly,
without basename normalization. Every fixture and original Linux PNG exists;
zero pixel tolerance and the original full-page/animation settings remain.
Callbacks with extra guards, user actions, assertions or screenshot overrides
are excluded. These additions introduce no new node or AI assertion and await
hosted Linux execution; no original pixel suite runs locally on macOS.

Three additional text callbacks preserve source-defined 100-by-100 or
300-by-100 crops at (0,0). Complete callback replay records the actual source
options and verifies they match the backend's exact PNG-bound rectangles.
YAML cannot set a crop; other baselines and suites cannot inherit it. Returned
options cannot mutate future comparisons. Original nested PNG paths, zero
tolerance, font readiness and 100 ms waits remain unchanged. Hosted acceptance
is still pending for all 20 additions after the pushed 418-case head.

Two original programmatic scroll-offset API cases retain their full callbacks
and five Linux PNGs, including exact 300/99/101 offsets and ordered event/pixel
observations. These source API assignments are not replaced by AI gestures;
there is no original user gesture in either callback. Locator evaluation keeps
single-target strictness and the original 30-second attachment window. Missing
or duplicate targets cannot pass. No new custom node or tolerance is added.
All 22 additions after the pushed 418-case head require hosted Linux acceptance.

The next local batch expands retained worker/runtime, SVG/selection/iframe and
Markdown API runners to the original Chromium, Firefox and WebKit projects.
Performance remains Chromium-only because its source uses CDP metrics.
The batch also retains the original synthetic pointer-coalescing callback in
all three browser projects and the Rust/TypeScript template consistency test
once. Pointer delivery, before/after-pointerup call counts, microtask behavior
and exact 60-pixel offset remain unchanged. This synthetic protocol check is
not replaced by an AI drag. The other 11 actual mouse-drag cases and three wheel
cases remain pending migration; they are not claimed covered by this filter.
These two retained contracts add no AI UI cases and await hosted acceptance.

Every retained browser command explicitly uses two workers; run local browser suites
one at a time. Original profiles, retries, timeouts, skips, fixture ownership
and assertions remain unchanged. Browser variants are retained deterministic
coverage, not additional YAML or screenshot-backed AI cases. Local Firefox
diagnostics failed during sandbox/renderer process startup; they do not prove
an application regression or cross-browser acceptance. Linux hosted validation
of this batch is pending, and the batch remains unpushed while run 38034593377
validates the prior 418-case head.

Current pushed head `1bf94d4` has 418 UI cases and 125 passing model-free
checks. Run 38034593377 is in progress. Previous run 38031009467 passed shards
2/3/4 and published reports, but shard 1 blocked on port ownership before its
UI cases. List-scroll passed first attempt; Swiper-current was not executed.
Older local/pending descriptions below are historical checkpoints.

The newest local UI collection is 418 with 125 model-free checks. The original
Markdown link/image event case now uses two ordinary visual `aiAct` clicks,
retaining both original event waits, two single-read serialized payloads and
all five exact/substring field checks. Complete callback replay generates the
workflow; malformed URL, content and content ID samples are rejected without
trimming or broader matching. The unchanged original case passes locally.
The new AI translation remains unexecuted pending the next hosted batch.

The remaining 33 original Markdown rendering/API cases pass locally on their
first attempts and are retained in shard 1. This includes original sanitization,
style, selection, inline-view and typewriter assertions with unchanged timing
and recovery helpers. The translated click flow is explicitly excluded from
that retained runner; no scripted click is substituted for its `aiAct` steps.
The next batch adds 55 retained deterministic cases (7 performance, 15
SVG/selection/iframe, 33 Markdown), separate from the YAML denominator.

Run 38031009467 shard 1 fails before API execution because the persistent
Midscene server already occupies port 3080; original Playwright CI config
intentionally forbids reuse. All original Playwright runners now execute before
the persistent fixture servers start. No original configuration or reuse guard
is relaxed. Replaying the new order locally with `CI=1` passes 34 API tests
(one original skip) and all 55 elements tests; hosted lifecycle recovery remains
pending. Original 17 server HTML snapshots already pass in that hosted run.
Original Playwright failure outputs are uploaded as a separate diagnostic
artifact, even if a retained runner fails before AI execution. They are not
merged into AI case counts or presented as AI screenshots.

The next local batch additionally retains all seven original Chromium CDP
performance contracts in shard 1. All seven pass locally with the original
serial execution, retries and layout/style limits (3, 4 and 100). No AI action
latency, screenshot comparison or larger threshold replaces those metrics.
This integration remains local while run 38031009467 executes; it is separate
from the 417 UI cases. The local model-free check count is now 120.

The same local batch retains the original SVG inline geometry (six expanded
cases), selectionchange offset/direction/listener contracts (two), and iframe
source/load/message contracts (seven). All 15 pass locally on first attempts.
No visible user gestures exist in these source flows: original DOM/API setup,
route mocks, polling versus immediate checks, and exact object/geometry
assertions remain in their existing runner. Hosted integration remains pending
and these tests are not counted as YAML or screenshot-backed AI coverage.

Current local collection is 417 with 118 model-free checks. Three hydrated SSR
CSS inheritance cases replay the complete original callbacks, waits, attributes
and CSS assertions, with one visual Update action each. Their original SSR
interaction failed before the fixture repair: the client script was not loaded
as a module, and its hydration URL pointed to a missing output directory. The
fixture now loads the existing client module and maps the unchanged public
`/dist/ssr/` URL to the actual client bundle. All three unchanged original SSR
callbacks pass locally after the repair; four CSS fallback translations and four
JavaScript-disabled translations retain their original acceptance. Hosted AI
acceptance of the new SSR interactions remains pending.

The original 17 server-rendering HTML snapshots now execute once in shard 1
using the unchanged Rstest runner/configuration and existing snapshots. All 17
pass locally with zero added/updated snapshots. CI mode prohibits missing
snapshot creation; no update flag is passed. These non-UI checks are separate
from the 417 YAML cases and are not reported as screenshot-backed AI cases.
Hosted execution of the new integration is pending.

The original Chromium worker/runtime API suite also executes once in shard 1.
Local execution passes 34 tests and preserves the one globally disabled test.
Original worker discovery, runtime setup, callback data, assertions and browser
skips remain unchanged. These deterministic API checks are separate from UI
translations and are not added to the YAML/screenshot denominator. Hosted
execution of this retained-runner integration is pending.

The current swiper action correction describes the right-hand panel, matching
both the original Linux PNGs and original-profile browser geometry. A browser
guard verifies the two panels remain side by side without clicking selectors.
It corrects the previous lower-panel description; all click counts, waits and
PNG assertions remain unchanged. The pushed 405-case run failed that case;
the corrected prompt is not yet hosted-validated.

Shard 3 also failed `basic-element-list-scroll-to-position` on all three
attempts: actual pixels retain items 1–5 instead of original items 11–15.
The action reports place taps in blank white space below the label. SDK 1.13.1
deepLocate derives its search crop from that incorrect planning point, so it
does not recover the visible target. The corrected prompt locates the black
letters immediately below the fifth yellow panel, at the top of the white
area. It retains one click and both unchanged PNG assertions. This correction
also awaits hosted validation; no tolerance, selector click or extra retry was
introduced.

The preceding local collection was 414 with 114 model-free checks and typechecking
passing, including 209 pixel cases. Seven further elements swiper callbacks
retain all current/indicator API mutations, autoplay waits, Chromium guards and
original PNGs. Eight clipped indicator baselines preserve exactly the original
100-by-30 rectangle at (50,170); other labels/suites cannot inherit clipping,
nor can YAML choose it. Complete original callback replay checks every option
and ordered step. Real synthetic browser comparison against the unchanged
public matcher agrees on pass, outside-clip pass and inside-clip failure,
without repository baseline writes. Linux/autoplay hosted acceptance is pending.

The preceding local collection was 407 with 112 model-free checks and typechecking
passing, including 202 pixel cases. Two CSS fallback SSR branches retain
complete original helpers/callbacks, font readiness, 300 ms SSR and 100 ms
common waits, five-second CSS timeouts and afterEach evidence. Existing client
translations now restore their omitted 100 ms wait and shorter original timeout.
Both unchanged originals and translations pass locally on first attempts for
all four client/SSR cases. The additions/corrections remain local while the
pushed 405-case run 38028258657 executes; no new hosted acceptance is inferred.

The preceding local collection was 405 with 111 model-free checks, including 202 pixel
cases. Two component-event API contracts retain the complete original enable/
disable and listener reference counts, immediate reads and exact event payloads.
Both original and translated cases pass locally on first attempts. Full original
callback replay agrees with translations, including premature-disable,
duplicate-enable and extra-field negative variants. No new custom node or
scripted user action is introduced. The 26 additions after 379 await hosted execution.

Run 38025912330 at `c826274` passed all 379 cases, reports and Pages; 380
attempts include one retry of basic-lazy-component-when-need-with-itself. All
379 rows have linked screenshots; all 384 unique public image/report URLs
returned HTTP 200. This supersedes the historical pending
statements for that head below; subsequent local additions are not yet accepted.

The preceding local collection was 403 with 109 model-free checks, including 202 pixel
cases. Four expanded SSR-no-JavaScript cases run in their own genuinely
JavaScript-disabled Chromium/Pixel 5 contexts. Both original and translated
cases pass locally on first attempts without model calls. Source replay,
context isolation and the complete four-shard partition/report identity checks
include this fourth project. All 24 additions after pushed 379 remain local;
hosted execution is pending, and Linux PNG acceptance is not inferred here.

The preceding local collection was 399 with 108 model-free checks, including 202 pixel
cases. Three templated CSS inheritance branches preserve complete original
callback and loop semantics, all five-second CSS/attribute assertions and one
ordinary Update click through aiAct. Attribute absence requires actual null
on an existing element. Original Chromium tests passed locally, first attempts;
the AI translations await hosted execution. All 20 additions after pushed
379 remain local while its CI runs.

The preceding local collection was 396 with 105 model-free checks, including 202 pixel
cases. Nine additional web-elements public API flows preserve attribute
mutations and addText/setValue/sendDelEvent argument order, all original PNGs,
fixed waits and the shared x-input/method fixture used by textarea originals.
Scripted clicks/focus/input operations are excluded by the source whitelist.
All 17 additions after pushed 379 remain local while its CI runs.

The preceding local collection was 387 with 103 model-free checks, including 193 pixel
cases. Six further swiper/list flows preserve full source callbacks, original
fixed waits and PNGs, exact click counts and Chromium conditions. Ordinary
clicks use aiAct; no scripted DOM clicks or relaxed pixel defaults are added.
All eight additions after pushed 379 remain local while its CI runs.

The preceding local collection was 381 with 102 model-free checks, including 187 pixel
cases. Two local viewpager flows retain the original attribute mutation or
single method-selectTab click and ordered before/after PNGs. Source callback
replay checks the full sequence. Only the visible click becomes aiAct. These
two additions are not pushed while the 379-case hosted run is active.

The latest pushed collection is 379 with 102 model-free checks, including 185 pixel
cases. The latest 54 describe-scoped web-elements static callbacks are replayed
in full with their unchanged original title helper. Fixture names, eight
placeholder PNG aliases, input/textarea simpleTitle snapshots and all original
waits remain exact. All source fixtures and Linux PNGs exist. This batch still
requires hosted execution; it is not counted as accepted coverage.

The preceding local collection was 325 with 100 model-free checks. Its 39
web-elements static pixel cases preserve every original goto, font-readiness
wait, fixed wait and PNG, while disabled source cases remain excluded. Both
source packages import the same Chromium/Pixel 5 profile. The existing pixel
project uses independent fixture URLs and explicit baseline suites; a missing
web-elements PNG cannot fall back to web-core or inherit its textarea exception.
The full four-shard partition and real SDK collection checks include this batch.
There are 131 pixel cases in total; all new Linux baseline execution remains
pending, separately from fully accepted hosted coverage.

Current local collection is 286 with 97 model-free checks. Three further static
pixels preserve textarea color, placeholder font size and default-display path
normalization. The one original placeholder test explicitly sets mismatch ratio
0.02; this is hard-bound to its exact source PNG, not an input allowing other
tests to relax. Other baselines retain ratio 0 and original perceptual defaults.
All original statements, waits, PNGs and options are checked; Linux execution
of this local batch remains pending.

Local collection is now 283 with 95 model-free checks. Two more original pixel
flows retain updateGlobalProps' exact blue payload and ordered snapshots, and
the frame height/weight removals plus exact viewport style. Original callback
replay verifies every mutation, query, wait and snapshot in sequence. These
Linux PNG contracts await hosted execution. Animated snapshots remain pending
click-relative timing; AI latency must not extend the original sampling window.

Local collection is now 281 with 94 model-free checks. Two additional FoldView
flows retain both ordered pixel baselines and immediate overflow scrollTop 200
after exactly 100 ms. Only the ordinary visible orange-button click becomes
`aiAct`; the original overflow passes locally. AI/device/PNG acceptance remains
pending. No selector-driven UI action is introduced. The dynamic text-style
test's original updateStyle target is 10×10 and transparent; it remains in the
original runner, not silently replaced with guessed coordinates or a weaker
visual assertion. Originally disabled tests remain disabled.

Local collection is now 279 with 92 model-free checks passing. The three
additions after pushed `e97e17a` retain the two explicitly Chromium-only blur
PNG contracts and the cssSelector-disabled reload API. Both unchanged original
and translated reload executions pass on first local attempts with the same
two CSS assertions and waits. The two Linux PNGs are not run on macOS; browser
skips and original baseline bytes are preserved. No hosted acceptance is inferred.

Run 38021387390 passed all four test shards at the 264-case head, including the
first Linux baseline execution batch. Publication nevertheless failed: the
pixel adapter's model-free test resolved baselines from the report job's root
cwd rather than from the module. Module-relative baseline resolution fixes that
path bug without changing PNGs or comparison options. All 90 model-free checks
pass from the repository root and the unchanged public-matcher differential
passes in an isolated synthetic fixture tree. Local collection is now 276;
the extra twelve component pixel cases await hosted execution. This run has no
successful Pages deployment and is not a fully accepted integration checkpoint.

### Historical batch notes (statuses as recorded)

Latest fully successful head `e171662` passed 176/176 on first attempts in run
38016292683, including report generation and Pages. Downloaded publication has
176 linked screenshots and all 181 unique public URLs returned HTTP 200.
Head `0fae870` collects 190 in pending run 38018429636. Fifty further local cases
bring collection to 264; no hosted acceptance is inferred for either batch.
The historical checkpoints below retain their original execution evidence.

The latest fully successful batch is 173/173 in run 37954151485, including report
generation and Pages. It has 173 linked screenshots and all 178 unique published
URLs returned HTTP 200; only basic-event-child-trigger retried once. All 13
additions after 160 passed first attempt, including both autoScroll AI cases. The earlier
153-case run executed 115 cases (113 passed, two failed); 38 were blocked by
endpoint preflight. Those action corrections passed in the 160-case run. The two
additional shadow stylesheet translations and their originals passed locally.
Two further autoScroll originals pass locally; their `aiAct` translations retain
the original fixed observation windows and immediate numeric property reads,
and passed first hosted attempts. Two further setNativeProps text-count originals and
translations pass locally, including the exact sequential count sum. The
scroll-view linear-shrink original and translation also pass locally; all eight
cases in its contract file passed on their first attempts. Three rpx/ppx dimension
originals and corrected translations also pass locally, retaining the original
fixture mutations and exact width/height assertions. Three updateData/processData
originals and translations also pass locally with ordered payload/mode, CSS and
timing contracts. Three further reload/viewport originals and translations pass
locally, retaining immediate shadow-page counts, global-props API payloads and
inline-style reads, three viewport reload phases, six CSS assertions and original
waits. All 71 model-free checks and typechecking pass. These three additions
bring collection to 176 but are not yet hosted-verified. Six further runtime
cases bring local collection to 182: updateData success callback, two exact
main/background global console contracts, two immediate worker-count/release
contracts and one performance event CSS/timing-key contract. All six original
and translated executions pass locally on their first attempts; all 74
model-free checks pass. They retain pre-navigation Page console listeners,
original waits, exact messages/API arguments, worker upper bounds 3/2/1,
both removals and all 13 timing keys. No polling, page-console monkey patch,
custom action node or benchmark-equivalence claim is introduced. Three further
cases preserve two main-thread click/console callbacks and the global-event
API payload/CSS contract. Their originals pass locally; the global-event YAML
also passes first attempt, while the two `aiAct` translations await hosted AI.
Five further error-payload originals and translations pass locally, preserving
500 ms windows, strict type/value predicates, source-map coordinates, messages,
nonempty stacks, file names and release strings. The unchanged source callbacks
match the new predicates across 180 valid/malformed event inputs. Pending
extraction cannot extend the observation window, nor can different events
contribute fields to one conjunction. Collection is now 190 with 77 local
model-free checks passing; these 14 additions after the pushed 176-case head
are not yet hosted-verified. Two further runtime-interaction cases bring local
collection to 192 with 79 model-free checks: reportError and shared context.
Both original tests pass locally. Their AI translations preserve original
waits and exact error/display/second-view CSS contracts but await hosted AI.
The reportError predicate matches its unchanged callback across 90 inputs.
Eight static Web pixel contracts bring local collection to 200 with 82
model-free checks and typechecking passing. Their original waits, snapshot
paths and unchanged Linux baselines are source-checked; runtime acceptance is
pending. An isolated web-pixels project retains the original Pixel 5 device,
all 13 Chromium flags and software rendering environment. It reuses the pinned
Playwright matcher backend with original zero mismatch ratio/default perceptual
threshold, full-page/allow-animation options, CSS scale, hidden caret and
five-second stable-frame timeout. A real synthetic browser differential agrees
with the unchanged public matcher on pass/failure and verifies failure artifacts.
It does not execute the Linux repository baselines on macOS. Missing baselines
fail closed without creation/update; no masks, tolerance changes or AI visual
substitution are introduced. Shards and publication include the independent
pixel project with disjoint includes and exact source-partition identities.
Forty further static Linear/Flex cases bring local collection to 240. Strict
source checks require exactly the original goto/screenshot statements, snapshot
names and checked-in files; no disabled test or additional assertion is omitted.
All 48 pixel translations retain the original goto helper's font readiness
before its case-specific waits. Linux execution remains pending.

Four earlier dimension translations had AI readiness and eventual bounding-box
polling, unlike their original single reads. `layout-bounds.yaml` restores
immediate numeric reads after the original font readiness; a regression proves
wrong-first/correct-later values formerly passed and now fail. Originals and
corrected YAML pass first attempts locally. A deliberately wrong browser
expectation fails all three attempts while its afterEach screenshot survives
in a linked local Summary. Collection stays 240; all 85 model-free checks pass.
These corrections are not yet present in the pushed 190-case CI head. The
shared renderer additionally accepts a direct first afterEach capture from the
same final attempt, without changing the failed-step link or borrowing images
after intervening actions. Both copies and regression tests are synchronized;
all 86 Web model-free checks pass. Native must publish the canonical renderer
before the next Web push so the cross-repository parity gate remains meaningful.
Three weighted-layout cases and one explicit font-load case bring local
collection to 244, including 52 original pixel contracts. The weighted cases
retain both immediate width assertions after the screenshot; the font case
retains exact load arguments, font readiness and the original 100 ms wait.
Source/AST and callback differential checks pass. Twenty further text, image,
SVG and input pixel cases bring collection to 264 with 72 original baselines.
Strict AST checks allow only the unchanged goto/wait/screenshot statements and
verify every baseline path; disabled bindlayout and selection/action cases are
not silently included. All 88 model-free checks, typechecking and synthetic
public-matcher differential pass. Original Linux baseline execution is pending.

The pushed 190-case run 38018429636 completed successfully, including Pages.
Downloaded raw reports show 190/190 passed in 191 attempts, with only
basic-lazy-component-when-need-with-itself retried. The publication has 190
linked screenshots and all 195 unique public image/report URLs return HTTP 200.
The subsequent 74 additions and immediate-dimension/renderer corrections still
await hosted execution at pushed `4a94776`, run 38021387390.
Twelve further component pixels bring local collection to 276 (84 pixel cases)
with 89 model-free checks and typechecking passing. They retain scoped original
snapshot names and exact waits. Explicit screenshot options are source-checked
to equal existing defaults (`fullPage: true`, `animations: 'allow'`); no custom
threshold, ratio or viewport behavior is silently discarded. This batch is
not pushed and has no hosted acceptance yet.
The five pilot cases
are not one-to-one source migrations.

1. Four independent CI shards partition YAML cases by stable file/case order.
   One model-backed shard runs at a time; cases within a shard remain serial.
   The real SDK collection test proves generated documents retain case
   definitions, registered nodes, variables, and lifecycle metadata.
2. Publication selects the latest attempt separately for each shard. A failed
   rerun must not resurrect an older successful report. Successful shard
   manifests and actual report names must match the source partition exactly.
   Missing reports/shards cannot produce an all-passed conclusion.
3. web-elements runs in a separate project with its own agent registry and
   HTML fixture server on port 3081; ReactLynx uses port 3080. Shards select only
   nonempty projects and separate include globs, preventing duplicate execution
   or cross-project variable/lifecycle leakage.
4. Use `aiAct` for ordinary visible interactions. Preserve exact text, geometry,
   CSS, event payloads, CDP/API behavior, pixel baselines, and performance
   thresholds using deterministic assertions. A screenshot or visual assertion
   is not an equal-precision replacement for those contracts.
5. Validate each batch against its original source assertions. Count a migration
   as verified only after execution and published case evidence are inspected.
   Unsupported/disabled cases remain explicitly pending, never passed.

The existing 100-case serial baseline passed at revision `165f881` in
[run 37906593732](https://github.com/quanru/lynx-stack/actions/runs/37906593732).
That is historical evidence, not verification of the new shard workflow.
