#!/usr/bin/env python3
"""Verify that the local prerender wrote real route bodies."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = re.compile(r'<div id="root">([\s\S]*?)<script id="scs-preload">')
H1 = re.compile(r"<h1\b", re.IGNORECASE)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frontend-root", required=True)
    args = parser.parse_args()
    frontend_root = Path(args.frontend_root).resolve()
    build_root = frontend_root / "build"
    registry = json.loads((frontend_root / "src/seo/route-metadata.json").read_text(encoding="utf-8"))
    failures = []

    for route in registry["routes"]:
        route_path = route["path"]
        shell = build_root / "index.html" if route_path == "/" else build_root / route_path.lstrip("/") / "index.html"
        if not shell.exists():
            failures.append(f"{route_path}: missing shell")
            continue
        html = shell.read_text(encoding="utf-8")
        match = ROOT.search(html)
        if not match or len(re.sub(r"<[^>]+>", "", match.group(1)).strip()) < 80:
            failures.append(f"{route_path}: root body is missing or too small")
        if 'id="scs-preload"' not in html:
            failures.append(f"{route_path}: missing preload payload")
        if not H1.search(match.group(1) if match else ""):
            failures.append(f"{route_path}: no rendered h1")

    contact = (build_root / "contact/index.html").read_text(encoding="utf-8")
    if 'id="tour-request"' not in contact or "Request Your Free Facility Tour" not in contact:
        failures.append("/contact: tour request content is not prerendered")

    if failures:
        for failure in failures:
            print(f"[prerender-verify] FAIL: {failure}")
        return 1
    print(f"[prerender-verify] {len(registry['routes'])} route bodies contain rendered content and preload data")
    print("[prerender-verify] /contact contains the rendered tour request section")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
