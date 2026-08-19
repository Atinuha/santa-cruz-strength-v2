#!/bin/sh
set -eu
export PYTHONDONTWRITEBYTECODE=1

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)
FRONTEND_ROOT="$REPO_ROOT/frontend"
SCS_LOCAL_BACKEND_URL=${SCS_BACKEND_URL:-http://127.0.0.1:8000}

python3 "$FRONTEND_ROOT/e2e/local-staging/local_urls.py" "$SCS_LOCAL_BACKEND_URL" --label "backend URL" >/dev/null

if [ "${SKIP_PRERENDER:-}" = "true" ]; then
  echo "[local-prerender] SKIP_PRERENDER=true is forbidden for this check" >&2
  exit 1
fi

cd "$FRONTEND_ROOT"
unset SKIP_PRERENDER
REACT_APP_BACKEND_URL="$SCS_LOCAL_BACKEND_URL" \
PRERENDER_API_URL="$SCS_LOCAL_BACKEND_URL" \
REACT_APP_ALLOW_ANALYTICS=false \
npm run build:preview

python3 "$FRONTEND_ROOT/e2e/local-staging/verify_prerender.py" --frontend-root "$FRONTEND_ROOT"
