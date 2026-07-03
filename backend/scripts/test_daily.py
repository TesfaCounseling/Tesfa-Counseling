"""Run on Render shell to verify DAILY_API_KEY: python scripts/test_daily.py"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.video import check_daily_api_key, ensure_appointment_video_room
from app import create_app
from app.extensions import db
from app.models import Appointment, AppointmentStatus
from datetime import datetime, timedelta, timezone


def main() -> None:
    app = create_app()
    with app.app_context():
        print("Daily check:", check_daily_api_key())

        now = datetime.now(timezone.utc)
        upcoming = (
            Appointment.query.filter(
                Appointment.ends_at >= now - timedelta(minutes=30),
                Appointment.status.in_([
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.IN_PROGRESS,
                ]),
            )
            .order_by(Appointment.starts_at.asc())
            .limit(5)
            .all()
        )
        print(f"Upcoming/in-window appointments: {len(upcoming)}")
        for appt in upcoming:
            before = appt.video_room_url
            url = ensure_appointment_video_room(appt)
            print(f"  {appt.id} starts={appt.starts_at} url_before={bool(before)} url_after={bool(url)}")
        db.session.commit()
        print("Done.")


if __name__ == "__main__":
    main()
