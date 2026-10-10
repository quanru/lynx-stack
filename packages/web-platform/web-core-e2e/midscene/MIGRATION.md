# Full E2E migration scope

The scope includes web-core-e2e and web-elements, not only ReactLynx examples.
Original tests, fixtures, snapshots, browser variants, and SSR variants remain
unchanged until equivalent verification has run successfully, except for the
documented fixture-initialization defect in `installLynxViewStyle`: observing
Document instead of a not-yet-created documentElement makes its existing offset
and transform cases actually exercise their intended placement. Unit tests and
benchmarks are not UI migration candidates. Server-rendering integration tests
remain in scope as deterministic contracts, not visual AI tests.

## Inventory

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

The next local collection reaches 451 cases, including 241 pixel cases.
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
   At most two shards run concurrently; cases within a shard remain serial.
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
