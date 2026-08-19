#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PID_FILE="${SCRIPT_DIR}/runtime/mongod.pid"

if [ ! -f "${PID_FILE}" ]; then
  echo "MongoDB is not running."
  exit 0
fi

PID=$(sed -n '1p' "${PID_FILE}")
case "${PID}" in
  ''|*[!0-9]*)
    echo "Invalid MongoDB PID file." >&2
    exit 1
    ;;
esac

if kill -0 "${PID}" 2>/dev/null; then
  kill -TERM "${PID}"
  ATTEMPTS=0
  while kill -0 "${PID}" 2>/dev/null; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "${ATTEMPTS}" -ge 100 ]; then
      echo "MongoDB did not stop within 10 seconds." >&2
      exit 1
    fi
    sleep 0.1
  done
fi

rm -f "${PID_FILE}"
echo "MongoDB stopped cleanly."
