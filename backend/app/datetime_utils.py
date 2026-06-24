"""UTC normalization and timezone-aware formatting for API responses."""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_iso_utc(dt: datetime) -> str:
    """Serialize as UTC with Z suffix so browsers always parse as instant, not local."""
    return as_utc(dt).strftime("%Y-%m-%dT%H:%M:%S") + "Z"


def format_in_timezone(dt: datetime, tz_name: str) -> str:
    return as_utc(dt).astimezone(ZoneInfo(tz_name)).strftime("%a %b %d, %Y %I:%M %p")
