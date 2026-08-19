import importlib
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend import runtime_safety


class RuntimeSafetyTests(unittest.TestCase):
    def load_safety(self, **values):
        patcher = patch.dict(os.environ, values, clear=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        return importlib.reload(runtime_safety)

    def test_defaults_are_fail_closed(self):
        safety = self.load_safety()

        self.assertEqual(safety.APP_ENV, 'development')
        self.assertFalse(safety.ALLOW_DATABASE_WRITES)
        self.assertFalse(safety.ALLOW_SCHEDULERS)
        self.assertFalse(safety.ALLOW_EMAIL_SENDS)
        self.assertFalse(safety.ALLOW_SMS_SENDS)
        self.assertFalse(safety.ALLOW_TWILIO_WEBHOOKS)
        self.assertFalse(safety.ALLOW_RESEND_WEBHOOKS)

    def test_staging_outbound_requires_test_mode(self):
        safety = self.load_safety(APP_ENV='staging', ALLOW_SMS_SENDS='true')

        with self.assertRaisesRegex(RuntimeError, 'OUTBOUND_TEST_MODE'):
            safety.validate_runtime_safety('santa_cruz_staging')

    def test_production_requires_explicit_approval(self):
        safety = self.load_safety(APP_ENV='production')

        with self.assertRaisesRegex(RuntimeError, 'PRODUCTION_CHANGES_APPROVED'):
            safety.validate_runtime_safety('santa_cruz_production')

    def test_nonproduction_writes_require_safe_database_name(self):
        safety = self.load_safety(APP_ENV='preview', ALLOW_DATABASE_WRITES='true')

        with self.assertRaisesRegex(RuntimeError, 'safe environment marker'):
            safety.validate_runtime_safety('santa_cruz_members')

        safety.validate_runtime_safety('santa_cruz_preview')

    def test_remote_nonproduction_database_requires_explicit_gate(self):
        safety = self.load_safety(APP_ENV='staging', ALLOW_DATABASE_WRITES='true')

        with self.assertRaisesRegex(RuntimeError, 'ALLOW_REMOTE_NONPROD_DATABASE'):
            safety.validate_runtime_safety('santa_cruz_staging', 'mongodb+srv://example.invalid/santa_cruz_staging')

        safety.validate_runtime_safety('santa_cruz_staging', 'mongodb://127.0.0.1:27017/santa_cruz_staging')

    def test_nonproduction_sms_requires_allowlist(self):
        safety = self.load_safety(
            APP_ENV='staging',
            ALLOW_SMS_SENDS='true',
            OUTBOUND_TEST_MODE='true',
        )

        with self.assertRaisesRegex(RuntimeError, 'TEST_SMS_ALLOWLIST'):
            safety.validate_runtime_safety('santa_cruz_staging')

    def test_test_recipient_must_be_allowlisted(self):
        safety = self.load_safety(
            APP_ENV='staging',
            TEST_SMS_ALLOWLIST='+14085550123',
        )

        self.assertTrue(safety.outbound_recipient_allowed('sms', '+14085550123'))
        self.assertFalse(safety.outbound_recipient_allowed('sms', '+14085550124'))

    def test_twilio_webhooks_require_test_mode_allowlist_and_verified_config(self):
        safety = self.load_safety(APP_ENV='staging', ALLOW_TWILIO_WEBHOOKS='true')
        with self.assertRaisesRegex(RuntimeError, 'OUTBOUND_TEST_MODE'):
            safety.validate_runtime_safety('santa_cruz_staging')

        safety = self.load_safety(
            APP_ENV='staging', ALLOW_TWILIO_WEBHOOKS='true', OUTBOUND_TEST_MODE='true',
            TEST_SMS_ALLOWLIST='+14085550123', TWILIO_AUTH_TOKEN='secret',
            TWILIO_WEBHOOK_BASE_URL='https://preview.example.com',
        )
        safety.validate_runtime_safety('santa_cruz_staging')

    def test_resend_webhooks_require_writes_and_a_separate_signing_secret(self):
        safety = self.load_safety(APP_ENV='staging', ALLOW_RESEND_WEBHOOKS='true')
        with self.assertRaisesRegex(RuntimeError, 'database writes'):
            safety.validate_runtime_safety('santa_cruz_staging')

        safety = self.load_safety(
            APP_ENV='staging', ALLOW_RESEND_WEBHOOKS='true', ALLOW_DATABASE_WRITES='true',
        )
        with self.assertRaisesRegex(RuntimeError, 'RESEND_WEBHOOK_SECRET'):
            safety.validate_runtime_safety('santa_cruz_staging')

        safety = self.load_safety(
            APP_ENV='staging', ALLOW_RESEND_WEBHOOKS='true', ALLOW_DATABASE_WRITES='true',
            RESEND_WEBHOOK_SECRET='whsec_dGVzdC13ZWJob29rLXNlY3JldA==',
        )
        safety.validate_runtime_safety('santa_cruz_staging')

    def test_frontend_origin_is_required_and_normalized(self):
        safety = self.load_safety(APP_ENV='preview')

        with self.assertRaisesRegex(RuntimeError, 'must be configured'):
            safety.require_frontend_origin()

        self.assertEqual(
            safety.require_frontend_origin('https://scs-review.example/'),
            'https://scs-review.example',
        )

    def test_frontend_origin_rejects_unsafe_protected_values(self):
        safety = self.load_safety(APP_ENV='staging')
        invalid_values = (
            'http://scs-review.example',
            'https://localhost',
            'https://user:pass@scs-review.example',
            'https://scs-review.example/path',
            'https://scs-review.example?source=test',
            'https://*.example.com',
        )

        for value in invalid_values:
            with self.subTest(value=value), self.assertRaises(RuntimeError):
                safety.require_frontend_origin(value)

    def test_development_frontend_origin_can_use_local_http(self):
        safety = self.load_safety(APP_ENV='development')
        self.assertEqual(
            safety.require_frontend_origin('http://127.0.0.1:3000/'),
            'http://127.0.0.1:3000',
        )


if __name__ == '__main__':
    unittest.main()
