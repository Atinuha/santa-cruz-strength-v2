#!/usr/bin/env bash
# Post-compaction continuity for the Santa Cruz Strength convergence.
#
# Fires on SessionStart with matcher "compact". Stdout is injected as context.
# Emits decision-grade state only: where authority lives, what git actually
# says right now, which slice is active, and what must not regress. It does not
# reproduce the spec or the conversation, because both are on disk and reading
# them is cheap.
#
# Design rule: derive from the repository, never from a cached summary. A
# hardcoded status line that drifts is worse than no hook at all.

set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO" 2>/dev/null || exit 0
DOCS="docs/convergence"

echo "=== SANTA CRUZ STRENGTH: post-compaction state ==="
echo
echo "Repo: $REPO"
echo "Authority, read before acting:"
for f in "$DOCS/SCS-CONVERGENCE-SPEC.html" "$DOCS/TICKETS.md" "$DOCS/LOCAL-SAFETY.md"; do
  [ -f "$f" ] && echo "  $f"
done
echo "  Donors are READ ONLY: ../SantaCruzrepo-new (content), ../scs-build (engineering)"
echo

echo "--- git, live ---"
echo "branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
echo "push target: $(git remote get-url --push origin 2>/dev/null || echo none)"
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "uncommitted files: $dirty"
[ "$dirty" != "0" ] && git status --short 2>/dev/null | head -12 | sed 's/^/  /'
echo "recent commits:"
git log --oneline -6 2>/dev/null | sed 's/^/  /'
echo

if [ -f "$DOCS/TICKETS.md" ]; then
  echo "--- execution slices ---"
  awk '/^\| ?T-/ {print "  " $0}' "$DOCS/TICKETS.md"
  echo
  echo "--- next action ---"
  nxt=$(awk -F'|' '/\*\*NEXT\*\*/ {gsub(/^ +| +$/,"",$2); gsub(/^ +| +$/,"",$3); print "  " $2 ": " $3}' "$DOCS/TICKETS.md")
  echo "${nxt:-  No slice marked NEXT. Read TICKETS.md and pick the frontier.}"
  echo
  echo "--- safety invariants (must not regress) ---"
  sed -n '/^## Safety invariants/,/^## /p' "$DOCS/TICKETS.md" | grep -E '^[0-9]+\.' | sed 's/^/  /'
  echo
  echo "--- open blockers, external only ---"
  awk -F'|' '/^\| ?B-/ {gsub(/^ +| +$/,"",$2); gsub(/^ +| +$/,"",$3); print "  " $2 ": " substr($3,1,96)}' "$DOCS/TICKETS.md"
  echo
  echo "--- corrections already made, do not re-derive ---"
  sed -n '/^## Corrections on record/,$p' "$DOCS/TICKETS.md" | grep -E '^- ' | sed 's/^/  /'
fi

echo
echo "--- resume rule ---"
echo "  Verify filesystem and git state before acting, then continue the active"
echo "  slice. Do not restart discovery and do not ask for project context to be"
echo "  restated: it is in the files listed above."
echo "  Before declaring anything missing, grep this repository for it. Every"
echo "  correction on record came from concluding absence after a partial search."
