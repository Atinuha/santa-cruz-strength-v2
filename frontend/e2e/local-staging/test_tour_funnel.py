#!/usr/bin/env python3
"""Real-browser checks for the local Santa Cruz Strength tour funnel.

The harness fails before navigation unless both configured origins are local.
Every non-loopback browser request is aborted. The only identity used by the
form is synthetic and belongs to the reserved .invalid top-level domain.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from playwright.async_api import BrowserContext, Page, TimeoutError as PlaywrightTimeoutError, async_playwright

from local_urls import is_loopback_request_url, require_loopback_origin


SYNTHETIC_IDENTITY = {
    "first_name": "Nova",
    "last_name": "LocalTest",
    "phone": "8315550100",
    "email": "scs-local-tour@example.invalid",
}
REQUEST_IDS = {
    "desktop": str(uuid.uuid4()),
    "mobile": str(uuid.uuid4()),
}
PUBLIC_CTA_ROUTES = (
    "/",
    "/about",
    "/personal-training",
    "/blog",
    "/join",
    "/events",
    "/not-a-real-page",
)
TOUR_TEXT = re.compile(
    r"(?:book|request|open|see).{0,36}(?:tour|visit|room)|(?:tour|visit|room).{0,36}(?:book|request|open|see)",
    re.IGNORECASE,
)


@dataclass
class Evidence:
    frontend_url: str
    backend_url: str
    checks: list[dict[str, Any]] = field(default_factory=list)
    violations: list[str] = field(default_factory=list)
    blocked_external_origins: list[str] = field(default_factory=list)
    lead_requests: list[dict[str, Any]] = field(default_factory=list)

    def check(self, name: str, passed: bool, detail: str) -> None:
        self.checks.append({"name": name, "passed": passed, "detail": detail})
        if not passed:
            self.violations.append(f"{name}: {detail}")


def origin(value: str) -> str:
    parsed = urlparse(value)
    return f"{parsed.scheme}://{parsed.netloc}"


async def wait_for_service(url: str, label: str) -> None:
    import urllib.request

    def fetch() -> int:
        with urllib.request.urlopen(url, timeout=5) as response:
            return response.status

    try:
        status = await asyncio.to_thread(fetch)
    except Exception as exc:
        raise RuntimeError(f"{label} is not reachable at {url}: {exc}") from exc
    if status >= 500:
        raise RuntimeError(f"{label} returned HTTP {status} from {url}")


async def install_network_guard(
    context: BrowserContext,
    evidence: Evidence,
    delayed_lead: dict[str, Any] | None = None,
) -> None:
    async def guard(route) -> None:
        request = route.request
        request_url = request.url
        parsed = urlparse(request_url)

        if parsed.scheme in {"http", "https"} and not is_loopback_request_url(request_url):
            external_origin = origin(request_url)
            if external_origin not in evidence.blocked_external_origins:
                evidence.blocked_external_origins.append(external_origin)
            await route.abort("blockedbyclient")
            return

        is_lead = (
            delayed_lead is not None
            and request.method == "POST"
            and origin(request_url) == evidence.backend_url
            and parsed.path == "/api/v1/leads"
        )
        if not is_lead:
            await route.continue_()
            return

        payload = request.post_data_json
        delayed_lead["request_count"] += 1
        delayed_lead["payloads"].append(payload)
        delayed_lead["started"].set()
        await delayed_lead["release"].wait()

        response = await route.fetch()
        body = await response.json()
        delayed_lead["responses"].append(body)
        await route.fulfill(response=response)

    await context.route("**/*", guard)


async def check_ctas(browser, evidence: Evidence, viewport: dict[str, int]) -> None:
    context = await browser.new_context(viewport=viewport)
    await install_network_guard(context, evidence)
    page = await context.new_page()
    found = 0

    for route_path in PUBLIC_CTA_ROUTES:
        await page.goto(f"{evidence.frontend_url}{route_path}", wait_until="domcontentloaded")
        await page.locator("body").wait_for()
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except PlaywrightTimeoutError:
            # A development WebSocket can keep the load state busy. The CTA
            # inventory below still reads the rendered DOM and stays decisive.
            pass
        anchors = page.locator("a")
        for index in range(await anchors.count()):
            anchor = anchors.nth(index)
            text = " ".join((await anchor.inner_text()).split())
            if not TOUR_TEXT.search(text):
                continue
            found += 1
            href = await anchor.get_attribute("href") or ""
            resolved = urlparse(await anchor.evaluate("element => element.href"))
            valid = (
                resolved.scheme in {"http", "https"}
                and origin(resolved.geturl()) == evidence.frontend_url
                and resolved.path == "/contact"
                and resolved.fragment == "tour-request"
            )
            evidence.check(
                f"tour CTA {route_path} #{index + 1}",
                valid,
                f"{text!r} resolves from {href!r} to {resolved.path}#{resolved.fragment}",
            )

    evidence.check("important tour CTA inventory", found > 0, f"checked {found} rendered tour CTAs")

    await page.goto(f"{evidence.frontend_url}/", wait_until="domcontentloaded")
    await page.get_by_test_id("home-hero-book-visit-button").click()
    await page.wait_for_url(re.compile(r"/contact#tour-request$"), timeout=10000)
    clicked_target = page.locator("#tour-request")
    await clicked_target.wait_for(state="visible")
    evidence.check(
        "home hero CTA click reaches tour form",
        urlparse(page.url).path == "/contact"
        and urlparse(page.url).fragment == "tour-request"
        and await clicked_target.count() == 1,
        f"browser reached {page.url}",
    )
    await context.close()


async def complete_quiz(page: Page) -> None:
    await page.locator("#tour-first-name").fill(SYNTHETIC_IDENTITY["first_name"])
    await page.locator("#tour-last-name").fill(SYNTHETIC_IDENTITY["last_name"])
    await page.locator("#tour-phone").fill(SYNTHETIC_IDENTITY["phone"])
    await page.locator("#tour-email").fill(SYNTHETIC_IDENTITY["email"])
    await page.get_by_test_id("lead-form-submit-button").click()
    await page.get_by_role("button", name="General membership").click()
    await page.get_by_role("button", name="Ready now").click()
    await page.get_by_test_id("lead-form-submit-button").click()
    await page.get_by_test_id("lead-form-goals-textarea").fill("Synthetic local staging tour test only.")


async def check_form(browser, evidence: Evidence, label: str, viewport: dict[str, int]) -> None:
    expected_request_id = REQUEST_IDS[label]
    context = await browser.new_context(viewport=viewport)
    await context.add_init_script(
        f"Object.defineProperty(globalThis.crypto, 'randomUUID', {{ value: () => '{expected_request_id}' }});"
    )
    delayed = {
        "request_count": 0,
        "payloads": [],
        "responses": [],
        "started": asyncio.Event(),
        "release": asyncio.Event(),
    }
    await install_network_guard(context, evidence, delayed)
    page = await context.new_page()
    await page.goto(f"{evidence.frontend_url}/contact#tour-request", wait_until="domcontentloaded")
    target = page.locator("#tour-request")
    evidence.check(f"{label} anchor target exists", await target.count() == 1, "#tour-request is present")
    await page.wait_for_function(
        """() => {
          const target = document.getElementById('tour-request');
          if (!target) return false;
          const box = target.getBoundingClientRect();
          return box.top < window.innerHeight && box.bottom > 0;
        }""",
        timeout=5000,
    )
    evidence.check(
        f"{label} anchor target is visible",
        True,
        "hash navigation placed the tour request section in the viewport",
    )

    await complete_quiz(page)
    submit = page.get_by_test_id("lead-form-submit-button")
    await submit.evaluate("element => { element.click(); element.click(); }")
    await asyncio.wait_for(delayed["started"].wait(), timeout=10)
    await page.get_by_text("Sending request...").wait_for(state="visible")

    evidence.check(
        f"{label} no premature success",
        urlparse(page.url).path == "/contact" and await page.get_by_test_id("thank-you").count() == 0,
        f"held response while browser remained at {page.url}",
    )
    evidence.check(
        f"{label} rapid double submit",
        delayed["request_count"] == 1,
        f"observed {delayed['request_count']} POST requests before acceptance",
    )

    delayed["release"].set()
    await page.wait_for_url(re.compile(r"/thank-you$"), timeout=15000)
    await page.get_by_test_id("thank-you").wait_for(state="visible")

    payload = delayed["payloads"][0] if delayed["payloads"] else {}
    response = delayed["responses"][0] if delayed["responses"] else {}
    evidence.lead_requests.append({
        "viewport": label,
        "request_id": payload.get("request_id"),
        "email": payload.get("email"),
        "response_status": response.get("status"),
        "response_request_id": response.get("request_id"),
        "duplicate": response.get("duplicate", False),
    })
    accepted = (
        delayed["request_count"] == 1
        and payload.get("request_id") == expected_request_id
        and payload.get("email") == SYNTHETIC_IDENTITY["email"]
        and response.get("status") == "accepted"
        and response.get("request_id") == payload.get("request_id")
        and bool(response.get("lead_id"))
    )
    evidence.check(
        f"{label} matching accepted response",
        accepted,
        f"request {payload.get('request_id')} received {response.get('status')} for {response.get('request_id')}",
    )
    evidence.check(
        f"{label} confirmed thank-you",
        await page.get_by_text("Thanks. Your tour request is saved.").count() == 1,
        f"confirmed view rendered at {page.url}",
    )
    await context.close()


async def check_direct_thank_you(browser, evidence: Evidence) -> None:
    context = await browser.new_context(viewport={"width": 1280, "height": 900})
    await install_network_guard(context, evidence)
    page = await context.new_page()
    await page.goto(f"{evidence.frontend_url}/thank-you", wait_until="domcontentloaded")
    unconfirmed = page.get_by_test_id("thank-you-unconfirmed")
    evidence.check(
        "direct thank-you is unconfirmed",
        await unconfirmed.count() == 1 and await page.get_by_test_id("thank-you").count() == 0,
        "direct navigation cannot manufacture lead acceptance",
    )
    link = unconfirmed.locator('a[href="/contact#tour-request"]')
    evidence.check(
        "unconfirmed recovery link",
        await link.count() == 1,
        "unconfirmed page links to /contact#tour-request",
    )
    await context.close()


async def run(args) -> int:
    frontend_url = require_loopback_origin(args.frontend_url, "frontend URL")
    backend_url = require_loopback_origin(args.backend_url, "backend URL")
    if frontend_url == backend_url:
        raise RuntimeError("frontend and backend must use different loopback origins")

    await wait_for_service(frontend_url, "frontend")
    await wait_for_service(f"{backend_url}/api/health", "backend health")
    evidence = Evidence(frontend_url=frontend_url, backend_url=backend_url)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            await check_ctas(browser, evidence, {"width": 1440, "height": 1000})
            await check_form(browser, evidence, "desktop", {"width": 1440, "height": 1000})
            await check_form(browser, evidence, "mobile", {"width": 390, "height": 844})
            await check_direct_thank_you(browser, evidence)
        finally:
            await browser.close()

    evidence.blocked_external_origins = sorted(set(evidence.blocked_external_origins))
    output_dir = Path(args.evidence_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "frontend-browser-evidence.json"
    output_path.write_text(json.dumps(asdict(evidence), indent=2) + "\n", encoding="utf-8")

    passed = sum(1 for check in evidence.checks if check["passed"])
    print(f"[browser-e2e] {passed}/{len(evidence.checks)} checks passed")
    print(f"[browser-e2e] blocked external origins: {len(evidence.blocked_external_origins)}")
    print(f"[browser-e2e] evidence: {output_path}")
    if evidence.violations:
        for violation in evidence.violations:
            print(f"[browser-e2e] FAIL: {violation}", file=sys.stderr)
        return 1
    return 0


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--frontend-url", default=os.environ.get("SCS_FRONTEND_URL", "http://127.0.0.1:4173"))
    parser.add_argument("--backend-url", default=os.environ.get("SCS_BACKEND_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--evidence-dir", default=os.environ.get("SCS_EVIDENCE_DIR", "/tmp/scs-local-staging"))
    return parser.parse_args()


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(run(parse_args())))
    except Exception as exc:
        print(f"[browser-e2e] BLOCKED: {exc}", file=sys.stderr)
        raise SystemExit(2)
