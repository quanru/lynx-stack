# Visual-model capability investigation

## Root cause

The historical CI model path, `deepseek-v4-flash-ga-260731`, treats image
input as base64 text rather than usable visual evidence. Responses can either
reject an intact JPEG as "truncated" or invent an observation from the assertion
text. This is not a small-element limitation, damaged screenshot, or Midscene
node failure.

On September 30, 2026, direct requests to the same ARK service with the same
credentials and original JPEG bytes isolated the model parameter from the SDK.
The current model, `deepseek-v4-1-flash-260910`, reads those images correctly.

| Control                                  | Historical version                           | Current version                            |
| ---------------------------------------- | -------------------------------------------- | ------------------------------------------ |
| Describe three screenshots without hints | Cannot see images; discusses base64 text     | Reads gradient text, logo, and `bindinput` |
| Omit the image                           | Reports no image                             | Reports no image                           |
| Pass ASCII `Hello` as JPEG data          | HTTP 200; explains base64 decodes to text    | HTTP 400, `InvalidParameter`               |
| Pair images with incorrect assertions    | Invents nonexistent input/text; false passes | Rejects all three incorrect assertions     |

Evidence:

- [Original failing run](https://github.com/quanru/lynx-stack/actions/runs/35562900897)
- [Pinned historical version, including invalid-image control](https://github.com/quanru/lynx-stack/actions/runs/36662349437)
- [Current version, including invalid-image control](https://github.com/quanru/lynx-stack/actions/runs/36662352290)
- [Current version with original insight prompts](https://github.com/quanru/lynx-stack/actions/runs/36662027336)

The historical endpoint ID now resolves to the newer version. Replaying only
that endpoint ID would miss the root cause; the historical version must be
requested explicitly. Local `doubao-seed-evolving-latest-version` also reads the
logo and input correctly, three out of three times each.

These observations identify the unusable historical model/service path, not
the provider's internal implementation. The experiments do not expose whether
the base64-to-text fallback occurs in the gateway or the model adapter inside
the provider.

## Corrections

- Preflight must verify an image-only OCR challenge, not merely a text response
  or HTTP 200. The expected answer is absent from the prompt.
- `web.fill` is removed. Input focus, keyboard actions, and editing use `aiAct`.
- The logo case uses `aiWaitFor` and `aiAssert` for additive visual coverage.
  Extra HTTP/decode checks were removed on October 2; the original Playwright
  pixel snapshot is unchanged and is not replaced by the AI assertion.
- The input case retains exact `innerText === 'foobar-6-6'` validation after
  `aiAct`. AI does not decide whether the event payload is exactly correct.
- Gradient assertions no longer require bold weight absent from the fixture.
- Existing text-only-model "passes" must not be treated as verified visual
  outcomes. Retries do not solve missing visual capability.

Temporary diagnostic workflow inputs and implementation were removed after
the experiments. The run logs and diagnostic artifacts retain the evidence;
ordinary E2E remains self-contained and does not depend on old artifacts.

## October 9 lazy-component grounding failures

Run [37880317126](https://github.com/quanru/lynx-stack/actions/runs/37880317126)
passed 95 of 100 cases. Five lazy-component cases failed all three attempts at
the first green-to-pink assertion. The agent reports contain exactly one tap
per failed toggle, so these failures were not caused by repeated toggling.

The fixture places a green observer to the left of a blue click target. In the
single-pair screenshots, the blue target occupies x=100..200; recorded taps
landed at x=59 or x=75, inside the non-interactive green observer. The two-pair
fixtures stack identical rows with no gap, making the screenshot look like two
continuous color columns. Most taps again hit the left column; one hit the
lower blue row while the assertion correctly checked the upper observer.
The load-on-demand case likewise clicked the left observer below its load control.

The raw action output reveals a coordinate-space error, not merely failure to
recognize blue: one response emitted `locate.point: [150, 40]` for a 393 × 851
screenshot. Midscene 1.13.1's DeepSeek adapter requires 0–1000 normalized points,
so it correctly converted that response to `[59, 34]`. The response used values
consistent with screenshot pixels while declaring normalized coordinates.
Do not compensate by rescaling every response: some responses already use
normalized values, so such a workaround would corrupt valid actions.

The revised `aiAct` goals identify the right-hand blue target, the neighboring
observer's color transition, and, for stacked rows, the upper/lower half of the
blue column. They retain exactly one click per original action. No pixel
coordinates, selector-based actions, fixture changes, or weaker assertions were
introduced. Contract tests guard those spatial goals and continue comparing all
original selectors, indices, values, and assertion sequences. Agent-level
`aiContexts.aiAct` also reinforces the active protocol's coordinate convention,
including the normalization formula and full-image center, without supplying
target coordinates or changing the adapter.

Run [37902693708](https://github.com/quanru/lynx-stack/actions/runs/37902693708)
passed 98 of 100 cases. All five lazy-component cases passed their original
exact assertions. The two stacked-row cases failed only the final additive
visual wait: it described four separate squares, but adjacent same-color rows
form two uninterrupted columns without visible boundaries. That wait now
describes a pink left column (both upper and lower halves) and a blue right
column. Individual observer assertions remain unchanged and establish that
both original targets changed color. A fresh full run must verify this final
description correction.
