# Full E2E migration scope

The scope includes web-core-e2e and web-elements, not only ReactLynx examples.
Original tests, fixtures, snapshots, browser variants, and SSR variants remain
unchanged until equivalent verification has run successfully. Unit tests and
benchmarks are not UI migration candidates. Server-rendering integration tests
remain in scope as deterministic contracts, not visual AI tests.

## Inventory

Run `node scripts/inventory-upstream.mjs` to refresh this source inventory.
These are source declarations, including named skipped tests, not runtime case
counts. Loops, browser projects, SSR variants, and conditional skips change the
runtime denominator. Do not subtract the 142 YAML cases from these totals:
the pilot cases are not one-to-one replacements, and upstream names can repeat.

| Suite/file                                      | Source declarations | Migration status                                                                                                    |
| ----------------------------------------------- | ------------------: | ------------------------------------------------------------------------------------------------------------------- |
| web-core-e2e/reactlynx.spec.ts                  |                 342 | 115 YAML cases passed across four hosted shards in run 37924702935; pixel contracts remain separate                 |
| web-core-e2e/web-core.test.ts                   |                  35 | Pending exact API/callback contract integration                                                                     |
| web-core-e2e/reactlynx-css-var-fallback.spec.ts |                   2 | Both Chromium client cases and unchanged originals passed locally; hosted, SSR and other browsers pending           |
| web-core-e2e/ssr-no-js.spec.ts                  |                   2 | Pending; loops expand runtime coverage                                                                              |
| web-core-e2e/middleware.spec.ts                 |                   1 | Pending                                                                                                             |
| web-core-e2e/server-tests/server-e2e.test.ts    |                  17 | Pending deterministic server HTML snapshot integration                                                              |
| web-elements/web-elements.spec.ts               |                 296 | 25 exact CSS/attribute cases passed locally on the first attempt and in hosted run 37928102242; other cases pending |
| web-elements/x-markdown.spec.ts                 |                  34 | Pending                                                                                                             |
| web-elements/scroll-view-mouse-drag.spec.ts     |                  12 | Pending                                                                                                             |
| web-elements/performance.test.ts                |                   7 | Pending; preserve CDP metric thresholds                                                                             |
| web-elements/x-webview.spec.ts                  |                   7 | Pending                                                                                                             |
| web-elements/x-svg-inline.spec.ts               |                   3 | Pending; loops expand runtime coverage                                                                              |
| web-elements/x-foldview-ng-wheel.spec.ts        |                   3 | Pending                                                                                                             |
| web-elements/component-event.spec.ts            |                   2 | Pending                                                                                                             |
| web-elements/x-text-selection.spec.ts           |                   2 | Pending                                                                                                             |
| web-elements/template.spec.ts                   |                   1 | Pending                                                                                                             |

The ReactLynx count includes one named `test.skip` declaration; the previously
reported 341 counted ordinary `test()` calls only. Neither count is an executed
case total.

## Execution and acceptance

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
