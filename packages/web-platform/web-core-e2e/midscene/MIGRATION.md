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
runtime denominator. Do not subtract the 276 YAML cases from these totals:
the pilot cases are not one-to-one replacements, and upstream names can repeat.

| Suite/file                                      | Source declarations | Migration status                                                                                                                                                 |
| ----------------------------------------------- | ------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| web-core-e2e/reactlynx.spec.ts                  |                 342 | ReactLynx migrations included in successful 173-case run 37954151485; three further reload cases pass locally; pilot overlap and pixel contracts remain separate |
| web-core-e2e/web-core.test.ts                   |                  35 | Pending exact API/callback contract integration                                                                                                                  |
| web-core-e2e/reactlynx-css-var-fallback.spec.ts |                   2 | Both Chromium client cases passed locally and in hosted run 37940214877; SSR and other browsers pending                                                          |
| web-core-e2e/ssr-no-js.spec.ts                  |                   2 | Pending; loops expand runtime coverage                                                                                                                           |
| web-core-e2e/middleware.spec.ts                 |                   1 | Original Chromium client case passed locally; translation passed in hosted run 37948938294; SSR/other browsers separate                                          |
| web-core-e2e/server-tests/server-e2e.test.ts    |                  17 | Pending deterministic server HTML snapshot integration                                                                                                           |
| web-elements/web-elements.spec.ts               |                 296 | 25 exact CSS/attribute cases passed locally on the first attempt and in hosted run 37928102242; other cases pending                                              |
| web-elements/x-markdown.spec.ts                 |                  34 | Pending                                                                                                                                                          |
| web-elements/scroll-view-mouse-drag.spec.ts     |                  12 | Pending                                                                                                                                                          |
| web-elements/performance.test.ts                |                   7 | Pending; preserve CDP metric thresholds                                                                                                                          |
| web-elements/x-webview.spec.ts                  |                   7 | Pending                                                                                                                                                          |
| web-elements/x-svg-inline.spec.ts               |                   3 | Pending; loops expand runtime coverage                                                                                                                           |
| web-elements/x-foldview-ng-wheel.spec.ts        |                   3 | Pending                                                                                                                                                          |
| web-elements/component-event.spec.ts            |                   2 | Pending                                                                                                                                                          |
| web-elements/x-text-selection.spec.ts           |                   2 | Pending                                                                                                                                                          |
| web-elements/template.spec.ts                   |                   1 | Non-UI Rust/TypeScript consistency test; retain existing runner, not an AI UI migration                                                                          |

The ReactLynx count includes one named `test.skip` declaration; the previously
reported 341 counted ordinary `test()` calls only. Neither count is an executed
case total.

## Execution and acceptance

Current local collection is 325 with 100 model-free checks. The next 39
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
