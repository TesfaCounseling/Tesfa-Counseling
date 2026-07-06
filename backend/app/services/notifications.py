"""Outbound notifications — email + Telegram."""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

import requests

from app.services import email_templates

logger = logging.getLogger(__name__)


def send_email(to_address: str, subject: str, body: str, html_body: str | None = None) -> bool:
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
        if html_body:
            msg.add_alternative(html_body, subtype="html")
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
        logger.info("Email sent → %s | %s", to_address, subject)
        return True
    except smtplib.SMTPException as exc:
        logger.error("Email send failed (SMTP): %s", exc)
        return False
    except OSError as exc:
        logger.error("Email send failed: %s", exc)
        return False


def smtp_configured() -> bool:
    return bool(os.environ.get("SMTP_HOST", "").strip())


def send_test_email(to_address: str) -> dict:
    if not to_address:
        return {"ok": False, "message": "No recipient email"}
    if not smtp_configured():
        return {"ok": False, "message": "SMTP_HOST is not set on Render"}
    plain, html_body = email_templates.test_email()
    ok = send_email(to_address, "Tesfa Counseling test email", plain, html_body)
    if ok:
        return {"ok": True, "message": f"Test email sent to {to_address}"}
    return {"ok": False, "message": "Send failed — check Render logs for Email send failed"}


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


def _notify_users_email(users, subject: str, plain_body: str, html_body: str | None = None) -> None:
    for user in users:
        if user and user.email:
            send_email(user.email, subject, plain_body, html_body)


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
    _notify_users_telegram([client, provider], f"✅ {message}")

    for user, is_provider, tz_name in (
        (client, False, appointment.client_timezone),
        (provider, True, appointment.provider_timezone),
    ):
        if not user or not user.email:
            continue
        plain, html_body = email_templates.appointment_booked_email(
            recipient_name=user.first_name or user.full_name,
            provider_name=provider.full_name,
            client_name=client.full_name,
            starts_at=appointment.starts_at,
            timezone_name=tz_name,
            duration_minutes=appointment.duration_minutes,
            video_room_url=appointment.video_room_url,
            is_provider=is_provider,
        )
        send_email(user.email, "Session confirmed — Tesfa Counseling", plain, html_body)


def notify_appointment_cancelled(appointment, client, provider, cancelled_by) -> None:
    when = appointment.starts_at.strftime("%Y-%m-%d %H:%M UTC")
    message = (
        f"Session cancelled\n"
        f"Provider: {provider.full_name}\n"
        f"Was scheduled: {when}\n"
        f"Cancelled by: {cancelled_by.full_name}"
    )
    _notify_users_telegram([client, provider], f"❌ {message}")

    for user, tz_name in (
        (client, appointment.client_timezone),
        (provider, appointment.provider_timezone),
    ):
        if not user or not user.email:
            continue
        plain, html_body = email_templates.appointment_cancelled_email(
            recipient_name=user.first_name or user.full_name,
            provider_name=provider.full_name,
            starts_at=appointment.starts_at,
            timezone_name=tz_name,
            cancelled_by_name=cancelled_by.full_name,
        )
        send_email(user.email, "Session cancelled — Tesfa Counseling", plain, html_body)


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

    for user, is_provider, tz_name in (
        (client, False, appointment.client_timezone),
        (provider, True, appointment.provider_timezone),
    ):
        if not user or not user.email:
            continue
        plain, html_body = email_templates.appointment_rescheduled_email(
            recipient_name=user.first_name or user.full_name,
            provider_name=provider.full_name,
            client_name=client.full_name,
            starts_at=appointment.starts_at,
            timezone_name=tz_name,
            duration_minutes=appointment.duration_minutes,
            rescheduled_by_name=rescheduled_by.full_name,
            video_room_url=appointment.video_room_url,
            is_provider=is_provider,
        )
        send_email(user.email, "Session rescheduled — Tesfa Counseling", plain, html_body)


def get_platform_admin_users():
    from app.models import Organization, OrganizationMember, User, UserRole

    org = Organization.query.filter_by(slug="platform").first()
    if not org:
        return []
    return (
        User.query.join(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.role == UserRole.PLATFORM_ADMIN,
            OrganizationMember.is_active.is_(True),
            User.is_active.is_(True),
        )
        .all()
    )


def get_client_feedback_staff_users():
    """Platform admins and supervisors — staff who can view feedback in the admin portal."""
    from app.models import Organization, OrganizationMember, User, UserRole

    org = Organization.query.filter_by(slug="platform").first()
    if not org:
        return []
    return (
        User.query.join(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.role.in_([UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR]),
            OrganizationMember.is_active.is_(True),
            User.is_active.is_(True),
        )
        .distinct()
        .all()
    )


def notify_client_feedback_backup(feedback, client) -> None:
    """Email/Telegram backup only — primary delivery is in-app via the admin portal."""
    category_label = "Complaint" if feedback.category.value == "complaint" else "Feedback"
    message = (
        f"New client {category_label.lower()} (also in admin portal)\n"
        f"From: {client.full_name} ({client.email})\n"
        f"Subject: {feedback.subject}\n\n"
        f"{feedback.message}"
    )
    staff = get_client_feedback_staff_users()
    plain, html_body = email_templates.client_feedback_email(
        category_label=category_label,
        client_name=client.full_name,
        client_email=client.email,
        subject=feedback.subject,
        message=feedback.message,
    )
    _notify_users_email(staff, f"Client {category_label}: {feedback.subject}", plain, html_body)
    _notify_users_telegram(staff, f"📩 {category_label} from {client.full_name}\n{feedback.subject}")


def notify_testing_feedback(feedback, user: User | None) -> None:
    """Email/Telegram to platform admins during the testing phase."""
    type_labels = {
        "change": "Change request",
        "bug": "Bug",
        "add_feature": "Add feature",
        "confusing": "Confusing",
        "other": "Other",
    }
    type_label = type_labels.get(feedback.feedback_type.value, feedback.feedback_type.value)
    staff = get_platform_admin_users()
    if user:
        who = f"{user.full_name} ({user.email}) · role: {feedback.tester_role}"
        who_short = user.full_name
    else:
        who = f"{feedback.submitter_name or 'Guest'} · role: guest"
        who_short = feedback.submitter_name or "Guest"
    plain = (
        f"Testing feedback ({type_label})\n"
        f"From: {who}\n"
        f"Page: {feedback.page_path}\n"
        f"{feedback.page_title}\n\n"
        f"{feedback.message}"
    )
    _notify_users_email(
        staff,
        f"Testing feedback: {feedback.page_path}",
        plain,
        plain.replace("\n", "<br>"),
    )
    _notify_users_telegram(
        staff,
        f"🧪 Testing · {type_label}\n{who_short} · {feedback.page_path}\n{feedback.message[:200]}",
    )
