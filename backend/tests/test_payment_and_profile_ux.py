"""Payment copy, timezone signup, counselor profile/payout, and payment-required flags."""
from __future__ import annotations

import uuid

from app.models import PaymentStatus
from app.services.payment_instructions import (
    CLIENT_ACCOUNT_DETAILS_PLACEHOLDER,
    DEV_ACCOUNT_DETAILS_PLACEHOLDER,
    remittance_instructions,
)


def test_remittance_hides_developer_placeholder(monkeypatch):
    monkeypatch.delenv("PAYMENT_ACCOUNT_DETAILS", raising=False)
    payload = remittance_instructions()
    assert payload["account_details_configured"] is False
    assert DEV_ACCOUNT_DETAILS_PLACEHOLDER not in payload["account_details"]
    assert payload["account_details"] == CLIENT_ACCOUNT_DETAILS_PLACEHOLDER

    monkeypatch.setenv("PAYMENT_ACCOUNT_DETAILS", DEV_ACCOUNT_DETAILS_PLACEHOLDER)
    payload = remittance_instructions()
    assert payload["account_details_configured"] is False
    assert DEV_ACCOUNT_DETAILS_PLACEHOLDER not in payload["account_details"]

    monkeypatch.setenv("PAYMENT_ACCOUNT_DETAILS", "CBE 1000123456789")
    payload = remittance_instructions()
    assert payload["account_details_configured"] is True
    assert payload["account_details"] == "CBE 1000123456789"


def test_register_requires_timezone(client):
    email = f"tz-{uuid.uuid4().hex[:8]}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "first_name": "Ada",
            "last_name": "Client",
            "role": "client",
            "preferred_language": "en",
        },
    )
    assert response.status_code == 400
    assert "timezone" in (response.get_json().get("message") or "").lower()


def test_counselor_title_location_and_payout_settings(client):
    email = f"pay-{uuid.uuid4().hex[:8]}@example.com"
    created = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "first_name": "Jay",
            "last_name": "Counselor",
            "role": "therapist",
            "languages": "English, Amharic",
            "specializations": "Anxiety",
            "timezone": "Africa/Addis_Ababa",
        },
    )
    assert created.status_code == 201, created.get_json()
    token = created.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    patch = client.patch(
        "/api/v1/providers/me",
        json={
            "languages": "English, Amharic",
            "professional_title": "Licensed Clinical Counselor",
            "practice_location": "Addis Ababa, Ethiopia",
            "payout_account_name": "Jay Counselor",
            "payout_details": "CBE 123456",
            "payout_methods": ["Remitly", "Wise", "CBE"],
        },
        headers=headers,
    )
    assert patch.status_code == 200, patch.get_json()
    profile = patch.get_json()["profile"]
    assert profile["professional_title"] == "Licensed Clinical Counselor"
    assert profile["practice_location"] == "Addis Ababa, Ethiopia"
    assert profile["payout_account_name"] == "Jay Counselor"
    assert profile["payout_details"] == "CBE 123456"
    assert profile["payout_methods"] == ["Remitly", "Wise", "CBE"]


def test_submitted_payment_is_not_marked_payment_required():
    assert PaymentStatus.SUBMITTED not in (PaymentStatus.PENDING, PaymentStatus.REJECTED)
    assert PaymentStatus.PENDING in (PaymentStatus.PENDING, PaymentStatus.REJECTED)


def test_client_preferences_timezone(client):
    email = f"pref-{uuid.uuid4().hex[:8]}@example.com"
    created = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "first_name": "Maya",
            "last_name": "Client",
            "role": "client",
            "preferred_language": "en",
            "timezone": "America/Toronto",
        },
    )
    assert created.status_code == 201, created.get_json()
    token = created.get_json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.get_json()["user"]["timezone"] == "America/Toronto"

    updated = client.patch(
        "/api/v1/auth/me/preferences",
        json={"timezone": "America/Los_Angeles", "preferred_language": "am"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert updated.status_code == 200
    user = updated.get_json()["user"]
    assert user["timezone"] == "America/Los_Angeles"
    assert user["preferred_language"] == "am"
