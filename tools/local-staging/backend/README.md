# Local backend acceptance

This harness proves the public tour-lead database boundary without Emergent,
cloud services, provider calls, production secrets, or live customer data.

Required local dependencies:

- a MongoDB process bound only to loopback;
- the repository Python environment with the backend requirements installed.

The runner uses `uvicorn` from the selected Python environment. If that module
is not installed there, it uses the `uvicorn` executable from `PATH`.

Run:

```sh
SCS_LOCAL_MONGO_URL=mongodb://127.0.0.1:27017 \
  tools/local-staging/backend/run-real-mongo-acceptance.sh
```

The harness refuses credentials, `mongodb+srv`, non-loopback nodes, and `w=0`.
It creates a unique `scs_local_test_<random>` database and drops it on exit.
All provider, webhook, scheduler, analytics, research, CRM, GymMaster, and deploy
flags are forced off. The only capability enabled by the writable scenario is
`ALLOW_DATABASE_WRITES`.

The execution proves:

- health returns 503 when database writes are off;
- a write attempt is blocked before the handler in read-only mode;
- health returns 200 after a real MongoDB ping when writes are on;
- the first synthetic `.invalid` request is accepted;
- the same UUID and payload return the same lead without new outbox keys;
- the same UUID with changed content returns 409;
- a simulated interruption after one deterministic outbox insert is repaired by
  replay, leaving one lead, two unique jobs, and no pending marker.

The test does not prove any Resend, Twilio, GymMaster, GA4, Meta, Emergent,
hosting, DNS, TLS, replica-set, or production behavior.
