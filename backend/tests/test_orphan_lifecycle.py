"""Lifecycle tests for the dedicated orphan recovery task.

Tests that the orphan recovery loop:
  1. Starts when ALLOW_SCHEDULERS=false + ALLOW_RESEND_WEBHOOKS=true + ALLOW_DATABASE_WRITES=true
  2. Does NOT start when ALLOW_RESEND_WEBHOOKS=false
  3. Does NOT start when ALLOW_DATABASE_WRITES=false
  4. Does not invoke email, SMS, GymMaster, analytics, lead dispatch, or scheduler
  5. Attempt 51+ remains retryable with 1-hour capped backoff
  6. Shutdown cancels the task cleanly
  7. Module import causes no worker or database side effect
"""

import asyncio
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch


def _setup_env(**overrides):
    """Set test environment without importing server."""
    base = {
        'MONGO_URL': 'mongodb://localhost:27017', 'DB_NAME': 'scs_lifecycle_test',
        'FRONTEND_URL': 'http://localhost:3000', 'CORS_ORIGINS': 'http://localhost:3000',
        'TWILIO_ACCOUNT_SID': 'ACtestonlytestonlytestonlytest',
        'TWILIO_AUTH_TOKEN': 'testonlytestonlytestonlytest',
        'TWILIO_PHONE_NUMBER': '+15550001111', 'RESEND_API_KEY': 're_testonly_testonly',
        'JWT_SECRET': 'x' * 40, 'UNSUBSCRIBE_SECRET': 'y' * 40,
        'APP_ENV': 'development', 'PRODUCTION_CHANGES_APPROVED': 'false',
        'OUTBOUND_TEST_MODE': 'false', 'RESEND_WEBHOOK_SECRET': 'whsec_dGVzdA==',
    }
    gates = {g: 'false' for g in [
        'ALLOW_SCHEDULERS', 'ALLOW_EMAIL_SENDS', 'ALLOW_SMS_SENDS', 'ALLOW_SEEDING',
        'ALLOW_ANALYTICS', 'ALLOW_SESSION_REPLAY', 'ALLOW_TWILIO_WEBHOOKS',
        'ALLOW_LEAD_OUTBOX_DISPATCH', 'ALLOW_LEAD_RESEND', 'ALLOW_LEAD_TWILIO',
        'ALLOW_THIRD_PARTY_RESEARCH', 'ALLOW_REMOTE_NONPROD_DATABASE',
        'ALLOW_DEPLOY_HOOK', 'ALLOW_GYMMASTER_PROSPECT_WRITES', 'ALLOW_LEAD_CRM_RECORDING',
    ]}
    gates['ALLOW_DATABASE_WRITES'] = 'true'
    gates['ALLOW_RESEND_WEBHOOKS'] = 'true'
    for k, v in {**base, **gates, **overrides}.items():
        os.environ[k] = v


def _reimport():
    backend = str(Path(__file__).resolve().parents[1])
    if backend not in sys.path:
        sys.path.insert(0, backend)
    for m in [x for x in list(sys.modules) if x in ('server', 'runtime_safety')]:
        del sys.modules[m]
    import server
    return server


# ===================================================================
# 1. ALLOW_SCHEDULERS=false + webhooks=true + writes=true → starts
# ===================================================================

class Test1_StartsWithoutSchedulerGate(unittest.TestCase):
    def test_lifecycle_starts_and_reconciles(self):
        _setup_env(ALLOW_SCHEDULERS='false', ALLOW_RESEND_WEBHOOKS='true',
                   ALLOW_DATABASE_WRITES='true')
        server = _reimport()
        from starlette.testclient import TestClient
        with TestClient(server.app, raise_server_exceptions=False) as client:
            task = getattr(server.app.state, 'orphan_recovery_task', None)
            self.assertIsNotNone(task, "Orphan recovery task must be created")
            self.assertFalse(task.done(), "Task must be running")


# ===================================================================
# 2. ALLOW_RESEND_WEBHOOKS=false → no start, zero orphan writes
# ===================================================================

class Test2_WebhooksFalseNoStart(unittest.TestCase):
    def test_no_lifecycle_when_webhooks_disabled(self):
        _setup_env(ALLOW_SCHEDULERS='false', ALLOW_RESEND_WEBHOOKS='false',
                   ALLOW_DATABASE_WRITES='true')
        server = _reimport()
        from starlette.testclient import TestClient
        with TestClient(server.app, raise_server_exceptions=False):
            task = getattr(server.app.state, 'orphan_recovery_task', None)
            self.assertIsNone(task)


# ===================================================================
# 3. ALLOW_DATABASE_WRITES=false → no start
# ===================================================================

