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
- The logo case retains exact resource checks and adds `aiAssert` visual
  evidence. HTTP status and successful image decoding are not UI actions.
- Gradient assertions no longer require bold weight absent from the fixture.
- Existing text-only-model "passes" must not be treated as verified visual
  outcomes. Retries do not solve missing visual capability.

Temporary diagnostic workflow inputs and implementation were removed after
the experiments. The run logs and diagnostic artifacts retain the evidence;
ordinary E2E remains self-contained and does not depend on old artifacts.
