"""Send due appointment reminders — run via cron or: flask send-reminders"""
import click
from datetime import datetime, timedelta, timezone

from flask.cli import with_appcontext

from app.extensions import db
from app.models import Appointment, AppointmentStatus, TelegramLink
from app.services.notifications import send_telegram_message


@click.command("send-reminders")
@with_appcontext
def send_reminders_command():
    now = datetime.now(timezone.utc)
    window_24h = now + timedelta(hours=24)
    window_1h = now + timedelta(hours=1)

    due_24h = Appointment.query.filter(
        Appointment.status == AppointmentStatus.CONFIRMED,
        Appointment.reminder_24h_sent.is_(False),
        Appointment.starts_at <= window_24h,
        Appointment.starts_at > now,
    ).all()

    due_1h = Appointment.query.filter(
        Appointment.status == AppointmentStatus.CONFIRMED,
        Appointment.reminder_1h_sent.is_(False),
        Appointment.starts_at <= window_1h,
        Appointment.starts_at > now,
    ).all()

    sent = 0
    for appt in due_24h:
        sent += _send_reminder(appt, "24 hours")
        appt.reminder_24h_sent = True

    for appt in due_1h:
        sent += _send_reminder(appt, "1 hour")
        appt.reminder_1h_sent = True

    db.session.commit()
    click.echo(f"Sent {sent} reminder(s)")


def _send_reminder(appt: Appointment, label: str) -> int:
    count = 0
    message = (
        f"⏰ Reminder: session in {label}\n"
        f"With: {appt.provider.full_name}\n"
        f"At: {appt.starts_at.strftime('%Y-%m-%d %H:%M UTC')}"
    )
    for user in (appt.client, appt.provider):
        link = TelegramLink.query.filter_by(user_id=user.id).first()
        if link and send_telegram_message(link.telegram_chat_id, message):
            count += 1
    return count
