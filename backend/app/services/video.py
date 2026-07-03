"""Daily.co video room helpers."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import requests

from app.datetime_utils import as_utc

logger = logging.getLogger(__name__)

DAILY_API_BASE = "https://api.daily.co/v1"


def _room_name_for_appointment(appointment) -> str:
    return f"cc-{str(appointment.id).replace('-', '')[:20]}"


def _session_mode_value(appointment) -> str:
    mode = getattr(appointment, "session_mode", None)
    if mode is None:
        return "video"
    return mode.value if hasattr(mode, "value") else str(mode)


def _exp_timestamp(appointment) -> int:
    """Unix expiry for Daily room — always at least 2 hours in the future."""
    now_ts = int(datetime.now(timezone.utc).timestamp())
    end_ts = int(as_utc(appointment.ends_at).timestamp())
    return max(end_ts + 3600, now_ts + 7200)


def _fetch_daily_room(api_key: str, room_name: str) -> str | None:
    try:
        response = requests.get(
            f"{DAILY_API_BASE}/rooms/{room_name}",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
        if not response.ok:
            logger.warning("Daily.co room fetch failed: %s %s", response.status_code, response.text)
            return None
        return response.json().get("url")
    except requests.RequestException as exc:
        logger.warning("Daily.co room fetch request failed: %s", exc)
        return None


def _post_daily_room(api_key: str, room_name: str, *, exp_ts: int | None, audio_only: bool) -> tuple[str | None, str | None, int | None]:
    """Create a Daily room. Returns (url, room_name, http_status)."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    properties: dict = {
        "enable_chat": True,
        "start_video_off": audio_only,
        "start_audio_off": False,
    }
    if exp_ts is not None:
        properties["exp"] = exp_ts

    payload = {"name": room_name, "properties": properties}

    try:
        response = requests.post(
            f"{DAILY_API_BASE}/rooms",
            headers=headers,
            json=payload,
            timeout=15,
        )
        if response.ok:
            data = response.json()
            return data.get("url"), data.get("name") or room_name, response.status_code

        if response.status_code == 401:
            logger.error("Daily.co rejected API key (401). Check DAILY_API_KEY on Render.")
        elif response.status_code in (400, 409):
            existing_url = _fetch_daily_room(api_key, room_name)
            if existing_url:
                return existing_url, room_name, response.status_code

        logger.warning("Daily.co room create failed: %s %s", response.status_code, response.text)
        return None, None, response.status_code
    except requests.RequestException as exc:
        logger.warning("Daily.co request failed: %s", exc)
        return None, None, None


def ensure_appointment_video_room(appointment) -> str | None:
    """Create or return a Daily.co room URL for an appointment."""
    if appointment.video_room_url:
        return appointment.video_room_url

    api_key = os.environ.get("DAILY_API_KEY", "").strip()
    room_name = _room_name_for_appointment(appointment)
    audio_only = _session_mode_value(appointment) == "audio_only"

    if not api_key:
        logger.info("DAILY_API_KEY not set — video room stub for appointment %s", appointment.id)
        appointment.video_room_name = room_name
        appointment.video_room_url = None
        return None

    exp_ts = _exp_timestamp(appointment)
    url, resolved_name, status = _post_daily_room(api_key, room_name, exp_ts=exp_ts, audio_only=audio_only)

    # Retry without exp if Daily rejected the timestamp (common when session times are stale).
    if not url and status == 400:
        logger.info("Retrying Daily room create without exp for appointment %s", appointment.id)
        url, resolved_name, _status = _post_daily_room(api_key, room_name, exp_ts=None, audio_only=audio_only)

    if url:
        appointment.video_room_name = resolved_name or room_name
        appointment.video_room_url = url
        return url

    return None


def can_join_video_session(starts_at: datetime, ends_at: datetime, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    start = as_utc(starts_at)
    end = as_utc(ends_at)
    window_start = start.timestamp() - 15 * 60
    window_end = end.timestamp() + 30 * 60
    return window_start <= now.timestamp() <= window_end


def check_daily_api_key() -> dict:
    """Lightweight Daily API check for admin diagnostics."""
    api_key = os.environ.get("DAILY_API_KEY", "").strip()
    if not api_key:
        return {"configured": False, "ok": False, "message": "DAILY_API_KEY is not set"}

    try:
        response = requests.get(
            f"{DAILY_API_BASE}/rooms",
            headers={"Authorization": f"Bearer {api_key}"},
            params={"limit": 1},
            timeout=15,
        )
        if response.status_code == 401:
            return {"configured": True, "ok": False, "message": "Daily API key rejected (401)"}
        if response.ok:
            return {"configured": True, "ok": True, "message": "Daily API key is valid"}
        return {
            "configured": True,
            "ok": False,
            "message": f"Daily API returned {response.status_code}",
        }
    except requests.RequestException as exc:
        return {"configured": True, "ok": False, "message": f"Daily request failed: {exc}"}
