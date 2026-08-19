#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
VERSION=8.0.23
MONGOD="${SCRIPT_DIR}/vendor/mongodb-macos-aarch64--${VERSION}/bin/mongod"
RUNTIME_DIR="${SCRIPT_DIR}/runtime"
DATA_DIR="${RUNTIME_DIR}/data"
LOG_FILE="${RUNTIME_DIR}/mongod.log"
PID_FILE="${RUNTIME_DIR}/mongod.pid"
PORT="${SCS_MONGO_PORT:-27018}"

case "${PORT}" in
  ''|*[!0-9]*)
    echo "SCS_MONGO_PORT must be numeric." >&2
    exit 1
    ;;
esac

if [ ! -x "${MONGOD}" ]; then
  echo "MongoDB is not installed locally. Run ${SCRIPT_DIR}/download.sh first." >&2
  exit 1
fi

if [ -f "${PID_FILE}" ] && kill -0 "$(sed -n '1p' "${PID_FILE}")" 2>/dev/null; then
  echo "MongoDB is already running with PID $(sed -n '1p' "${PID_FILE}")."
  exit 0
fi

mkdir -p "${DATA_DIR}"
"${MONGOD}" \
  --dbpath "${DATA_DIR}" \
  --bind_ip 127.0.0.1 \
  --nounixsocket \
  --port "${PORT}" \
  --logpath "${LOG_FILE}" \
  --pidfilepath "${PID_FILE}" \
  --fork

echo "MongoDB started on mongodb://127.0.0.1:${PORT}"
