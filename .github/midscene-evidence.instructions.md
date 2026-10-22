---
applyTo: "packages/web-platform/web-core-e2e/midscene/**,.github/workflows/midscene-web.yml"
---

# Midscene and retained-source evidence

Keep YAML case counts separate from retained original source declarations and
browser executions. The Summary has one attention section and one collapsed
passed appendix; supplemental source evidence must join these sections rather
than create a duplicate report layout.

Preserve original callbacks, browser profiles, retry policies, assertion
deadlines, fixture aliases and PNG baselines. Original programmatic API or
keyboard inputs are not interchangeable with visually similar AI actions.

Convert Playwright absolute attachment paths to the relative evidence manifest
on the producer runner, before artifact upload. Publish only the selected
current attempt. Missing final-attempt screenshots must not fall back to an
older retry. Missing or invalid evidence cannot become a successful Summary.

Use the original runner's exit policy for fully evidenced flaky passes while
showing the warning explicitly. Distinguish case results from producer and
evidence failures. A validated failure report may be uploaded and published,
but its failed validation must remain failed; the rendered marker gates this
path. Never publish a partial site merely because a directory exists.

The shared renderer is vendored in Lynx and lynx-stack. Update both renderer
copies and their contract tests together; verify byte parity before pushing.
Do not cancel a long device run merely to publish report-only follow-ups.

Run the root Turbo build before real Playwright collection checks. Use the
workspace Playwright installation from web-elements, not Midscene's separate
npm installation. Collection-only checks must not launch browsers and must not
be described as browser execution acceptance.
