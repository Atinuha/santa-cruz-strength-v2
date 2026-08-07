"""The write gate, exercised at the HTTP seam rather than at the flag.

test_runtime_safety asserts the ALLOW_* flags default to False. That is
necessary and not sufficient: a flag nobody consults protects nothing. These
tests assert the guarantee the project actually depends on, which is that a
process holding real provider credentials still cannot mutate anything or
start a scheduler.

This is the acceptance evidence for convergence ticket T-1 (spec A-1 and A-2).
If someone removes the middleware or the startup guard, these fail.
"""

import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Credentials deliberately look real. Supplying a key must never be sufficient
# to send, which is safety invariant SI-3.
SAFE_ENV = {
    'MONGO_URL': 'mongodb://localhost:27017',
    'DB_NAME': 'scs_write_gate_test',
    'FRONTEND_URL': 'http://localhost:3000',
    'CORS_ORIGINS': 'http://localhost:3000',
    'TWILIO_ACCOUNT_SID': 'ACtestonlytestonlytestonlytest',
    'TWILIO_AUTH_TOKEN': 'testonlytestonlytestonlytest',
    'TWILIO_PHONE_NUMBER': '+15550001111',
    'RESEND_API_KEY': 're_testonly_testonly',
    'JWT_SECRET': 'x' * 40,
    'UNSUBSCRIBE_SECRET': 'y' * 40,
}


def _load_app():
    """Import the app with credentials present and every gate at its default."""
    for key, value in SAFE_ENV.items():
        os.environ[key] = value
    for key in [k for k in os.environ if k.startswith('ALLOW_')]:
        del os.environ[key]
    for module in [m for m in list(sys.modules) if m in ('server', 'runtime_safety')]:
        del sys.modules[module]
    import server  # noqa: E402
    return server


class WriteGateHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            from fastapi.testclient import TestClient
        except ImportError:  # pragma: no cover
            raise unittest.SkipTest('fastapi test client is unavailable')
        cls.server = _load_app()
        cls.client_factory = TestClient

    def test_mutating_requests_are_refused_with_credentials_present(self):
        # No datastore is running. If any of these reached a handler, the test
        # would hang or error rather than return 503, which is itself the point.
        with self.client_factory(self.server.app) as client:
            for method, path in (
                ('POST', '/api/leads'),
                ('POST', '/api/corporate-leads'),
                ('POST', '/api/webhooks/twilio-sms'),
                ('POST', '/api/auth/login'),
            ):
                with self.subTest(path=path):
                    response = client.request(method, path, json={'email': 'a@example.com'})
                    self.assertEqual(response.status_code, 503)
                    self.assertEqual(response.json().get('code'), 'database_writes_disabled')

    def test_startup_starts_no_scheduler_and_needs_no_datastore(self):
        with self.client_factory(self.server.app):
            scheduler = getattr(self.server.app.state, 'scheduler', None)
            self.assertIsNone(
                scheduler,
                'A scheduler was started while writes are disabled. Two of these '
                'jobs send real messages.',
            )


if __name__ == '__main__':
    unittest.main()