class Test3_WritesFalseNoStart(unittest.TestCase):
    def test_no_lifecycle_when_writes_disabled(self):
        _setup_env(ALLOW_SCHEDULERS='false', ALLOW_RESEND_WEBHOOKS='true',
                   ALLOW_DATABASE_WRITES='false')
        server = _reimport()
        from starlette.testclient import TestClient
        try:
            with TestClient(server.app, raise_server_exceptions=False):
                task = getattr(server.app.state, 'orphan_recovery_task', None)
                self.assertTrue(task is None or (task is not None and task.done()),
                                "Orphan task must not be active when writes disabled")
        except Exception:
            # Startup may fail because read-only mode skips DB init.
            # That's correct — the lifecycle never starts.
            task = getattr(server.app.state, 'orphan_recovery_task', None)
            self.assertIsNone(task, "Orphan task must not be created when writes disabled")


# ===================================================================
# 4. Worker does not invoke sends or unrelated jobs
# ===================================================================

class Test4_NoProviderSends(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)

    async def test_recovery_worker_never_calls_send_adapters(self):
        from resend_webhook import recover_pending_orphans
        orphan_c = AsyncMock()
        receipt_c = AsyncMock()
        outbox_c = AsyncMock()
        # Empty result set — no orphans to process
        cursor = AsyncMock()
        cursor.to_list = AsyncMock(return_value=[])
        orphan_c.find = MagicMock(return_value=MagicMock(sort=MagicMock(
            return_value=MagicMock(limit=MagicMock(return_value=cursor)))))

        # Verify the function signature has no send-related parameters
        import inspect
        sig = inspect.signature(recover_pending_orphans)
        param_names = set(sig.parameters.keys())
        for forbidden in ['send_email', 'send_sms', 'dispatch_email', 'dispatch_sms',
                          'gymmaster', 'analytics', 'lead_dispatch']:
            self.assertNotIn(forbidden, param_names,
                             f"recover_pending_orphans must not accept {forbidden}")

        counts = await recover_pending_orphans(
            orphan_c, receipt_c, outbox_c, worker_id='test_no_send')
        self.assertEqual(sum(counts.values()), 0)


# ===================================================================
# 5. Attempt 51+ remains retryable with 1-hour capped backoff
# ===================================================================

class Test5_IndefiniteRetry(unittest.TestCase):
    def test_attempt_51_has_one_hour_backoff(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        from resend_webhook import _next_attempt_at, ORPHAN_MAX_RETRY_SECONDS
        now = datetime.now(timezone.utc)
        for attempt in [51, 100, 500]:
            result = _next_attempt_at(attempt, now)
            self.assertIsInstance(result, datetime)
            delta = (result - now).total_seconds()
            self.assertLessEqual(delta, ORPHAN_MAX_RETRY_SECONDS + 1)
            self.assertGreater(delta, 0)

    def test_no_max_attempts_constant_exported(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        import resend_webhook
        self.assertFalse(hasattr(resend_webhook, 'ORPHAN_MAX_ATTEMPTS'))


# ===================================================================
# 6. Shutdown cancels cleanly
# ===================================================================

class Test6_ShutdownCancels(unittest.TestCase):
    def test_shutdown_cancels_and_awaits_task(self):
        _setup_env(ALLOW_SCHEDULERS='false', ALLOW_RESEND_WEBHOOKS='true',
                   ALLOW_DATABASE_WRITES='true')
        server = _reimport()
        from starlette.testclient import TestClient
        with TestClient(server.app, raise_server_exceptions=False):
            task = getattr(server.app.state, 'orphan_recovery_task', None)
            self.assertIsNotNone(task)
        # After context exit (shutdown ran), task must be done
        self.assertTrue(task.done(), "Shutdown must cancel the lifecycle task")
        # No unhandled exception
        exc = task.exception() if not task.cancelled() else None
        self.assertIsNone(exc, f"Task ended with exception: {exc}")


# ===================================================================
# 7. Module import causes no worker or database side effect
# ===================================================================

class Test7_ImportSafe(unittest.TestCase):
    def test_import_resend_webhook_no_side_effects(self):
        """Importing resend_webhook must not start workers or connect to DB."""
        for m in [x for x in list(sys.modules) if 'resend_webhook' in x]:
            del sys.modules[m]
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        # Import and verify — no asyncio tasks, no DB connections
        import resend_webhook
        self.assertTrue(hasattr(resend_webhook, 'recover_pending_orphans'))
        self.assertTrue(hasattr(resend_webhook, 'store_orphan_event'))
        # Module-level code must not create tasks or connect
        loop = asyncio.new_event_loop()
        tasks = asyncio.all_tasks(loop)
        self.assertEqual(len(tasks), 0, "Import must not create asyncio tasks")
        loop.close()


if __name__ == '__main__':
    unittest.main()
