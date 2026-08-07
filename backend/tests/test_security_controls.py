import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from security_controls import (  # noqa: E402
    SlidingWindowLimiter,
    escape_html,
    make_signed_token,
    parse_cors_origins,
    safe_sms_text,
    verify_signed_token,
)


class SecurityControlTests(unittest.TestCase):
    def test_cors_rejects_wildcard_and_non_origin_values(self):
        for value in ('*', 'https://example.com/path', 'https://user:pass@example.com', 'http://localhost:3000'):
            with self.assertRaises(RuntimeError):
                parse_cors_origins(value, 'production')

    def test_cors_normalizes_and_deduplicates_exact_origins(self):
        self.assertEqual(
            parse_cors_origins('https://example.com/, https://example.com', 'production'),
            ['https://example.com'],
        )
        self.assertEqual(
            parse_cors_origins(None, 'test'),
            ['http://localhost:3000', 'http://127.0.0.1:3000'],
        )

    def test_sliding_window_limiter_is_keyed_and_returns_retry_after(self):
        limiter = SlidingWindowLimiter(max_attempts=2, window_seconds=10)
        self.assertEqual(limiter.check('one', now=100), (True, 0))
        self.assertEqual(limiter.check('one', now=101), (True, 0))
        allowed, retry_after = limiter.check('one', now=102)
        self.assertFalse(allowed)
        self.assertGreater(retry_after, 0)
        self.assertEqual(limiter.check('two', now=102), (True, 0))
        self.assertEqual(limiter.check('one', now=111), (True, 0))

    def test_html_and_sms_sanitizers(self):
        self.assertEqual(
            escape_html('<img src=x onerror="alert(1)">'),
            '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
        )
        self.assertEqual(safe_sms_text('hello\nworld\x00'), 'hello world')

    def test_signed_token_rejects_tampering(self):
        secret = 's' * 32
        token = make_signed_token({'lead_id': 'abc', 'email': 'person@example.com'}, secret)
        self.assertEqual(
            verify_signed_token(token, secret),
            {'lead_id': 'abc', 'email': 'person@example.com'},
        )
        self.assertIsNone(verify_signed_token(token + 'x', secret))
        with self.assertRaises(ValueError):
            make_signed_token({'lead_id': 'abc'}, 'short')


if __name__ == '__main__':
    unittest.main()
