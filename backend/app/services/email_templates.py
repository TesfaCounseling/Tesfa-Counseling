"""HTML email templates for Tesfa Counseling notifications."""
from __future__ import annotations

import html
import os
from datetime import datetime

from app.datetime_utils import format_in_timezone

BRAND_NAME = os.environ.get("APP_NAME", "Tesfa Counseling")
APP_URL = os.environ.get("APP_URL", "https://www.tesfacounseling.com").rstrip("/")
API_PUBLIC_URL = os.environ.get(
    "API_PUBLIC_URL", "https://tesfa-counseling.onrender.com/api/v1"
).rstrip("/")
DASHBOARD_URL = f"{APP_URL}/dashboard"

GREEN = "#078930"
GREEN_DARK = "#056b24"
GOLD = "#fcd116"
CREAM = "#faf8f3"
INK = "#1a1a1a"
INK_MUTED = "#4b5563"


def _esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def _format_when(dt: datetime, tz_name: str) -> str:
    try:
        return format_in_timezone(dt, tz_name or "UTC")
    except Exception:
        return dt.strftime("%a %b %d, %Y %I:%M %p UTC")


def _detail_row(label: str, value: str) -> str:
    return (
        f'<tr><td style="padding:8px 0;color:{INK_MUTED};font-size:14px;width:120px;'
        f'vertical-align:top;">{_esc(label)}</td>'
        f'<td style="padding:8px 0;color:{INK};font-size:14px;font-weight:600;">{value}</td></tr>'
    )


