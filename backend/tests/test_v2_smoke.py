"""V2 smoke tests for Santa Cruz Strength CRM"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://crm-staff-portal-1.preview.emergentagent.com").rstrip("/")
EMAIL = os.environ.get("TEST_STAFF_EMAIL", "management@santacruzstrength.com")
PASSWORD = os.environ.get("TEST_STAFF_PASSWORD", "")


@pytest.fixture(scope="module")
def token():
    if not PASSWORD:
        pytest.skip("TEST_STAFF_PASSWORD not set — auth tests require credentials from the secret store")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("step") == "authenticated"
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---- Public content endpoints ----
def test_content_returns_keys():
    r = requests.get(f"{BASE_URL}/api/content", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict) and len(data) > 5


def test_team_returns_members():
    r = requests.get(f"{BASE_URL}/api/team", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1
    assert "name" in data[0]


def test_blog_public():
    r = requests.get(f"{BASE_URL}/api/blog", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, (list, dict))
    if isinstance(data, dict):
        assert "posts" in data


# ---- Auth ----
def test_login_success(token):
    assert token and isinstance(token, str)


def test_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": "wrong!"}, timeout=10)
    assert r.status_code in (400, 401, 403)


# ---- Public lead form ----
def test_public_lead_creation_v1():
    request_id = str(uuid.uuid4())
    payload = {
        "first_name": "TEST",
        "last_name": f"Lead_{uuid.uuid4().hex[:6]}",
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "phone": "+14155551234",
        "schema_version": "1.0.0",
        "request_id": request_id,
        "brand_id": "santa_cruz_strength",
        "location_id": "santa_cruz_ca",
        "form_id": "test_smoke_form",
        "offer_id": "general_membership",
        "interest_type": "General Membership",
        "start_timeline": "Just exploring",
        "lead_source": "website",
        "attribution": {},
        "consent": {
            "privacy_notice_version": "2026-08-03",
            "email_operational_opt_in": True,
            "email_marketing_opt_in": False,
            "sms_operational_opt_in": False,
            "sms_marketing_opt_in": False,
            "sms_consent_text_version": None,
        },
    }
    r = requests.post(f"{BASE_URL}/api/v1/leads", json=payload,
                      headers={"Idempotency-Key": request_id}, timeout=20)
    assert r.status_code in (200, 201), f"{r.status_code}: {r.text[:400]}"


# ---- Staff CRM endpoints (auth required) ----
def test_staff_leads_list(auth_headers):
    r = requests.get(f"{BASE_URL}/api/staff/leads", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    # should be paginated dict or list
    assert isinstance(data, (list, dict))


def test_staff_stats(auth_headers):
    r = requests.get(f"{BASE_URL}/api/staff/stats", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


def test_staff_leads_requires_auth():
    r = requests.get(f"{BASE_URL}/api/staff/leads", timeout=10)
    assert r.status_code in (401, 403)


def test_auth_me(auth_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=10)
    if r.status_code == 404:
        pytest.skip("no /auth/me endpoint")
    assert r.status_code == 200
    assert r.json().get("email") == EMAIL
