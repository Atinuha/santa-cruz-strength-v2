#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)

if [ -z "${SCS_LOCAL_MONGO_URL:-}" ]; then
  SCS_LOCAL_MONGO_URL="mongodb://127.0.0.1:27017"
  export SCS_LOCAL_MONGO_URL
fi

if [ -n "${SCS_BACKEND_PYTHON:-}" ]; then
  PYTHON_BIN=$SCS_BACKEND_PYTHON
elif [ -x "$REPOSITORY_ROOT/.venv/bin/python" ]; then
  PYTHON_BIN="$REPOSITORY_ROOT/.venv/bin/python"
else
  PYTHON_BIN=python3
fi

if "$PYTHON_BIN" -c 'import uvicorn' >/dev/null 2>&1; then
  :
elif command -v uvicorn >/dev/null 2>&1; then
  SCS_UVICORN_BIN=$(command -v uvicorn)
  export SCS_UVICORN_BIN
else
  echo "uvicorn is not available in the selected Python environment or PATH." >&2
  exit 1
fi

cd "$REPOSITORY_ROOT"
exec "$PYTHON_BIN" -m unittest discover \
  -s backend/tests/integration \
  -p 'test_*.py' \
  -v
