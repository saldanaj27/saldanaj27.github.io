#!/usr/bin/env bash
# Confidentiality scrub gate (website/PLAN.md §4d).
# Runs after `astro build` as part of `npm run build`, and in CI on every deploy.
#
# Two independent gates:
#   1. Blocklist  — internal identifiers must not appear anywhere in the site.
#   2. Attribution — write-ups must not name the employer at all.
set -euo pipefail

DIST="${1:-dist}"
SRC="${2:-src}"
FAILED=0

if [ ! -d "$DIST" ]; then
  echo "scrub-check: $DIST not found; run astro build first" >&2
  exit 1
fi

# --- Gate 1: internal identifiers, anywhere in the built site -----------------
# Internal service/system names, infra identifiers, vendor names, colleagues,
# ticket IDs. FICO as an employer name is allowed HERE (work pages and the
# resume name it deliberately); gate 2 below restricts it in write-ups.
PATTERN='nsiam|evmg|fico-1es|gbusw2|ping[ -]?aic|forgerock|relational store|opa-security|authoring-api|bundle-generator|idp-log-bridge|bhose|rajarshi|jose felix|NSIAM-[0-9]+'

HITS=$(grep -riE "$PATTERN" "$DIST" --include='*.html' --include='*.xml' --include='*.txt' --include='*.js' -l || true)

if [ -n "$HITS" ]; then
  echo "scrub-check FAILED (blocklist): internal identifiers in built output:" >&2
  grep -riE "$PATTERN" "$DIST" --include='*.html' --include='*.xml' --include='*.txt' --include='*.js' -o | sort | uniq -c | sort -rn >&2
  echo "Files:" >&2
  echo "$HITS" >&2
  FAILED=1
fi

# --- Gate 2: no employer attribution in write-ups ----------------------------
# Work pages and the resume attribute to FICO on purpose: they describe a job.
# Write-ups are different. They describe architecture and failure modes, so
# attributing one to a named employer publishes that employer's engineering
# design. Keep write-ups pattern-level and employer-agnostic; the work pages
# carry the named, attributed proof.
#
# Checked against source, not dist, so the message can point at the real file.
EMPLOYER='fico|fair isaac'
WRITING_SRC="$SRC/content/writing"

if [ -d "$WRITING_SRC" ]; then
  WRITING_HITS=$(grep -riE "$EMPLOYER" "$WRITING_SRC" -l || true)
  if [ -n "$WRITING_HITS" ]; then
    echo "scrub-check FAILED (attribution): employer named in a write-up:" >&2
    grep -rniE "$EMPLOYER" "$WRITING_SRC" >&2
    echo >&2
    echo "Write-ups must be employer-agnostic. Describe the pattern, not whose" >&2
    echo "system it was. Attributed proof belongs on the work pages instead." >&2
    FAILED=1
  fi
fi

if [ "$FAILED" -ne 0 ]; then
  exit 1
fi

echo "scrub-check passed: no blocklisted identifiers in $DIST, no employer attribution in write-ups"
