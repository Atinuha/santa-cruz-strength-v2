#!/usr/bin/env python3
"""Shared fail-closed URL checks for local Santa Cruz staging tools."""

from __future__ import annotations

import argparse
import ipaddress
import sys
from urllib.parse import urlparse


class LocalUrlError(ValueError):
    pass


def require_loopback_origin(value: str, label: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"}:
        raise LocalUrlError(f"{label} must use http or https")
    if not parsed.hostname or parsed.username or parsed.password:
        raise LocalUrlError(f"{label} must be an origin without credentials")
    if parsed.path not in {"", "/"} or parsed.params or parsed.query or parsed.fragment:
        raise LocalUrlError(f"{label} must be an origin without a path, query, or fragment")

    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost":
        pass
    else:
        try:
            if not ipaddress.ip_address(hostname).is_loopback:
                raise LocalUrlError(f"{label} must use a loopback host")
        except ValueError as exc:
            if isinstance(exc, LocalUrlError):
                raise
            raise LocalUrlError(f"{label} must use localhost or a loopback IP address") from exc

    if "emergentagent.com" in hostname or hostname.endswith(".preview"):
        raise LocalUrlError(f"{label} cannot use an Emergent or preview host")
    if parsed.port is None:
        raise LocalUrlError(f"{label} must include an explicit local port")

    return value.strip().rstrip("/")


def is_loopback_request_url(value: str) -> bool:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        return True
    if not parsed.hostname:
        return False
    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost":
        return True
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--label", default="URL")
    args = parser.parse_args()
    try:
        print(require_loopback_origin(args.url, args.label))
        return 0
    except LocalUrlError as exc:
        print(f"[local-url] FAIL: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
