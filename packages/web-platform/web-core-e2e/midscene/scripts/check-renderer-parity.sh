#!/usr/bin/env bash
set -euo pipefail

# The native suite owns the report renderer contract. Both repositories vendor
# it so their CI remains self-contained; this check prevents silent drift.
if [[ -n "${MIDSCENE_RENDERER_REPO:-}" ]]; then
  source_repo="$MIDSCENE_RENDERER_REPO"
elif [[ -n "${GITHUB_REPOSITORY_OWNER:-}" ]]; then
  source_repo="$GITHUB_REPOSITORY_OWNER/lynx"
else
  echo 'Set MIDSCENE_RENDERER_REPO for local parity checks.' >&2
  exit 2
fi

source_ref="${MIDSCENE_RENDERER_REF:-develop}"
source_path='testing/ai_e2e/scripts/render-ci-summary.mjs'
local_file="$(dirname "$0")/render-ci-summary.mjs"
downloaded="$(mktemp)"
trap 'rm -f "$downloaded"' EXIT

fetch_renderer() {
  curl --fail --silent --show-error --location --retry 3 \
    --output "$downloaded" \
    "https://raw.githubusercontent.com/$source_repo/$1/$source_path"
}

if ! fetch_renderer "$source_ref"; then
  # Fork PRs can run before this suite is merged into the fork's develop branch.
  if [[ "$source_ref" != 'develop' ]]; then
    echo "Cannot fetch the canonical renderer from $source_repo@$source_ref" >&2
    exit 1
  fi
  source_ref='midscene/ai-e2e-explorer'
  fetch_renderer "$source_ref"
fi

if ! cmp -s "$downloaded" "$local_file"; then
  echo "The vendored report renderer differs from $source_repo@$source_ref:$source_path" >&2
  echo 'Update both copies and their contract tests together.' >&2
  exit 1
fi
echo "Report renderer matches $source_repo@$source_ref"
