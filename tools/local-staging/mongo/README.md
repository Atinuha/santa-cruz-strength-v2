# Local MongoDB runtime

This directory provides a disposable, loopback-only MongoDB process for the
Santa Cruz Strength local staging checks. It does not use Atlas, Emergent, or
production data.

The runtime is pinned to MongoDB Community 8.0.23 for Apple Silicon macOS. The
download script verifies the SHA-256 file published beside the official
archive. The archive, database, logs, and PID are ignored by Git.

Run from the repository root:

```sh
chmod +x tools/local-staging/mongo/*.sh
tools/local-staging/mongo/download.sh
tools/local-staging/mongo/start.sh
PYTHONPATH=backend .venv/bin/python tools/local-staging/mongo/ping.py
tools/local-staging/mongo/stop.sh
```

The fixed default URL is `mongodb://127.0.0.1:27018`. Set
`SCS_MONGO_PORT` for the server and use the matching `SCS_LOCAL_MONGO_URL`
for the ping only when the default port is unavailable.
