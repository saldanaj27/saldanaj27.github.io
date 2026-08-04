#!/usr/bin/env bash
# Confidentiality scrub gate (website/PLAN.md §4d).
# Fails the build if any blocklisted internal identifier appears in the built
# site. Runs after `astro build` as part of `npm run build`.
set -euo pipefail

DIST="${1:-dist}"

if [ ! -d "$DIST" ]; then
  echo "scrub-check: $DIST not found; run astro build first" >&2
  exit 1
fi

# Internal service/system names, infra identifiers, vendor names, colleagues,
# ticket IDs. FICO as an employer name is allowed and not on this list.
PATTERN='nsiam|evmg|fico-1es|gbusw2|ping[ -]?aic|forgerock|relational store|opa-security|authoring-api|bundle-generator|idp-log-bridge|bhose|rajarshi|jose felix|NSIAM-[0-9]+'

HITS=$(grep -riE "$PATTERN" "$DIST" --include='*.html' --include='*.xml' --include='*.txt' --include='*.js' -l || true)

if [ -n "$HITS" ]; then
  echo "scrub-check FAILED: blocklisted identifiers found in built output:" >&2
  grep -riE "$PATTERN" "$DIST" --include='*.html' --include='*.xml' --include='*.txt' --include='*.js' -o | sort | uniq -c | sort -rn >&2
  echo "Files:" >&2
  echo "$HITS" >&2
  exit 1
fi

echo "scrub-check passed: no blocklisted identifiers in $DIST"
