#!/usr/bin/env python3
"""Executable safety checks for browser-request URL classification."""

import unittest

from local_urls import is_loopback_request_url


class LoopbackRequestUrlTests(unittest.TestCase):
    def test_loopback_network_schemes_are_allowed(self):
        for value in (
            "http://127.0.0.1:4173/",
            "https://localhost:8000/api/health",
            "ws://127.0.0.1:4173/socket",
            "wss://[::1]:4173/socket",
        ):
            with self.subTest(value=value):
                self.assertTrue(is_loopback_request_url(value))

    def test_external_network_schemes_are_rejected(self):
        for value in (
            "https://example.com/",
            "wss://example.com/socket",
            "ws://192.0.2.1/socket",
            "ftp://127.0.0.1/file",
        ):
            with self.subTest(value=value):
                self.assertFalse(is_loopback_request_url(value))

    def test_safe_document_schemes_are_allowed(self):
        for value in ("about:blank", "data:text/plain,local", "blob:http://127.0.0.1:4173/id"):
            with self.subTest(value=value):
                self.assertTrue(is_loopback_request_url(value))


if __name__ == "__main__":
    unittest.main()
