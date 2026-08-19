"""Small, read-only readiness reporting for the public API."""

from __future__ import annotations


async def readiness_report(
    database,
    *,
    database_writes_enabled: bool,
    deploy_hook_enabled: bool,
) -> tuple[dict, bool]:
    """Report ready only when MongoDB is reachable and writes are authorized."""
    database_reachable = False
    try:
        response = await database.command("ping")
        database_reachable = isinstance(response, dict) and response.get("ok") == 1
    except Exception:
        # Connection errors can contain hosts or credentials. The public report
        # must expose only the readiness result, never exception text.
        database_reachable = False

    database_ready = database_reachable and bool(database_writes_enabled)

    report = {
        "status": "ready" if database_ready else "not_ready",
        "service": "ready",
        "database": "ready" if database_ready else "not_ready",
        "deploy_hook": bool(deploy_hook_enabled),
    }
    return report, database_ready
