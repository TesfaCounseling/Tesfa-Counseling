from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from io import BytesIO
from unittest.mock import patch

from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    AppointmentType,
    ApprovalStatus,
    PaymentStatus,
    PricingType,
    User,
)
from app.utils import get_provider_organization_id


def _register(client, role, **overrides):
    payload = {
        "email": f"{role}-{uuid.uuid4().hex[:8]}@example.com",
        "password": "password123",
        "first_name": "Ada" if role == "client" else "Jay",
        "last_name": "Tester",
        "role": role,
        "timezone": "Africa/Addis_Ababa" if role == "therapist" else "America/Toronto",
    }
    if role == "therapist":
        payload["languages"] = "English"
        payload["specializations"] = "Anxiety"
    payload.update(overrides)
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def _seed_paid_appointment(app, client_id, provider_id, reference="TESFA-AB12"):
    starts = datetime.now(timezone.utc) + timedelta(days=3)
    with app.app_context():
        provider = db.session.get(User, uuid.UUID(provider_id))
        provider.therapist_profile.approval_status = ApprovalStatus.APPROVED
        org_id = get_provider_organization_id(uuid.UUID(provider_id))
        appt = Appointment(
            organization_id=org_id,
            client_id=uuid.UUID(client_id),
            provider_id=uuid.UUID(provider_id),
            appointment_type=AppointmentType.CLIENT_SESSION,
            status=AppointmentStatus.CONFIRMED,
            starts_at=starts,
            ends_at=starts + timedelta(minutes=50),
            duration_minutes=50,
            client_timezone="America/Toronto",
            provider_timezone="Africa/Addis_Ababa",
            pricing_type=PricingType.STANDARD,
            amount_cents=8000,
            currency="USD",
            payment_status=PaymentStatus.PENDING,
            payment_reference=reference,
        )
        db.session.add(appt)
        db.session.commit()
        return str(appt.id)


def _upload(client, appointment_id, token):
    return client.post(
        f"/api/v1/appointments/{appointment_id}/payment/receipt",
        data={
            "payment_method": "wise",
            "receipt": (BytesIO(b"%PDF-1.4 receipt"), "receipt.pdf", "application/pdf"),
        },
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )


def test_receipt_upload_emails_counselor_with_booking_details(client, app):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client", first_name="Maya", last_name="Client")
    appt_id = _seed_paid_appointment(app, client_user["user"]["id"], therapist["user"]["id"], "TESFA-ZZ99")

    with patch("app.services.notifications.send_email", return_value=True) as send_email:
        response = _upload(client, appt_id, client_user["access_token"])

    assert response.status_code == 200, response.get_json()
    assert response.get_json()["appointment"]["payment_status"] == "submitted"
    send_email.assert_called_once()
    to_address, subject, body, html_body = send_email.call_args.args
    assert to_address == therapist["user"]["email"]
    assert "TESFA-ZZ99" in subject
    assert "TESFA-ZZ99" in body
    assert "Maya Client" in body
    assert "Africa/Addis_Ababa" in body or "AM" in body or "PM" in body
    assert "/dashboard" in body
    assert "TESFA-ZZ99" in html_body
    assert "/dashboard" in html_body


def test_receipt_upload_succeeds_when_email_raises(client, app, caplog):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client")
    appt_id = _seed_paid_appointment(app, client_user["user"]["id"], therapist["user"]["id"])

    with patch("app.routes.appointments.notify_payment_receipt_uploaded", side_effect=RuntimeError("smtp down")):
        response = _upload(client, appt_id, client_user["access_token"])

    assert response.status_code == 200, response.get_json()
    assert response.get_json()["appointment"]["payment_status"] == "submitted"
    assert "Payment receipt notification failed" in caplog.text
