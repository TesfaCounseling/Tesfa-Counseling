"""Only session lengths with an active price may be booked or listed as slots."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from app.extensions import db
from app.models import ApprovalStatus, User
from app.routes.appointments import UNPRICED_DURATION_MESSAGE


def _register_therapist(client, **overrides):
    payload = {
        "email": f"dur-{uuid.uuid4().hex[:8]}@example.com",
        "password": "password123",
        "first_name": "Price",
        "last_name": "Setter",
        "role": "therapist",
        "languages": "English",
        "specializations": "Anxiety",
        "timezone": "UTC",
    }
    payload.update(overrides)
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def _register_client(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": f"cli-{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "first_name": "Pay",
            "last_name": "Client",
            "role": "client",
            "timezone": "UTC",
        },
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def test_slots_and_book_reject_unpriced_duration(client, app):
    therapist = _register_therapist(client)
    provider_id = therapist["user"]["id"]
    therapist_headers = {"Authorization": f"Bearer {therapist['access_token']}"}

    with app.app_context():
        user = db.session.get(User, uuid.UUID(provider_id))
        user.therapist_profile.approval_status = ApprovalStatus.APPROVED
        user.therapist_profile.bio = "Public bio"
        db.session.commit()

    priced = client.post(
        "/api/v1/availability/pricing",
        json={"duration_minutes": 50, "amount_cents": 5000, "pricing_type": "standard", "currency": "USD"},
        headers=therapist_headers,
    )
    assert priced.status_code == 201, priced.get_json()

    client_user = _register_client(client)
    client_headers = {"Authorization": f"Bearer {client_user['access_token']}"}

    slots_90 = client.get(
        f"/api/v1/appointments/providers/{provider_id}/slots?duration_minutes=90&client_timezone=UTC",
        headers=client_headers,
    )
    assert slots_90.status_code == 400
    assert UNPRICED_DURATION_MESSAGE in (slots_90.get_json().get("message") or "")

    starts_at = (datetime.now(timezone.utc) + timedelta(days=2)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    booked = client.post(
        "/api/v1/appointments",
        json={
            "provider_id": provider_id,
            "starts_at": starts_at,
            "duration_minutes": 90,
            "client_timezone": "UTC",
        },
        headers=client_headers,
    )
    assert booked.status_code == 400
    assert UNPRICED_DURATION_MESSAGE in (booked.get_json().get("message") or "")
