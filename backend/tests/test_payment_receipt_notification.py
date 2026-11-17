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


def _seed_paid_appointment(app, client_id, provider_id, reference=None):
    reference = reference or f"TESFA-{uuid.uuid4().hex[:6].upper()}"
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


def _upload(client, appointment_id, token, note=None, filename="receipt.pdf"):
    data = {
        "payment_method": "wise",
        "receipt": (BytesIO(b"%PDF-1.4 receipt"), filename, "application/pdf"),
    }
    if note is not None:
        data["payment_note"] = note
    return client.post(
        f"/api/v1/appointments/{appointment_id}/payment/receipt",
        data=data,
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )


def test_receipt_upload_emails_counselor_with_booking_details(client, app):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client", first_name="Maya", last_name="Client")
    reference = f"TESFA-{uuid.uuid4().hex[:6].upper()}"
    appt_id = _seed_paid_appointment(app, client_user["user"]["id"], therapist["user"]["id"], reference)

    with patch("app.services.notifications.send_email", return_value=True) as send_email:
        response = _upload(client, appt_id, client_user["access_token"])

    assert response.status_code == 200, response.get_json()
    assert response.get_json()["appointment"]["payment_status"] == "submitted"
    send_email.assert_called_once()
    to_address, subject, body, html_body = send_email.call_args.args
    assert to_address == therapist["user"]["email"]
    assert reference in subject
    assert reference in body
    assert "Maya Client" in body
    assert "Africa/Addis_Ababa" in body or "AM" in body or "PM" in body
    assert "/dashboard" in body
    assert reference in html_body
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


def test_payment_note_saved_with_receipt_and_kept_after_approve(client, app):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client")
    reference = f"TESFA-{uuid.uuid4().hex[:6].upper()}"
    appt_id = _seed_paid_appointment(
        app, client_user["user"]["id"], therapist["user"]["id"], reference
    )
    note = "Sender Maya / Wise 9988"

    uploaded = _upload(client, appt_id, client_user["access_token"], note=note)
    assert uploaded.status_code == 200, uploaded.get_json()
    uploaded_appt = uploaded.get_json()["appointment"]
    assert uploaded_appt["payment_client_note"] == note
    assert uploaded_appt["payment_reference"] == reference
    assert uploaded_appt["payment_status"] == "submitted"

    with app.app_context():
        stored = db.session.get(Appointment, uuid.UUID(appt_id))
        assert stored is not None
        assert stored.payment_client_note == note
        assert stored.payment_reference == reference

    payment = client.get(
        f"/api/v1/appointments/{appt_id}/payment",
        headers={"Authorization": f"Bearer {client_user['access_token']}"},
    )
    assert payment.status_code == 200
    assert payment.get_json()["appointment"]["payment_client_note"] == note

    approved = client.post(
        f"/api/v1/appointments/{appt_id}/payment/verify",
        json={"action": "approve"},
        headers={"Authorization": f"Bearer {therapist['access_token']}"},
    )
    assert approved.status_code == 200, approved.get_json()
    approved_appt = approved.get_json()["appointment"]
    assert approved_appt["payment_status"] == "verified"
    assert approved_appt["payment_client_note"] == note
    assert approved_appt["payment_reference"] == reference

    listed = client.get(
        "/api/v1/appointments",
        headers={"Authorization": f"Bearer {therapist['access_token']}"},
    )
    assert listed.status_code == 200
    match = next(a for a in listed.get_json()["appointments"] if a["id"] == appt_id)
    assert match["payment_client_note"] == note
    assert match["payment_status"] == "verified"


def test_receipt_upload_stores_reference_in_filename(client, app):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client")
    reference = f"TESFA-{uuid.uuid4().hex[:6].upper()}"
    appt_id = _seed_paid_appointment(
        app, client_user["user"]["id"], therapist["user"]["id"], reference
    )

    uploaded = _upload(
        client, appt_id, client_user["access_token"], filename="My Receipt (1).PDF"
    )
    assert uploaded.status_code == 200, uploaded.get_json()
    body = uploaded.get_json()["appointment"]
    assert body["payment_reference"] == reference
    assert body["payment_receipt_filename"] == f"{reference}_receipt.pdf"
    assert body["payment_client_note"] is None

    with app.app_context():
        stored = db.session.get(Appointment, uuid.UUID(appt_id))
        assert stored.payment_reference == reference
        assert stored.payment_receipt_filename == f"{reference}_receipt.pdf"

    receipt = client.get(
        f"/api/v1/appointments/{appt_id}/payment/receipt",
        headers={"Authorization": f"Bearer {client_user['access_token']}"},
    )
    assert receipt.status_code == 200
    assert f"{reference}_receipt.pdf" in receipt.headers.get("Content-Disposition", "")


