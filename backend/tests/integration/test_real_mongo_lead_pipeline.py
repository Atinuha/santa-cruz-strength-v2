"""Real-Mongo acceptance proof for the public Santa Cruz tour lead pipeline.

This suite is local-only. It refuses credentials and non-loopback MongoDB hosts,
uses a unique disposable database, and starts the real FastAPI application with
every external capability disabled. Set ``SCS_LOCAL_MONGO_URL`` to run it.
"""

from __future__ import annotations

import ipaddress
import json
import os
import socket
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

from pymongo import MongoClient
from pymongo.uri_parser import parse_uri


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = REPOSITORY_ROOT / "backend"
MONGO_ENV_NAME = "SCS_LOCAL_MONGO_URL"


def _is_loopback_host(host: str) -> bool:
    candidate = str(host or "").strip().lower().strip("[]")
    if candidate == "localhost":
        return True
    try:
        return ipaddress.ip_address(candidate).is_loopback
    except ValueError:
        return False


def require_safe_local_mongo_url(raw_url: str) -> str:
    """Return a safe URL or refuse a route that could touch external data."""
    value = str(raw_url or "").strip()
    if not value:
        raise unittest.SkipTest(
            f"{MONGO_ENV_NAME} is not set; a real loopback MongoDB process is required"
        )
    if not value.startswith("mongodb://"):
        raise RuntimeError("Only a direct mongodb:// loopback URL is permitted")
    parsed = parse_uri(value, warn=True)
    if parsed.get("username") or parsed.get("password"):
        raise RuntimeError("The local acceptance URL must not contain credentials")
    nodes = parsed.get("nodelist") or []
    if not nodes or any(not _is_loopback_host(host) for host, _port in nodes):
        raise RuntimeError("Every MongoDB node must resolve from a loopback literal or localhost")
    options = {str(key).lower(): option for key, option in (parsed.get("options") or {}).items()}
    if str(options.get("w", "")).strip() == "0":
        raise RuntimeError("An unacknowledged w=0 connection is forbidden")
    return value


def _free_loopback_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def _http_json(
    base_url: str,
    method: str,
    path: str,
    *,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = 3.0,
) -> tuple[int, dict[str, Any]]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_headers = {"Accept": "application/json", **(headers or {})}
    if body is not None:
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        f"{base_url}{path}", data=body, headers=request_headers, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw_body = response.read().decode("utf-8")
            return int(response.status), json.loads(raw_body) if raw_body else {}
    except urllib.error.HTTPError as error:
        try:
            raw_body = error.read().decode("utf-8")
            return int(error.code), json.loads(raw_body) if raw_body else {}
        finally:
            error.close()


