"""Helpers for counselor public profile visibility."""
from __future__ import annotations

import uuid

from sqlalchemy import or_

from app.models import ApprovalStatus, TherapistProfile

ALLOWED_PHOTO_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 2 * 1024 * 1024


def therapist_has_photo(profile: TherapistProfile) -> bool:
    return bool(profile.photo_mime_type and profile.photo_data)


def therapist_is_approved(profile) -> bool:
    """True only for admin-approved providers (handles name/value enum storage)."""
    if profile is None:
        return False
    status = getattr(profile, "approval_status", None)
    if status is None:
        return False
    if status == ApprovalStatus.APPROVED:
        return True
    name = getattr(status, "name", None)
    value = getattr(status, "value", None)
    for token in (name, value, status):
        if token is None:
            continue
        normalized = str(token).replace("ApprovalStatus.", "").strip().upper()
        if normalized == "APPROVED":
            return True
    return False


def approved_therapist_status_filter():
    """SQL filter that matches approved rows whether DB stored names or values."""
    return or_(
        TherapistProfile.approval_status == ApprovalStatus.APPROVED,
        TherapistProfile.approval_status == "APPROVED",
        TherapistProfile.approval_status == "approved",
    )


def therapist_public_profile_complete(profile: TherapistProfile) -> bool:
    return (
        therapist_is_approved(profile)
        and bool(profile.bio and profile.bio.strip())
        and therapist_has_photo(profile)
    )


def therapist_publicly_listable(profile: TherapistProfile) -> bool:
    """Admin-approved counselors with an introduction — homepage and counselor list only."""
    return therapist_is_approved(profile) and bool(profile.bio and profile.bio.strip())


def therapist_photo_path(user_id: uuid.UUID) -> str:
    return f"/api/v1/therapists/{user_id}/photo"


def provider_my_photo_path() -> str:
    return "/api/v1/providers/me/photo"
