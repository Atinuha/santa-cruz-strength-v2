#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
VERSION=8.0.23
ARCHIVE="mongodb-macos-arm64-${VERSION}.tgz"
BASE_URL="https://fastdl.mongodb.org/osx"
VENDOR_DIR="${SCRIPT_DIR}/vendor"
INSTALL_DIR="${VENDOR_DIR}/mongodb-macos-aarch64--${VERSION}"

if [ "$(uname -s)" != "Darwin" ] || [ "$(uname -m)" != "arm64" ]; then
  echo "This pinned runtime supports only Apple Silicon macOS." >&2
  exit 1
fi

if [ -x "${INSTALL_DIR}/bin/mongod" ]; then
  "${INSTALL_DIR}/bin/mongod" --version | sed -n '1,3p'
  exit 0
fi

mkdir -p "${VENDOR_DIR}"
curl --fail --location --proto '=https' --tlsv1.2 \
  --output "${VENDOR_DIR}/${ARCHIVE}" \
  "${BASE_URL}/${ARCHIVE}"
curl --fail --location --proto '=https' --tlsv1.2 \
  --output "${VENDOR_DIR}/${ARCHIVE}.sha256" \
  "${BASE_URL}/${ARCHIVE}.sha256"

(
  cd "${VENDOR_DIR}"
  shasum -a 256 -c "${ARCHIVE}.sha256"
  tar -xzf "${ARCHIVE}"
)

"${INSTALL_DIR}/bin/mongod" --version | sed -n '1,3p'
