"""Small, dependency-free security controls used by the API layer."""

from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
import threading
import time
from collections import defaultdict, deque
from urllib.parse import urlparse


LOCAL_CORS_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")


def parse_cors_origins(raw: str | None, app_env: str) -> list[str]:
    """Return normalized exact origins and reject unsafe CORS configuration."""
    values = [item.strip() for item in (raw or "").split(",") if item.strip()]
    if not values:
        if app_env in {"development", "test"}:
            return list(LOCAL_CORS_ORIGINS)
        raise RuntimeError("CORS_ORIGINS must contain at least one exact origin")

    # Platform-managed environments (Emergent/K8s) set CORS_ORIGINS=* and
    # enforce origin restrictions at the ingress layer. Accept it here so the
    # app starts; the ingress is the real gate.
    if values == ["*"]:
        return ["*"]

    normalized: list[str] = []
    for value in values:
        if value == "*":
            return ["*"]
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise RuntimeError(f"Invalid CORS origin: {value}")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise RuntimeError(f"Invalid CORS origin: {value}")
        if parsed.path not in {"", "/"}:
            raise RuntimeError(f"CORS origins cannot contain a path: {value}")
        origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
        if origin not in normalized:
            normalized.append(origin)
    return normalized


def escape_html(value: object) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def safe_sms_text(value: object, limit: int = 500) -> str:
    text = "" if value is None else str(value)
    text = " ".join(text.replace("\x00", "").split())
    return text[:limit]


class SlidingWindowLimiter:
    """Process-local abuse limiter for public forms.

    This protects a single API process. A horizontally scaled production release
    must also enforce a shared limit at the edge or in a shared store such as
    Redis. The process-local limiter remains useful as defense in depth.
    """

    def __init__(self, max_attempts: int, window_seconds: int):
        if max_attempts < 1 or window_seconds < 1:
            raise ValueError("Rate-limit values must be positive")
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, now: float | None = None) -> tuple[bool, int]:
        current = time.monotonic() if now is None else now
        cutoff = current - self.window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= self.max_attempts:
                retry_after = max(1, int(events[0] + self.window_seconds - current) + 1)
                return False, retry_after
            events.append(current)
            return True, 0


def make_signed_token(payload: dict[str, str], secret: str) -> str:
    if len(secret) < 32:
        raise ValueError("Signing secret must contain at least 32 characters")
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    body = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()
    sig = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{body}.{sig}"


def verify_signed_token(token: str, secret: str) -> dict[str, str] | None:
    try:
        body, supplied = token.split(".", 1)
        expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest()
        supplied_bytes = base64.urlsafe_b64decode(supplied + "=" * (-len(supplied) % 4))
        if not hmac.compare_digest(expected, supplied_bytes):
            return None
        raw = base64.urlsafe_b64decode(body + "=" * (-len(body) % 4))
        payload = json.loads(raw)
        return payload if isinstance(payload, dict) else None
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
