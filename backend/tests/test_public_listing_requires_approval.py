"""Pending counselors must never appear on the public counselor list."""
from __future__ import annotations

import uuid

from app import create_app
from app.extensions import db
from app.models import ApprovalStatus, TherapistProfile, User
from app.provider_profile_utils import therapist_publicly_listable


def test_pending_counselor_not_publicly_listable_even_with_bio(app_ctx):
    profile = TherapistProfile(
        user_id=uuid.uuid4(),
        bio="I should stay private until approved.",
        specializations="Anxiety",
        languages="English",
        approval_status=ApprovalStatus.PENDING,
    )
    assert therapist_publicly_listable(profile) is False


def test_approved_counselor_with_bio_is_listable(app_ctx):
    profile = TherapistProfile(
        user_id=uuid.uuid4(),
        bio="Ready to help.",
        specializations="Anxiety",
        languages="English",
        approval_status=ApprovalStatus.APPROVED,
    )
    assert therapist_publicly_listable(profile) is True


def test_register_therapist_stays_off_public_list(client, app):
    email = f"pending-{uuid.uuid4().hex[:8]}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "first_name": "Pend",
            "last_name": "Ing",
            "role": "therapist",
            "languages": "English, Amharic",
            "specializations": "Anxiety, grief",
            "timezone": "Africa/Addis_Ababa",
        },
    )
    assert response.status_code == 201, response.get_json()
    user_id = response.get_json()["user"]["id"]

    with app.app_context():
        user = db.session.get(User, uuid.UUID(user_id))
        assert user is not None
        assert user.therapist_profile is not None
        assert user.therapist_profile.approval_status == ApprovalStatus.PENDING

    # Even after writing a bio, pending counselors stay private.
    token = response.get_json()["access_token"]
    patch = client.patch(
        "/api/v1/providers/me",
        json={
            "bio": "Pending bio should not make me public.",
            "languages": "English, Amharic",
            "specializations": "Anxiety, grief",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch.status_code == 200, patch.get_json()
    assert patch.get_json()["profile"]["approval_status"] == "pending"
    assert patch.get_json()["profile"]["public_profile_complete"] is False

    listing = client.get("/api/v1/therapists")
    assert listing.status_code == 200
    ids = {p["id"] for p in listing.get_json()["providers"]}
    assert user_id not in ids

    detail = client.get(f"/api/v1/therapists/{user_id}")
    assert detail.status_code == 404
