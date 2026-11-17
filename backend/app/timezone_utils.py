"""Timezone helpers for profiles and scheduling."""
from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def normalize_timezone(value: str | None, default: str = "UTC") -> str:
    raw = (value or "").strip()
    if not raw:
        return default
    try:
        ZoneInfo(raw)
        return raw
    except ZoneInfoNotFoundError:
        return default


def profile_timezone(user) -> str | None:
    if user.client_profile and user.client_profile.timezone:
        return user.client_profile.timezone
    if user.therapist_profile and getattr(user.therapist_profile, "timezone", None):
        return user.therapist_profile.timezone
    if user.trainee_profile and getattr(user.trainee_profile, "timezone", None):
        return user.trainee_profile.timezone
    return None
