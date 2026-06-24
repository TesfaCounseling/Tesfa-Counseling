"""Scheduling helpers — availability slots and conflict checks."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.datetime_utils import as_utc, to_iso_utc
from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    AvailabilityBlock,
    AvailabilityRule,
)


ACTIVE_STATUSES = {
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
}


def parse_time(value: str) -> time:
    parts = value.strip().split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    return time(hour=hour, minute=minute)


def _combine_local(d: date, t: time, tz_name: str) -> datetime:
    tz = ZoneInfo(tz_name)
    local_dt = datetime(d.year, d.month, d.day, t.hour, t.minute, tzinfo=tz)
    return local_dt.astimezone(timezone.utc)


def get_provider_busy_intervals(
    provider_id: uuid.UUID,
    range_start: datetime,
    range_end: datetime,
    exclude_appointment_id: uuid.UUID | None = None,
) -> list[tuple[datetime, datetime]]:
    intervals: list[tuple[datetime, datetime]] = []

    query = Appointment.query.filter(
        Appointment.provider_id == provider_id,
        Appointment.status.in_(ACTIVE_STATUSES),
        Appointment.starts_at < range_end,
        Appointment.ends_at > range_start,
    )
    if exclude_appointment_id:
        query = query.filter(Appointment.id != exclude_appointment_id)
    appointments = query.all()
    for appt in appointments:
        intervals.append((as_utc(appt.starts_at), as_utc(appt.ends_at)))

    blocks = AvailabilityBlock.query.filter(
        AvailabilityBlock.provider_id == provider_id,
        AvailabilityBlock.starts_at < range_end,
        AvailabilityBlock.ends_at > range_start,
    ).all()
    for block in blocks:
        intervals.append((as_utc(block.starts_at), as_utc(block.ends_at)))

    return intervals


def overlaps(start: datetime, end: datetime, busy: list[tuple[datetime, datetime]]) -> bool:
    start = as_utc(start)
    end = as_utc(end)
    for b_start, b_end in busy:
        b_start = as_utc(b_start)
        b_end = as_utc(b_end)
        if start < b_end and end > b_start:
            return True
    return False


def generate_available_slots(
    provider_id: uuid.UUID,
    duration_minutes: int,
    client_tz: str,
    days_ahead: int = 14,
) -> list[dict]:
    rules = AvailabilityRule.query.filter_by(provider_id=provider_id, is_active=True).all()
    if not rules:
        return []

    now = datetime.now(timezone.utc)
    range_end = now + timedelta(days=days_ahead)
    busy = get_provider_busy_intervals(provider_id, now, range_end)

    slots: list[dict] = []
    client_zone = ZoneInfo(client_tz)

    for rule in rules:
        provider_zone = ZoneInfo(rule.timezone)
        now_provider = now.astimezone(provider_zone)

        for offset in range(days_ahead + 1):
            day = now_provider.date() + timedelta(days=offset)
            if day.weekday() != rule.day_of_week:
                continue

            slot_start_local = datetime.combine(day, rule.start_time, tzinfo=provider_zone)
            slot_end_local = datetime.combine(day, rule.end_time, tzinfo=provider_zone)
            cursor = slot_start_local.astimezone(timezone.utc)
            window_end = slot_end_local.astimezone(timezone.utc)

            while cursor + timedelta(minutes=duration_minutes) <= window_end:
                slot_end = cursor + timedelta(minutes=duration_minutes)
                if cursor <= now:
                    cursor += timedelta(minutes=duration_minutes)
                    continue
                if not overlaps(cursor, slot_end, busy):
                    client_start = cursor.astimezone(client_zone)
                    slots.append(
                        {
                            "starts_at": to_iso_utc(cursor),
                            "ends_at": to_iso_utc(slot_end),
                            "client_local": client_start.strftime("%a %b %d, %Y %I:%M %p"),
                            "client_timezone": client_tz,
                        }
                    )
                cursor += timedelta(minutes=duration_minutes)

    slots.sort(key=lambda s: s["starts_at"])
    return slots


def assert_slot_available(
    provider_id: uuid.UUID,
    starts_at: datetime,
    ends_at: datetime,
    exclude_appointment_id: uuid.UUID | None = None,
) -> None:
    busy = get_provider_busy_intervals(provider_id, starts_at, ends_at, exclude_appointment_id)
    if overlaps(starts_at, ends_at, busy):
        raise ValueError("This time slot is no longer available")
