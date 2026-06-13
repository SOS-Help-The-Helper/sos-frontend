#!/usr/bin/env bash
# Type-check ratchet — tsc --noEmit over live code (_archive/_lovable_ref excluded
# via tsconfig). The repo carries pre-existing type debt (244 errors as of
# 2026-06-12 — lib/chat-tools.ts, directory pages, .backup files; tracked for the
# Wave 6 any-burn-down). This gate ratchets: the count may only go DOWN.
set -uo pipefail

BASELINE_FILE="$(dirname "$0")/../.typecheck-baseline"
BASELINE=$(cat "$BASELINE_FILE")

COUNT=$(npx tsc --noEmit 2>&1 | grep -cE "error TS" || true)

echo "tsc errors: $COUNT (baseline: $BASELINE)"
if [ "$COUNT" -gt "$BASELINE" ]; then
  echo "FAIL: new type errors introduced (was $BASELINE, now $COUNT)."
  npx tsc --noEmit 2>&1 | grep -E "error TS" | tail -40
  exit 1
fi
if [ "$COUNT" -lt "$BASELINE" ]; then
  echo "NOTE: error count dropped — lower .typecheck-baseline to $COUNT in this PR."
fi
echo "OK"