def test_receipt_filename_avoids_collisions(client, app):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client")
    reference = f"TESFA-{uuid.uuid4().hex[:6].upper()}"
    appt_id = _seed_paid_appointment(
        app, client_user["user"]["id"], therapist["user"]["id"], reference
    )
    other_id = _seed_paid_appointment(
        app, client_user["user"]["id"], therapist["user"]["id"], f"TESFA-{uuid.uuid4().hex[:6].upper()}"
    )
    with app.app_context():
        other = db.session.get(Appointment, uuid.UUID(other_id))
        other.payment_receipt_filename = f"{reference}_receipt.pdf"
        db.session.commit()

    uploaded = _upload(client, appt_id, client_user["access_token"], filename="receipt.pdf")
    assert uploaded.status_code == 200, uploaded.get_json()
    assert uploaded.get_json()["appointment"]["payment_receipt_filename"] == f"{reference}_receipt_2.pdf"


def test_list_appointments_filter_by_payment_reference(client, app):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client")
    match_ref = f"TESFA-S{uuid.uuid4().hex[:5].upper()}"
    other_ref = f"TESFA-O{uuid.uuid4().hex[:5].upper()}"
    match_id = _seed_paid_appointment(
        app, client_user["user"]["id"], therapist["user"]["id"], match_ref
    )
    _seed_paid_appointment(app, client_user["user"]["id"], therapist["user"]["id"], other_ref)

    headers = {"Authorization": f"Bearer {therapist['access_token']}"}
    listed = client.get(f"/api/v1/appointments?q={match_ref.split('-', 1)[1]}", headers=headers)
    assert listed.status_code == 200
    ids = [a["id"] for a in listed.get_json()["appointments"]]
    assert ids == [match_id]

    exact = client.get(f"/api/v1/appointments?q={match_ref}", headers=headers)
    assert [a["id"] for a in exact.get_json()["appointments"]] == [match_id]

    miss = client.get("/api/v1/appointments?q=TESFA-NOPE", headers=headers)
    assert miss.get_json()["appointments"] == []


def test_dashboard_alert_payload_submitted_then_cleared_on_approve(client, app):
    therapist = _register(client, "therapist")
    client_user = _register(client, "client", first_name="Maya", last_name="Client")
    reference = f"TESFA-{uuid.uuid4().hex[:6].upper()}"
    appt_id = _seed_paid_appointment(
        app, client_user["user"]["id"], therapist["user"]["id"], reference
    )
    client_headers = {"Authorization": f"Bearer {client_user['access_token']}"}
    provider_headers = {"Authorization": f"Bearer {therapist['access_token']}"}

    before = client.get(f"/api/v1/appointments/{appt_id}", headers=client_headers)
    assert before.status_code == 200
    pending = before.get_json()["appointment"]
    assert pending["payment_status"] == "pending"
    assert pending["payment_required"] is True
    assert pending["payment_reference"] == reference

    uploaded = _upload(client, appt_id, client_user["access_token"])
    assert uploaded.status_code == 200
    after_upload = uploaded.get_json()["appointment"]
    assert after_upload["payment_status"] == "submitted"
    assert after_upload["payment_required"] is False

    listed = client.get("/api/v1/appointments", headers=provider_headers)
    match = next(a for a in listed.get_json()["appointments"] if a["id"] == appt_id)
    assert match["payment_status"] == "submitted"
    assert match["payment_reference"] == reference
    assert match["client_name"] == "Maya Client"
    assert match["payment_receipt_uploaded"] is True
    assert match["provider_local_display"]

    approved = client.post(
        f"/api/v1/appointments/{appt_id}/payment/verify",
        json={"action": "approve"},
        headers=provider_headers,
    )
    assert approved.status_code == 200
    assert approved.get_json()["appointment"]["payment_status"] == "verified"

    listed_after = client.get("/api/v1/appointments", headers=provider_headers)
    match_after = next(a for a in listed_after.get_json()["appointments"] if a["id"] == appt_id)
    assert match_after["payment_status"] == "verified"
    assert match_after["payment_required"] is False
