"""Helpers for counselor public profile visibility."""
from __future__ import annotations

import uuid

from app.models import ApprovalStatus, TherapistProfile

ALLOWED_PHOTO_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 2 * 1024 * 1024


def therapist_has_photo(profile: TherapistProfile) -> bool:
    return bool(profile.photo_mime_type and profile.photo_data)


def therapist_public_profile_complete(profile: TherapistProfile) -> bool:
    return (
        profile.approval_status == ApprovalStatus.APPROVED
        and bool(profile.bio and profile.bio.strip())
        and therapist_has_photo(profile)
    )


def therapist_publicly_listable(profile: TherapistProfile) -> bool:
    """Approved counselors with an introduction — shown on homepage and counselor list."""
    return (
        profile.approval_status == ApprovalStatus.APPROVED
        and bool(profile.bio and profile.bio.strip())
    )


def therapist_photo_path(user_id: uuid.UUID) -> str:
    return f"/api/v1/therapists/{user_id}/photo"