class BackendProcess:
    """Start one fail-closed local backend process and retain its output."""

    def __init__(self, mongo_url: str, database_name: str, writes_enabled: bool):
        self.mongo_url = mongo_url
        self.database_name = database_name
        self.writes_enabled = writes_enabled
        self.port = _free_loopback_port()
        self.base_url = f"http://127.0.0.1:{self.port}"
        self.process: subprocess.Popen[str] | None = None
        self.output = ""

    def _environment(self) -> dict[str, str]:
        environment = os.environ.copy()
        for key in list(environment):
            if key.startswith("ALLOW_"):
                environment[key] = "false"
        environment.update(
            {
                "APP_ENV": "test",
                "PRODUCTION_CHANGES_APPROVED": "false",
                "OUTBOUND_TEST_MODE": "false",
                "ALLOW_DATABASE_WRITES": "true" if self.writes_enabled else "false",
                "ALLOW_SCHEDULERS": "false",
                "ALLOW_EMAIL_SENDS": "false",
                "ALLOW_SMS_SENDS": "false",
                "ALLOW_SEEDING": "false",
                "ALLOW_ANALYTICS": "false",
                "ALLOW_SESSION_REPLAY": "false",
                "ALLOW_TWILIO_WEBHOOKS": "false",
                "ALLOW_RESEND_WEBHOOKS": "false",
                "ALLOW_LEAD_OUTBOX_DISPATCH": "false",
                "ALLOW_LEAD_RESEND": "false",
                "ALLOW_LEAD_TWILIO": "false",
                "ALLOW_LEAD_CRM_RECORDING": "false",
                "ALLOW_GYMMASTER_PROSPECT_WRITES": "false",
                "ALLOW_THIRD_PARTY_RESEARCH": "false",
                "ALLOW_DEPLOY_HOOK": "false",
                "ALLOW_REMOTE_NONPROD_DATABASE": "false",
                "MONGO_URL": self.mongo_url,
                "MONGO_WRITE_CONCERN": "1",
                "DB_NAME": self.database_name,
                "JWT_SECRET": "local-integration-jwt-secret-not-for-any-other-use",
                "UNSUBSCRIBE_SECRET": "local-integration-unsubscribe-secret-only",
                "FRONTEND_URL": "http://127.0.0.1:3000",
                "CORS_ORIGINS": "http://127.0.0.1:3000",
                "BOOTSTRAP_OWNER_EMAIL": "",
                "BOOTSTRAP_OWNER_PASSWORD": "",
                "BOOTSTRAP_OWNER_NAME": "",
                "RESEND_API_KEY": "",
                "RESEND_WEBHOOK_SECRET": "",
                "TWILIO_ACCOUNT_SID": "",
                "TWILIO_AUTH_TOKEN": "",
                "TWILIO_PHONE_NUMBER": "",
                "TWILIO_WEBHOOK_BASE_URL": "",
                "TWILIO_STATUS_CALLBACK_URL": "",
                "GYMMASTER_SITE_NAME": "",
                "GYMMASTER_API_KEY": "",
                "GYMMASTER_COMPANY_ID": "",
                "EMERGENT_LLM_KEY": "",
                "TEST_EMAIL_ALLOWLIST": "",
                "TEST_SMS_ALLOWLIST": "",
                "PUBLIC_LEAD_RATE_LIMIT": "20",
            }
        )
        return environment

    def start(self) -> None:
        uvicorn_binary = os.environ.get("SCS_UVICORN_BIN", "").strip()
        command = [uvicorn_binary] if uvicorn_binary else [sys.executable, "-m", "uvicorn"]
        command.extend([
            "server:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(self.port),
            "--log-level",
            "warning",
        ])
        self.process = subprocess.Popen(
            command,
            cwd=BACKEND_ROOT,
            env=self._environment(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        expected_status = 200 if self.writes_enabled else 503
        deadline = time.monotonic() + 30.0
        last_result: tuple[int, dict[str, Any]] | None = None
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                self._collect_output()
                raise RuntimeError(f"Backend exited during startup:\n{self.output[-4000:]}")
            try:
                last_result = _http_json(self.base_url, "GET", "/api/health", timeout=0.5)
                if last_result[0] == expected_status:
                    return
            except (OSError, ValueError, json.JSONDecodeError):
                pass
            time.sleep(0.05)
        self.stop()
        raise RuntimeError(
            f"Backend did not reach expected health {expected_status}; last result={last_result}; "
            f"output={self.output[-4000:]}"
        )

    def _collect_output(self) -> None:
        if self.process and self.process.stdout and not self.process.stdout.closed:
            try:
                self.output += self.process.stdout.read()
            except (OSError, ValueError):
                pass
            finally:
                self.process.stdout.close()

    def stop(self) -> None:
        if not self.process:
            return
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
        self._collect_output()


class LocalMongoUrlSafetyTests(unittest.TestCase):
    def test_accepts_direct_loopback_urls(self) -> None:
        self.assertEqual(
            require_safe_local_mongo_url("mongodb://127.0.0.1:27018"),
            "mongodb://127.0.0.1:27018",
        )
        self.assertEqual(
            require_safe_local_mongo_url("mongodb://[::1]:27018"),
            "mongodb://[::1]:27018",
        )

    def test_refuses_remote_nodes(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "loopback"):
            require_safe_local_mongo_url("mongodb://database.example.invalid:27017")

    def test_refuses_credentials(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "credentials"):
            require_safe_local_mongo_url("mongodb://user:secret@127.0.0.1:27018")

    def test_refuses_srv_and_unacknowledged_writes(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "direct mongodb"):
            require_safe_local_mongo_url("mongodb+srv://database.example.invalid")
        with self.assertRaisesRegex(RuntimeError, "w=0"):
            require_safe_local_mongo_url("mongodb://127.0.0.1:27018/?w=0")


class RealMongoLeadPipelineAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mongo_url = require_safe_local_mongo_url(os.environ.get(MONGO_ENV_NAME, ""))
        cls.database_name = f"scs_local_test_{uuid.uuid4().hex}"
        cls.mongo_client = MongoClient(
            cls.mongo_url,
            w=1,
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000,
        )
        try:
            cls.mongo_client.admin.command("ping")
        except Exception as error:
            cls.mongo_client.close()
            raise unittest.SkipTest(
                f"real loopback MongoDB is unavailable at {cls.mongo_url}: {type(error).__name__}"
            ) from error
        cls.database = cls.mongo_client[cls.database_name]

    @classmethod
    def tearDownClass(cls) -> None:
        client = getattr(cls, "mongo_client", None)
        database_name = getattr(cls, "database_name", None)
        if client and database_name:
            client.drop_database(database_name)
            client.close()

    def test_read_only_health_then_complete_lead_recovery_contract(self) -> None:
        read_only = BackendProcess(self.mongo_url, self.database_name, writes_enabled=False)
        try:
            read_only.start()
            health_status, health = _http_json(read_only.base_url, "GET", "/api/health")
            self.assertEqual(health_status, 503)
            self.assertEqual(health.get("status"), "not_ready")
            blocked_status, blocked = _http_json(
                read_only.base_url,
                "POST",
                "/api/v1/leads",
                payload={"email": "blocked@example.invalid"},
            )
            self.assertEqual(blocked_status, 503)
            self.assertEqual(blocked.get("code"), "database_writes_disabled")
            self.assertEqual(self.database.leads.count_documents({}), 0)
        finally:
            read_only.stop()

        request_id = str(uuid.uuid4())
        synthetic_email = f"local-tour-{uuid.uuid4().hex}@example.invalid"
        payload = {
            "first_name": "Local",
            "last_name": "Staging",
            "email": synthetic_email,
            "phone": "+1 555 010 9010",
            "location": "santa_cruz",
            "interest_type": "General Membership",
            "training_goals": "Synthetic local integration proof only",
            "start_timeline": "Just exploring",
            "preferred_contact": "email",
            "lead_source": "local_integration_test",
            "schema_version": "1.0.0",
            "request_id": request_id,
            "brand_id": "santa_cruz_strength",
            "location_id": "santa_cruz_ca",
            "form_id": "tour_request",
            "offer_id": "free_tour",
            "consent": {
                "privacy_notice_version": "local-test-v1",
                "email_operational_opt_in": True,
                "email_marketing_opt_in": False,
                "sms_operational_opt_in": False,
                "sms_marketing_opt_in": False,
            },
        }
        headers = {
            "Idempotency-Key": request_id,
            "X-Form-Schema-Version": "1.0.0",
        }

        writable = BackendProcess(self.mongo_url, self.database_name, writes_enabled=True)
        try:
            writable.start()
            health_status, health = _http_json(writable.base_url, "GET", "/api/health")
            self.assertEqual(health_status, 200)
            self.assertEqual(health.get("status"), "ready")
            self.assertEqual(health.get("database"), "ready")

            first_status, first = _http_json(
                writable.base_url, "POST", "/api/v1/leads", payload=payload, headers=headers
            )
            self.assertEqual(first_status, 200)
            self.assertEqual(first.get("status"), "accepted")
            self.assertFalse(first.get("duplicate"))
            self.assertEqual(first.get("request_id"), request_id)
            lead_id = first.get("lead_id")
            self.assertTrue(lead_id)

            query = {"payload.request_id": request_id}
            expected_keys = {
                f"santa_cruz_strength:{request_id}:email:lead:lead_received",
                f"santa_cruz_strength:{request_id}:email:staff:new_lead_alert",
            }
            self.assertEqual(self.database.leads.count_documents({"id": lead_id}), 1)
            self.assertEqual(self.database.lead_outbox.count_documents(query), 2)
            self.assertEqual(
                {job["idempotency_key"] for job in self.database.lead_outbox.find(query)},
                expected_keys,
            )
            stored = self.database.leads.find_one({"id": lead_id})
            self.assertEqual(stored.get("outbox_pending_request_ids"), [])

            replay_status, replay = _http_json(
                writable.base_url, "POST", "/api/v1/leads", payload=payload, headers=headers
            )
            self.assertEqual(replay_status, 200)
            self.assertEqual(replay.get("lead_id"), lead_id)
            self.assertTrue(replay.get("duplicate"))
            self.assertEqual(self.database.leads.count_documents({"id": lead_id}), 1)
            self.assertEqual(self.database.lead_outbox.count_documents(query), 2)

            changed = {**payload, "training_goals": "Changed payload must conflict"}
            conflict_status, _conflict = _http_json(
                writable.base_url, "POST", "/api/v1/leads", payload=changed, headers=headers
            )
            self.assertEqual(conflict_status, 409)
            self.assertEqual(self.database.leads.count_documents({"id": lead_id}), 1)
            self.assertEqual(self.database.lead_outbox.count_documents(query), 2)

            missing_key = f"santa_cruz_strength:{request_id}:email:staff:new_lead_alert"
            self.database.lead_outbox.delete_one({"idempotency_key": missing_key})
            self.database.leads.update_one(
                {"id": lead_id},
                {
                    "$addToSet": {"outbox_pending_request_ids": request_id},
                    "$unset": {
                        "outbox_last_confirmed_request_id": "",
                        "outbox_last_confirmed_at": "",
                    },
                },
            )
            self.assertEqual(self.database.lead_outbox.count_documents(query), 1)
            self.assertIn(
                request_id,
                self.database.leads.find_one({"id": lead_id})["outbox_pending_request_ids"],
            )

            recovery_status, recovery = _http_json(
                writable.base_url, "POST", "/api/v1/leads", payload=payload, headers=headers
            )
            self.assertEqual(recovery_status, 200)
            self.assertEqual(recovery.get("lead_id"), lead_id)
            self.assertTrue(recovery.get("duplicate"))
            recovered_jobs = list(self.database.lead_outbox.find(query))
            self.assertEqual(len(recovered_jobs), 2)
            self.assertEqual({job["idempotency_key"] for job in recovered_jobs}, expected_keys)
            self.assertEqual(len({job["idempotency_key"] for job in recovered_jobs}), 2)
            self.assertEqual(self.database.leads.count_documents({"id": lead_id}), 1)
            recovered_lead = self.database.leads.find_one({"id": lead_id})
            self.assertEqual(recovered_lead.get("outbox_pending_request_ids"), [])
            self.assertEqual(recovered_lead.get("outbox_last_confirmed_request_id"), request_id)

            print(
                json.dumps(
                    {
                        "database": self.database_name,
                        "health_read_only": 503,
                        "health_writable": 200,
                        "lead_count": 1,
                        "outbox_job_count": 2,
                        "changed_payload_status": 409,
                        "partial_outbox_recovered": True,
                        "providers_enabled": False,
                    },
                    sort_keys=True,
                )
            )
        finally:
            writable.stop()


if __name__ == "__main__":
    unittest.main(verbosity=2)
