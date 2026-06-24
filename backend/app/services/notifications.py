"""Outbound notifications — email + Telegram."""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

import requests

logger = logging.getLogger(__name__)


def send_email(to_address: str, subject: str, body: str) -> bool:
    if not to_address:
        return False

    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    from_address = os.environ.get("SMTP_FROM", smtp_user or "noreply@localhost")

    if not smtp_host:
        logger.info("Email stub → %s | %s | %s", to_address, subject, body.replace("\n", " "))
        return True

    try:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = from_address
        msg["To"] = to_address
        msg.set_content(body)
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return True
    except OSError as exc:
        logger.warning("Email send failed: %s", exc)
        return False


def send_telegram_message(chat_id: str, text: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token or not chat_id:
        return False
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=10,
        )
        return response.ok
    except requests.RequestException as exc:
        logger.warning("Telegram send failed: %s", exc)
        return False


def _notify_users_email(users, subject: str, body: str) -> None:
    for user in users:
        if user and user.email:
            send_email(user.email, subject, body)


def _notify_users_telegram(users, message: str) -> None:
    from app.models import TelegramLink

    for user in users:
        if not user:
            continue
        link = TelegramLink.query.filter_by(user_id=user.id).first()
        if link:
            send_telegram_message(link.telegram_chat_id, message)


def notify_appointment_booked(appointment, client, provider) -> None:
    when = appointment.starts_at.strftime("%Y-%m-%d %H:%M UTC")
    message = (
        f"Session booked\n"
        f"Provider: {provider.full_name}\n"
        f"Client: {client.full_name}\n"
        f"Starts: {when}\n"
        f"Duration: {appointment.duration_minutes} min"
    )
    video_line = f"\nVideo room: {appointment.video_room_url}" if appointment.video_room_url else ""
    email_body = message + video_line

    _notify_users_telegram([client, provider], f"✅ {message}")
    _notify_users_email(
        [client, provider],
        "Session confirmed",
        email_body,
    )


def notify_appointment_cancelled(appointment, client, provider, cancelled_by) -> None:
    when = appointment.starts_at.strftime("%Y-%m-%d %H:%M UTC")
    message = (
        f"Session cancelled\n"
        f"Provider: {provider.full_name}\n"
        f"Was scheduled: {when}\n"
        f"Cancelled by: {cancelled_by.full_name}"
    )
    _notify_users_telegram([client, provider], f"❌ {message}")
    _notify_users_email([client, provider], "Session cancelled", message)


def notify_appointment_rescheduled(appointment, client, provider, rescheduled_by) -> None:
    when = appointment.starts_at.strftime("%Y-%m-%d %H:%M UTC")
    message = (
        f"Session rescheduled\n"
        f"Provider: {provider.full_name}\n"
        f"Client: {client.full_name}\n"
        f"New time: {when}\n"
        f"Duration: {appointment.duration_minutes} min\n"
        f"Updated by: {rescheduled_by.full_name}"
    )
    _notify_users_telegram([client, provider], f"📅 {message}")
    _notify_users_email([client, provider], "Session rescheduled", message)
