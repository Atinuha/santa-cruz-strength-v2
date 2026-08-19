"""Tests for the production environment validator script.

Runs validate-production-env.mjs as a subprocess with controlled env vars
and asserts exit codes. Positive cases must exit 0; negative cases must
exit non-zero. This covers: matching origins, preview hostname, loopback,
credentials, path/query/fragment, mismatched origins, missing/empty, and
http-only.
"""

import os
import subprocess
import unittest
from pathlib import Path

SCRIPT = str(Path(__file__).resolve().parents[2] / 'frontend' / 'scripts' / 'validate-production-env.mjs')

PROD_ORIGIN = 'https://santacruzstrength.com'
PROD_ALT = 'https://crm-staff-portal-1.emergent.host'
PREVIEW = 'https://crm-staff-portal-1.preview.emergentagent.com'


def _run(backend_url, prerender_url):
    """Run the validator script and return exit code."""
    env = {**os.environ, 'REACT_APP_BACKEND_URL': backend_url, 'PRERENDER_API_URL': prerender_url}
    result = subprocess.run(
        ['node', SCRIPT],
        env=env, capture_output=True, text=True,
    )
    return result.returncode


class TestProductionEnvValidator(unittest.TestCase):

    # ---------- Positive: approved production origins ----------

    def test_both_match_production_origin(self):
        self.assertEqual(_run(PROD_ORIGIN, PROD_ORIGIN), 0)

    def test_both_match_alternate_production_origin(self):
        self.assertEqual(_run(PROD_ALT, PROD_ALT), 0)

    # ---------- Negative: preview hostname ----------

    def test_both_preview_rejected(self):
        self.assertNotEqual(_run(PREVIEW, PREVIEW), 0)

    def test_prerender_preview_rejected(self):
        self.assertNotEqual(_run(PROD_ORIGIN, PREVIEW), 0)

    def test_backend_preview_rejected(self):
        self.assertNotEqual(_run(PREVIEW, PROD_ORIGIN), 0)

    # ---------- Negative: loopback ----------

    def test_localhost_rejected(self):
        self.assertNotEqual(_run('https://localhost', 'https://localhost'), 0)

    def test_127_rejected(self):
        self.assertNotEqual(_run('https://127.0.0.1', 'https://127.0.0.1'), 0)

    def test_ipv6_loopback_rejected(self):
        self.assertNotEqual(_run('https://[::1]', 'https://[::1]'), 0)

    # ---------- Negative: credentials ----------

    def test_backend_credentials_rejected(self):
        self.assertNotEqual(_run('https://user:pass@prod.example.com', PROD_ORIGIN), 0)

    def test_prerender_credentials_rejected(self):
        self.assertNotEqual(_run(PROD_ORIGIN, 'https://user:pass@prod.example.com'), 0)

    # ---------- Negative: path, query, fragment ----------

    def test_backend_path_rejected(self):
        self.assertNotEqual(_run(PROD_ORIGIN + '/api', PROD_ORIGIN), 0)

    def test_prerender_query_rejected(self):
        self.assertNotEqual(_run(PROD_ORIGIN, PROD_ORIGIN + '?key=val'), 0)

    def test_backend_fragment_rejected(self):
        self.assertNotEqual(_run(PROD_ORIGIN + '#frag', PROD_ORIGIN), 0)

    # ---------- Negative: mismatched origins ----------

    def test_mismatched_origins_rejected(self):
        self.assertNotEqual(_run(PROD_ORIGIN, PROD_ALT), 0)

    def test_completely_different_origins_rejected(self):
        self.assertNotEqual(_run('https://a.example.com', 'https://b.example.com'), 0)

    # ---------- Negative: missing / empty ----------

    def test_empty_backend_rejected(self):
        self.assertNotEqual(_run('', PROD_ORIGIN), 0)

    def test_empty_prerender_rejected(self):
        self.assertNotEqual(_run(PROD_ORIGIN, ''), 0)

    # ---------- Negative: http (not https) ----------

    def test_http_rejected(self):
        self.assertNotEqual(_run('http://prod.example.com', 'http://prod.example.com'), 0)


if __name__ == '__main__':
    unittest.main()