def wrap_email_html(*, title: str, body_html: str, preheader: str = "") -> str:
    preheader_html = (
        f'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{_esc(preheader)}</div>'
        if preheader
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{_esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ebe3;font-family:Georgia,'Times New Roman',serif;">
  {preheader_html}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0ebe3;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,{GREEN} 0%,{GREEN} 33%,{GOLD} 33%,{GOLD} 66%,#da121a 66%,#da121a 100%);border-radius:8px 8px 0 0;"></td>
          </tr>
          <tr>
            <td style="background-color:{GREEN_DARK};padding:24px 28px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.02em;">{_esc(BRAND_NAME)}</p>
              <p style="margin:8px 0 0;color:#d4edda;font-size:13px;">Hope · Healing · Home</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:{CREAM};padding:32px 28px;border-radius:0 0 8px 8px;border:1px solid #e8e4dc;border-top:none;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px;text-align:center;">
              <p style="margin:0;color:{INK_MUTED};font-size:12px;line-height:1.6;">
                <a href="{_esc(APP_URL)}" style="color:{GREEN_DARK};text-decoration:none;">{_esc(BRAND_NAME)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _cta_button(label: str, href: str) -> str:
    return (
        f'<p style="margin:28px 0 0;text-align:center;">'
        f'<a href="{_esc(href)}" style="display:inline-block;background-color:{GREEN};color:#ffffff;'
        f'text-decoration:none;font-size:15px;font-weight:bold;padding:14px 28px;border-radius:8px;">'
        f"{_esc(label)}</a></p>"
    )


def _secondary_link(label: str, href: str) -> str:
    return (
        f'<p style="margin:16px 0 0;text-align:center;">'
        f'<a href="{_esc(href)}" style="color:{GREEN_DARK};font-size:14px;text-decoration:underline;">'
        f"{_esc(label)}</a></p>"
    )


def video_join_url(appointment_id: object) -> str:
    return f"{API_PUBLIC_URL}/appointments/{appointment_id}/video-join"


def _video_room_link_html(join_url: str) -> str:
    return (
        f'<a href="{_esc(join_url)}" style="color:{GREEN_DARK};font-weight:600;text-decoration:underline;">'
        f"Video room</a>"
    )


def appointment_booked_email(
    *,
    appointment_id: object,
    recipient_name: str,
    provider_name: str,
    client_name: str,
    starts_at: datetime,
    timezone_name: str,
    duration_minutes: int,
    video_room_url: str | None,
    is_provider: bool,
) -> tuple[str, str]:
    when = _format_when(starts_at, timezone_name)
    other_party = provider_name if not is_provider else client_name
    other_label = "Counselor" if not is_provider else "Client"

    plain = (
        f"Hello {recipient_name},\n\n"
        f"Your session is confirmed.\n\n"
        f"{other_label}: {other_party}\n"
        f"When: {when}\n"
        f"Duration: {duration_minutes} minutes\n"
    )
    if video_room_url:
        join_url = video_join_url(appointment_id)
        plain += f"Video room: {join_url}\n"
    plain += f"\nView your dashboard: {DASHBOARD_URL}\n"

    rows = (
        _detail_row(other_label, _esc(other_party))
        + _detail_row("When", _esc(when))
        + _detail_row("Duration", f"{duration_minutes} minutes")
    )
    if video_room_url:
        join_url = video_join_url(appointment_id)
        rows += _detail_row("Video room", _video_room_link_html(join_url))

    body = (
        f'<p style="margin:0 0 8px;color:{INK};font-size:18px;font-weight:bold;">Session confirmed</p>'
        f'<p style="margin:0 0 24px;color:{INK_MUTED};font-size:15px;line-height:1.5;">'
        f"Hello {_esc(recipient_name)}, your counseling session is booked.</p>"
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0">{rows}</table>'
    )
    if video_room_url:
        body += _cta_button("Video room", video_join_url(appointment_id))
    body += _secondary_link("View dashboard", DASHBOARD_URL)

    html_out = wrap_email_html(
        title="Session confirmed",
        preheader=f"Session with {other_party} on {when}",
        body_html=body,
    )
    return plain, html_out


def appointment_cancelled_email(
    *,
    recipient_name: str,
    provider_name: str,
    starts_at: datetime,
    timezone_name: str,
    cancelled_by_name: str,
) -> tuple[str, str]:
    when = _format_when(starts_at, timezone_name)
    plain = (
        f"Hello {recipient_name},\n\n"
        f"Your session with {provider_name} scheduled for {when} has been cancelled.\n"
        f"Cancelled by: {cancelled_by_name}\n\n"
        f"Book again: {APP_URL}/counselors\n"
    )
    rows = (
        _detail_row("Counselor", _esc(provider_name))
        + _detail_row("Was scheduled", _esc(when))
        + _detail_row("Cancelled by", _esc(cancelled_by_name))
    )
    body = (
        f'<p style="margin:0 0 8px;color:#da121a;font-size:18px;font-weight:bold;">Session cancelled</p>'
        f'<p style="margin:0 0 24px;color:{INK_MUTED};font-size:15px;line-height:1.5;">'
        f"Hello {_esc(recipient_name)}, the following session has been cancelled.</p>"
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0">{rows}</table>'
        + _cta_button("Find a counselor", f"{APP_URL}/counselors")
    )
    return plain, wrap_email_html(title="Session cancelled", preheader=f"Cancelled: {when}", body_html=body)


def appointment_rescheduled_email(
    *,
    appointment_id: object,
    recipient_name: str,
    provider_name: str,
    client_name: str,
    starts_at: datetime,
    timezone_name: str,
    duration_minutes: int,
    rescheduled_by_name: str,
    video_room_url: str | None,
    is_provider: bool,
) -> tuple[str, str]:
    when = _format_when(starts_at, timezone_name)
    other_party = provider_name if not is_provider else client_name
    other_label = "Counselor" if not is_provider else "Client"

    plain = (
        f"Hello {recipient_name},\n\n"
        f"Your session has been rescheduled.\n\n"
        f"{other_label}: {other_party}\n"
        f"New time: {when}\n"
        f"Duration: {duration_minutes} minutes\n"
        f"Updated by: {rescheduled_by_name}\n"
    )
    if video_room_url:
        join_url = video_join_url(appointment_id)
        plain += f"Video room: {join_url}\n"
    plain += f"\nView your dashboard: {DASHBOARD_URL}\n"

    rows = (
        _detail_row(other_label, _esc(other_party))
        + _detail_row("New time", _esc(when))
        + _detail_row("Duration", f"{duration_minutes} minutes")
        + _detail_row("Updated by", _esc(rescheduled_by_name))
    )
    if video_room_url:
        rows += _detail_row("Video room", _video_room_link_html(video_join_url(appointment_id)))

    body = (
        f'<p style="margin:0 0 8px;color:{INK};font-size:18px;font-weight:bold;">Session rescheduled</p>'
        f'<p style="margin:0 0 24px;color:{INK_MUTED};font-size:15px;line-height:1.5;">'
        f"Hello {_esc(recipient_name)}, your session time has been updated.</p>"
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0">{rows}</table>'
    )
    if video_room_url:
        body += _cta_button("Video room", video_join_url(appointment_id))
    body += _secondary_link("View dashboard", DASHBOARD_URL)

    return plain, wrap_email_html(title="Session rescheduled", preheader=f"New time: {when}", body_html=body)


def client_feedback_email(
    *,
    category_label: str,
    client_name: str,
    client_email: str,
    subject: str,
    message: str,
) -> tuple[str, str]:
    plain = (
        f"New client {category_label.lower()}\n\n"
        f"From: {client_name} ({client_email})\n"
        f"Subject: {subject}\n\n"
        f"{message}\n"
    )
    body = (
        f'<p style="margin:0 0 8px;color:{INK};font-size:18px;font-weight:bold;">'
        f"New client {_esc(category_label.lower())}</p>"
        f'<p style="margin:0 0 16px;color:{INK_MUTED};font-size:14px;">'
        f"From {_esc(client_name)} &lt;{_esc(client_email)}&gt;</p>"
        f'<p style="margin:0 0 8px;color:{INK};font-size:15px;font-weight:600;">{_esc(subject)}</p>'
        f'<div style="margin-top:16px;padding:16px;background-color:#f5f3ee;border-radius:8px;'
        f'color:{INK};font-size:14px;line-height:1.6;white-space:pre-wrap;">{_esc(message)}</div>'
        + _secondary_link("Open admin dashboard", DASHBOARD_URL)
    )
    return plain, wrap_email_html(title=f"Client {category_label}", preheader=subject, body_html=body)


def test_email() -> tuple[str, str]:
    plain = (
        "Hello,\n\n"
        "If you received this message, SendGrid SMTP is working for Tesfa Counseling.\n\n"
        f"Visit: {APP_URL}\n"
    )
    body = (
        f'<p style="margin:0 0 8px;color:{INK};font-size:18px;font-weight:bold;">Test email</p>'
        f'<p style="margin:0;color:{INK_MUTED};font-size:15px;line-height:1.6;">'
        "If you received this message, SendGrid SMTP is working for Tesfa Counseling.</p>"
        + _cta_button("Visit Tesfa Counseling", APP_URL)
    )
    return plain, wrap_email_html(title="Test email", preheader="SMTP test", body_html=body)
