"""Daily.co video room helpers."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)


def ensure_appointment_video_room(appointment) -> str | None:
    """Create or return a Daily.co room URL for an appointment."""
    if appointment.video_room_url:
        return appointment.video_room_url

    api_key = os.environ.get("DAILY_API_KEY", "")
    room_name = f"cc-{str(appointment.id).replace('-', '')[:20]}"
    exp_ts = int(appointment.ends_at.timestamp()) + 3600
    audio_only = getattr(appointment, "session_mode", None) and appointment.session_mode.value == "audio_only"

    if not api_key:
        logger.info("DAILY_API_KEY not set — video room stub for appointment %s", appointment.id)
        appointment.video_room_name = room_name
        appointment.video_room_url = None
        return None

    try:
        response = requests.post(
            "https://api.daily.co/v1/rooms",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "name": room_name,
                "properties": {
                    "exp": exp_ts,
                    "enable_chat": True,
                    "start_video_off": audio_only,
                    "start_audio_off": False,
                },
            },
            timeout=15,
        )
        if not response.ok:
            logger.warning("Daily.co room create failed: %s %s", response.status_code, response.text)
            return None
        data = response.json()
        url = data.get("url")
        appointment.video_room_name = data.get("name") or room_name
        appointment.video_room_url = url
        return url
    except requests.RequestException as exc:
        logger.warning("Daily.co request failed: %s", exc)
        return None


def can_join_video_session(starts_at: datetime, ends_at: datetime, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    start = starts_at if starts_at.tzinfo else starts_at.replace(tzinfo=timezone.utc)
    end = ends_at if ends_at.tzinfo else ends_at.replace(tzinfo=timezone.utc)
    window_start = start.timestamp() - 15 * 60
    window_end = end.timestamp() + 30 * 60
    return window_start <= now.timestamp() <= window_end
