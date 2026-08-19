#!/bin/sh
set -eu
export PYTHONDONTWRITEBYTECODE=1

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)
FRONTEND_ROOT="$REPO_ROOT/frontend"
SCS_LOCAL_FRONTEND_URL=${SCS_FRONTEND_URL:-http://127.0.0.1:4173}
SCS_LOCAL_BACKEND_URL=${SCS_BACKEND_URL:-http://127.0.0.1:8000}
SCS_LOCAL_EVIDENCE_DIR=${SCS_EVIDENCE_DIR:-/tmp/scs-local-staging}

python3 "$FRONTEND_ROOT/e2e/local-staging/local_urls.py" "$SCS_LOCAL_FRONTEND_URL" --label "frontend URL" >/dev/null
python3 "$FRONTEND_ROOT/e2e/local-staging/local_urls.py" "$SCS_LOCAL_BACKEND_URL" --label "backend URL" >/dev/null

exec python3 "$FRONTEND_ROOT/e2e/local-staging/test_tour_funnel.py" \
  --frontend-url "$SCS_LOCAL_FRONTEND_URL" \
  --backend-url "$SCS_LOCAL_BACKEND_URL" \
  --evidence-dir "$SCS_LOCAL_EVIDENCE_DIR"
