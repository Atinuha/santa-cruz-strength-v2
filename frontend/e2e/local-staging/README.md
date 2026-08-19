# Local tour funnel verification

This harness uses the installed system Playwright and Chromium. It adds no npm
dependency and does not change the lockfile.

Safety rules:

- Frontend and backend origins must use an explicit loopback port.
- Emergent, preview, production, and other non-loopback HTTP requests are
  rejected or aborted before network delivery.
- The form uses only `scs-local-tour@example.invalid` and `8315550100`.
- SMS consent stays off.
- Provider flags must stay off in the backend environment.

Service order from the repository root:

1. Start the disposable local MongoDB service.
2. Start the backend on `http://127.0.0.1:8000` with the database-write and
   local seed controls required by the backend staging harness. Keep every
   provider and external-write control off.
3. Start the frontend in another terminal:

   `tools/local-staging/frontend/start-local-frontend.sh`

4. Run the browser checks:

   `tools/local-staging/frontend/run-browser-e2e.sh`

5. Run the real prerender build without `SKIP_PRERENDER`:

   `tools/local-staging/frontend/run-prerender.sh`

The browser evidence is written to
`/tmp/scs-local-staging/frontend-browser-evidence.json` by default. Override
only with `SCS_EVIDENCE_DIR` when a different local path is required.

The browser check creates one request ID for desktop and a different request ID
for mobile on each run. This models two real browser sessions and keeps the
harness safe to repeat against the disposable database. Exact request replay
and changed-payload conflict behavior are covered by the real MongoDB backend
acceptance suite.
