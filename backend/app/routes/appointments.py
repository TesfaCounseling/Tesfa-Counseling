import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, make_response, redirect, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.datetime_utils import format_in_timezone, to_iso_utc
from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    AppointmentType,
    ApprovalStatus,
    AvailabilityRule,
    PaymentStatus,
    PricingType,
    ScheduleChangeType,
    SessionMode,
    SessionPricing,
    TraineeIntake,
    User,
    utcnow,
)
from app.services.notifications import (
    notify_appointment_booked,
    notify_appointment_cancelled,
    notify_appointment_rescheduled,
)
from app.services.payment_instructions import generate_payment_reference, remittance_instructions
from app.services.scheduling import assert_slot_available, generate_available_slots
from app.services.video import (
    appointment_video_join_url,
    can_join_video_session,
    ensure_appointment_video_room,
    video_join_blocked_html,
    video_join_window_status,
)
from app.utils import ensure_client_org_membership, get_provider_organization_id, is_platform_admin, log_audit

appointments_bp = Blueprint("appointments", __name__)

MAX_RECEIPT_BYTES = 5 * 1024 * 1024
ALLOWED_RECEIPT_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
}
DIASPORA_PAYMENT_METHODS = {
    "remitly",
    "taptap",
    "wise",
    "western_union",
    "cbe",
    "other",
}


def _get_user() -> User | None:
    return db.session.get(User, uuid.UUID(get_jwt_identity()))


def _schedule_alert_for_client(appt: Appointment, user: User) -> dict | None:
    if appt.client_id != user.id:
        return None
    if not appt.schedule_change_type or not appt.schedule_change_at:
        return None
    if appt.client_schedule_ack_at and appt.client_schedule_ack_at >= appt.schedule_change_at:
        return None
    changed_by = appt.schedule_change_by
    return {
        "type": appt.schedule_change_type.value,
        "changed_at": to_iso_utc(appt.schedule_change_at),
        "changed_by_self": appt.schedule_change_by_id == user.id,
        "changed_by_name": changed_by.full_name if changed_by else None,
    }


def _schedule_alert_for_provider(appt: Appointment, user: User) -> dict | None:
    if appt.provider_id != user.id:
        return None
    if not appt.schedule_change_type or not appt.schedule_change_at:
        return None
    if appt.provider_schedule_ack_at and appt.provider_schedule_ack_at >= appt.schedule_change_at:
        return None
    if appt.schedule_change_by_id == user.id:
        return None
    changed_by = appt.schedule_change_by
    return {
        "type": appt.schedule_change_type.value,
        "changed_at": to_iso_utc(appt.schedule_change_at),
        "changed_by_self": False,
        "changed_by_name": changed_by.full_name if changed_by else None,
    }


def _schedule_alert_for_user(appt: Appointment, user: User) -> dict | None:
    return _schedule_alert_for_client(appt, user) or _schedule_alert_for_provider(appt, user)


def _can_manage_payment(user: User, appt: Appointment) -> bool:
    return bool(user and (user.id == appt.provider_id or is_platform_admin(user)))


def _unique_payment_reference() -> str:
    for _ in range(8):
        ref = generate_payment_reference()
        if not Appointment.query.filter_by(payment_reference=ref).first():
            return ref
    return generate_payment_reference()


def _appointment_to_dict(appt: Appointment, user: User | None = None) -> dict:
    now = datetime.now(timezone.utc)
    has_video = bool(appt.video_room_url)
    payment_clear = appt.payment_is_clear
    can_join = (
        has_video
        and payment_clear
        and can_join_video_session(appt.starts_at, appt.ends_at, now)
    )
    payload = {
        "id": str(appt.id),
        "client_id": str(appt.client_id),
        "provider_id": str(appt.provider_id),
        "supervisor_id": str(appt.supervisor_id) if appt.supervisor_id else None,
        "status": appt.status.value,
        "starts_at": to_iso_utc(appt.starts_at),
        "ends_at": to_iso_utc(appt.ends_at),
        "duration_minutes": appt.duration_minutes,
        "client_timezone": appt.client_timezone,
        "provider_timezone": appt.provider_timezone,
        "client_local_display": format_in_timezone(appt.starts_at, appt.client_timezone),
        "provider_local_display": format_in_timezone(appt.starts_at, appt.provider_timezone),
        "pricing_type": appt.pricing_type.value,
        "amount_cents": appt.amount_cents,
        "currency": appt.currency,
        "payment_status": appt.payment_status.value,
        "payment_reference": appt.payment_reference,
        "payment_method": appt.payment_method,
        "payment_receipt_uploaded": appt.has_payment_receipt,
        "payment_submitted_at": to_iso_utc(appt.payment_submitted_at) if appt.payment_submitted_at else None,
        "payment_verified_at": to_iso_utc(appt.payment_verified_at) if appt.payment_verified_at else None,
        "payment_rejection_reason": appt.payment_rejection_reason,
        "payment_required": appt.payment_status
        in (PaymentStatus.PENDING, PaymentStatus.SUBMITTED, PaymentStatus.REJECTED),
        "provider_name": appt.provider.full_name if appt.provider else None,
        "client_name": appt.client.full_name if appt.client else None,
        "video_room_ready": has_video and payment_clear,
        "video_room_url": appointment_video_join_url(appt.id) if can_join else None,
        "session_mode": appt.session_mode.value,
        "can_join_video": can_join,
    }
    if user:
        alert = _schedule_alert_for_user(appt, user)
        if alert:
            payload["schedule_alert"] = alert
    return payload


def _provider_is_bookable(user: User) -> bool:
    if user.therapist_profile and user.therapist_profile.approval_status == ApprovalStatus.APPROVED:
        return True
    if user.trainee_profile and user.trainee_profile.approval_status == ApprovalStatus.APPROVED:
        return True
    return False


def _backfill_video_rooms(appointments: list) -> None:
    changed = False
    for appt in appointments:
        if appt.status not in (
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
        ):
            continue
        if appt.video_room_url:
            continue
        if ensure_appointment_video_room(appt):
            changed = True
    if changed:
        db.session.commit()


@appointments_bp.route("", methods=["GET"])
@jwt_required()
def list_appointments():
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized", "message": "Invalid or inactive user"}), 401

    scope = request.args.get("scope", "upcoming")

    query = Appointment.query.filter(Appointment.status.in_([
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ]))

    if scope == "provider":
        query = query.filter(Appointment.provider_id == user.id)
    elif scope == "client":
        query = query.filter(Appointment.client_id == user.id)
    else:
        query = query.filter(
            db.or_(Appointment.client_id == user.id, Appointment.provider_id == user.id)
        )

    if request.args.get("upcoming") == "true":
        now = datetime.now(timezone.utc)
        query = query.filter(
            Appointment.ends_at >= now - timedelta(minutes=30),
            Appointment.status.in_([
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.IN_PROGRESS,
            ]),
        )
    elif request.args.get("upcoming") == "false":
        query = query.filter(
            Appointment.starts_at < datetime.now(timezone.utc),
            Appointment.status.in_([
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.COMPLETED,
                AppointmentStatus.IN_PROGRESS,
                AppointmentStatus.NO_SHOW,
            ]),
        ).order_by(Appointment.starts_at.desc())

    if request.args.get("upcoming") != "false":
        appointments = query.order_by(Appointment.starts_at.asc()).limit(50).all()
    else:
        appointments = query.limit(50).all()

    if request.args.get("upcoming") == "true":
        _backfill_video_rooms(appointments)

    return jsonify({"appointments": [_appointment_to_dict(a, user) for a in appointments]})


@appointments_bp.route("/<uuid:appointment_id>/video-join", methods=["GET"])
def join_appointment_video(appointment_id):
    """Short link for emails — redirects to Daily.co only during the join window."""
    appt = db.session.get(Appointment, appointment_id)
    if not appt or not appt.video_room_url:
        return jsonify({"error": "Not Found", "message": "Video room not available"}), 404

    if not appt.payment_is_clear:
        from os import environ

        app_url = environ.get("APP_URL", "https://www.tesfacounseling.com").rstrip("/")
        html = (
            "<!doctype html><html><body style='font-family:sans-serif;padding:2rem'>"
            "<h1>Payment required</h1>"
            "<p>This session is held until remittance payment is verified.</p>"
            f"<p><a href='{app_url}/appointments/{appt.id}/pay'>Complete payment</a></p>"
            "</body></html>"
        )
        return html, 403, {"Content-Type": "text/html; charset=utf-8"}

    status = video_join_window_status(appt.starts_at, appt.ends_at)
    if status != "open":
        html = video_join_blocked_html(
            starts_at=appt.starts_at,
            timezone_name=appt.client_timezone,
            too_early=(status == "early"),
        )
        return html, 403, {"Content-Type": "text/html; charset=utf-8"}

    return redirect(appt.video_room_url, code=302)


@appointments_bp.route("/<uuid:appointment_id>", methods=["GET"])
@jwt_required()
def get_appointment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if user.id not in (appt.client_id, appt.provider_id):
        return jsonify({"error": "Forbidden"}), 403
    _backfill_video_rooms([appt])
    return jsonify({"appointment": _appointment_to_dict(appt, user)})


@appointments_bp.route("", methods=["POST"])
@jwt_required()
def book_appointment():
    user = _get_user()
    data = request.get_json(silent=True) or {}

    try:
        provider_id = uuid.UUID(data["provider_id"])
        starts_at = datetime.fromisoformat(data["starts_at"].replace("Z", "+00:00")).astimezone(timezone.utc)
        duration_minutes = int(data.get("duration_minutes", 50))
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "ValidationError", "message": "Invalid booking data"}), 400

    provider = db.session.get(User, provider_id)
    if not provider or not _provider_is_bookable(provider):
        return jsonify({"error": "Not Found", "message": "Provider not available"}), 404

    ends_at = starts_at + timedelta(minutes=duration_minutes)

    try:
        assert_slot_available(provider_id, starts_at, ends_at)
    except ValueError as exc:
        return jsonify({"error": "Conflict", "message": str(exc)}), 409

    pricing = SessionPricing.query.filter_by(
        provider_id=provider_id, duration_minutes=duration_minutes, is_active=True
    ).first()

    from app.models import PricingType

    pricing_type_str = data.get("pricing_type", pricing.pricing_type.value if pricing else "standard")
    if pricing_type_str == PricingType.PRO_BONO.value:
        return jsonify({"error": "ValidationError", "message": "Pro bono pricing is not available"}), 400

    pricing_type = PricingType(pricing_type_str)
    amount_cents = pricing.amount_cents if pricing else 0
    currency = pricing.currency if pricing else "USD"

    if pricing and pricing.pricing_type == PricingType.PRO_BONO:
        return jsonify({"error": "ValidationError", "message": "This counselor is not accepting bookings"}), 400

    if pricing and pricing.amount_cents <= 0:
        return jsonify({"error": "ValidationError", "message": "Invalid session pricing"}), 400

    if pricing and pricing.pricing_type == PricingType.SLIDING_SCALE:
        requested_cents = data.get("amount_cents")
        if requested_cents is not None:
            try:
                amount_cents = int(requested_cents)
            except (TypeError, ValueError):
                return jsonify({"error": "ValidationError", "message": "Invalid amount"}), 400
            allowed = {pricing.amount_cents, pricing.amount_cents // 2}
            if amount_cents not in allowed:
                return jsonify({"error": "ValidationError", "message": "Invalid sliding scale amount"}), 400
            if amount_cents == pricing.amount_cents // 2:
                pricing_type = PricingType.SLIDING_SCALE

    organization_id = get_provider_organization_id(provider_id)
    if not organization_id:
        return jsonify({"error": "ValidationError", "message": "Provider organization not found"}), 400

    if not user.client_profile:
        return jsonify({"error": "Forbidden", "message": "Only clients can book sessions"}), 403

    if provider.trainee_profile and provider.trainee_profile.approval_status == ApprovalStatus.APPROVED:
        intake = TraineeIntake.query.filter_by(client_id=user.id, trainee_provider_id=provider_id).first()
        if not intake or not intake.completed_at:
            return jsonify({
                "error": "IntakeRequired",
                "message": "Complete the trainee intake form before booking this provider",
            }), 403

    ensure_client_org_membership(user.id, organization_id)

    supervisor_id = None
    if provider.trainee_profile and provider.trainee_profile.supervisor_id:
        supervisor_id = provider.trainee_profile.supervisor_id

    client_tz = data.get("client_timezone") or (user.client_profile.timezone if user.client_profile else "UTC")
    rule = AvailabilityRule.query.filter_by(provider_id=provider_id, is_active=True).first()
    provider_tz = rule.timezone if rule else "UTC"

    session_mode_raw = data.get("session_mode", "video")
    try:
        session_mode = SessionMode(session_mode_raw)
    except ValueError:
        return jsonify({"error": "ValidationError", "message": "Invalid session mode"}), 400

    needs_payment = amount_cents > 0
    appointment = Appointment(
        organization_id=organization_id,
        client_id=user.id,
        provider_id=provider_id,
        supervisor_id=supervisor_id,
        appointment_type=AppointmentType.CLIENT_SESSION,
        status=AppointmentStatus.CONFIRMED,
        starts_at=starts_at,
        ends_at=ends_at,
        duration_minutes=duration_minutes,
        client_timezone=client_tz or "UTC",
        provider_timezone=provider_tz,
        pricing_type=pricing_type,
        amount_cents=amount_cents,
        currency=currency,
        session_mode=session_mode,
        payment_status=PaymentStatus.PENDING if needs_payment else PaymentStatus.NOT_REQUIRED,
        payment_reference=_unique_payment_reference() if needs_payment else None,
    )
    db.session.add(appointment)
    appointment.schedule_change_type = ScheduleChangeType.BOOKED
    appointment.schedule_change_at = utcnow()
    appointment.schedule_change_by_id = user.id
    appointment.client_schedule_ack_at = None
    appointment.provider_schedule_ack_at = None
    log_audit("appointment.booked", "appointment", str(appointment.id), actor_id=user.id)
    db.session.flush()

    ensure_appointment_video_room(appointment)
    # Confirmation emails fire after remittance is verified (or immediately if free).
    if not needs_payment:
        notify_appointment_booked(appointment, user, provider)
    db.session.commit()

    return jsonify({"appointment": _appointment_to_dict(appointment, user)}), 201


@appointments_bp.route("/payment-instructions", methods=["GET"])
@jwt_required()
def get_payment_instructions():
    return jsonify({"instructions": remittance_instructions()})


@appointments_bp.route("/<uuid:appointment_id>/payment", methods=["GET"])
@jwt_required()
def get_appointment_payment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if user.id not in (appt.client_id, appt.provider_id) and not is_platform_admin(user):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(
        {
            "appointment": _appointment_to_dict(appt, user),
            "instructions": remittance_instructions(),
        }
    )


@appointments_bp.route("/<uuid:appointment_id>/payment/receipt", methods=["POST"])
@jwt_required()
def upload_payment_receipt(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if appt.client_id != user.id:
        return jsonify({"error": "Forbidden", "message": "Only the client can upload a receipt"}), 403
    if appt.status == AppointmentStatus.CANCELLED:
        return jsonify({"error": "Conflict", "message": "Cancelled sessions cannot accept payment"}), 409
    if appt.payment_status in (PaymentStatus.VERIFIED, PaymentStatus.NOT_REQUIRED):
        return jsonify({"error": "Conflict", "message": "Payment is already complete"}), 409
    if appt.amount_cents <= 0:
        return jsonify({"error": "Conflict", "message": "No payment is required for this session"}), 409

    method = (request.form.get("payment_method") or "").strip().lower().replace(" ", "_")
    if method not in DIASPORA_PAYMENT_METHODS:
        return jsonify(
            {
                "error": "ValidationError",
                "message": "Choose a payment method (Remitly, TapTap, Wise, Western Union, CBE, or Other)",
            }
        ), 400

    upload = request.files.get("receipt")
    if not upload or not upload.filename:
        return jsonify({"error": "ValidationError", "message": "Receipt file is required"}), 400
    mime_type = (upload.mimetype or "").split(";")[0].strip().lower()
    if mime_type not in ALLOWED_RECEIPT_MIME:
        return jsonify({"error": "ValidationError", "message": "Upload a JPG, PNG, WebP, GIF, or PDF receipt"}), 400
    receipt_data = upload.read(MAX_RECEIPT_BYTES + 1)
    if not receipt_data:
        return jsonify({"error": "ValidationError", "message": "Receipt file is empty"}), 400
    if len(receipt_data) > MAX_RECEIPT_BYTES:
        return jsonify({"error": "ValidationError", "message": "Receipt must be 5MB or smaller"}), 400

    if not appt.payment_reference:
        appt.payment_reference = _unique_payment_reference()
    appt.payment_method = method
    appt.payment_receipt_filename = upload.filename[:255]
    appt.payment_receipt_mime_type = mime_type
    appt.payment_receipt_data = receipt_data
    appt.payment_submitted_at = utcnow()
    appt.payment_status = PaymentStatus.SUBMITTED
    appt.payment_rejection_reason = None
    log_audit("appointment.payment_receipt_uploaded", "appointment", str(appt.id), actor_id=user.id)
    db.session.commit()
    return jsonify({"appointment": _appointment_to_dict(appt, user)})


@appointments_bp.route("/<uuid:appointment_id>/payment/receipt", methods=["GET"])
@jwt_required()
def get_payment_receipt(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if user.id not in (appt.client_id, appt.provider_id) and not is_platform_admin(user):
        return jsonify({"error": "Forbidden"}), 403
    if not appt.has_payment_receipt:
        return jsonify({"error": "Not Found", "message": "No receipt uploaded"}), 404
    response = make_response(appt.payment_receipt_data)
    response.headers["Content-Type"] = appt.payment_receipt_mime_type
    filename = appt.payment_receipt_filename or "receipt"
    response.headers["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


@appointments_bp.route("/<uuid:appointment_id>/payment/verify", methods=["POST"])
@jwt_required()
def verify_payment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if not _can_manage_payment(user, appt):
        return jsonify({"error": "Forbidden", "message": "Only the counselor or admin can verify payment"}), 403
    if appt.payment_status not in (PaymentStatus.SUBMITTED, PaymentStatus.PENDING, PaymentStatus.REJECTED):
        return jsonify({"error": "Conflict", "message": "This payment cannot be verified in its current state"}), 409

    data = request.get_json(silent=True) or {}
    action = (data.get("action") or "").strip().lower()
    if action not in ("approve", "reject"):
        return jsonify({"error": "ValidationError", "message": "action must be approve or reject"}), 400

    if action == "reject":
        reason = (data.get("reason") or "").strip()
        if not reason:
            return jsonify({"error": "ValidationError", "message": "Rejection reason is required"}), 400
        appt.payment_status = PaymentStatus.REJECTED
        appt.payment_rejection_reason = reason[:1000]
        appt.payment_verified_at = None
        appt.payment_verified_by_id = None
        log_audit("appointment.payment_rejected", "appointment", str(appt.id), reason, actor_id=user.id)
        db.session.commit()
        return jsonify({"appointment": _appointment_to_dict(appt, user)})

    if not appt.has_payment_receipt:
        return jsonify({"error": "ValidationError", "message": "Client must upload a receipt before approval"}), 400

    was_unverified = appt.payment_status != PaymentStatus.VERIFIED
    appt.payment_status = PaymentStatus.VERIFIED
    appt.payment_verified_at = utcnow()
    appt.payment_verified_by_id = user.id
    appt.payment_rejection_reason = None
    log_audit("appointment.payment_verified", "appointment", str(appt.id), actor_id=user.id)
    if was_unverified:
        notify_appointment_booked(appt, appt.client, appt.provider)
    db.session.commit()
    return jsonify({"appointment": _appointment_to_dict(appt, user)})


@appointments_bp.route("/<uuid:appointment_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_appointment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404

    if user.id not in (appt.client_id, appt.provider_id):
        return jsonify({"error": "Forbidden"}), 403

    if appt.status == AppointmentStatus.CANCELLED:
        return jsonify({"appointment": _appointment_to_dict(appt, user)})

    data = request.get_json(silent=True) or {}
    appt.status = AppointmentStatus.CANCELLED
    appt.cancellation_reason = data.get("reason", "")
    appt.cancelled_by_id = user.id

    notify_appointment_cancelled(appt, appt.client, appt.provider, user)
    log_audit("appointment.cancelled", "appointment", str(appt.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"appointment": _appointment_to_dict(appt, user)})


@appointments_bp.route("/<uuid:appointment_id>/reschedule", methods=["POST"])
@jwt_required()
def reschedule_appointment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404

    if user.id not in (appt.client_id, appt.provider_id):
        return jsonify({"error": "Forbidden"}), 403

    if appt.status == AppointmentStatus.CANCELLED:
        return jsonify({"error": "Conflict", "message": "Cancelled sessions cannot be rescheduled"}), 409

    data = request.get_json(silent=True) or {}
    try:
        starts_at = datetime.fromisoformat(data["starts_at"].replace("Z", "+00:00")).astimezone(timezone.utc)
        duration_minutes = int(data.get("duration_minutes", appt.duration_minutes))
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "ValidationError", "message": "Invalid reschedule data"}), 400

    ends_at = starts_at + timedelta(minutes=duration_minutes)

    try:
        assert_slot_available(appt.provider_id, starts_at, ends_at, exclude_appointment_id=appt.id)
    except ValueError as exc:
        return jsonify({"error": "Conflict", "message": str(exc)}), 409

    appt.starts_at = starts_at
    appt.ends_at = ends_at
    appt.duration_minutes = duration_minutes
    appt.status = AppointmentStatus.CONFIRMED
    appt.video_room_url = None
    appt.video_room_name = None
    appt.schedule_change_type = ScheduleChangeType.RESCHEDULED
    appt.schedule_change_at = utcnow()
    appt.schedule_change_by_id = user.id
    appt.client_schedule_ack_at = None
    if user.id == appt.provider_id:
        appt.provider_schedule_ack_at = utcnow()
    else:
        appt.provider_schedule_ack_at = None

    ensure_appointment_video_room(appt)
    notify_appointment_rescheduled(appt, appt.client, appt.provider, user)
    log_audit("appointment.rescheduled", "appointment", str(appt.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"appointment": _appointment_to_dict(appt, user)})


@appointments_bp.route("/<uuid:appointment_id>/ack-schedule-change", methods=["POST"])
@jwt_required()
def acknowledge_schedule_change(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if user.id == appt.client_id:
        appt.client_schedule_ack_at = utcnow()
    elif user.id == appt.provider_id:
        appt.provider_schedule_ack_at = utcnow()
    else:
        return jsonify({"error": "Forbidden"}), 403
    db.session.commit()
    return jsonify({"appointment": _appointment_to_dict(appt, user)})


@appointments_bp.route("/<uuid:appointment_id>/complete", methods=["POST"])
@jwt_required()
def complete_appointment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if appt.provider_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    if appt.status == AppointmentStatus.CANCELLED:
        return jsonify({"error": "Conflict", "message": "Cancelled sessions cannot be completed"}), 409

    appt.status = AppointmentStatus.COMPLETED
    log_audit("appointment.completed", "appointment", str(appt.id), actor_id=user.id)
    db.session.commit()
    return jsonify({"appointment": _appointment_to_dict(appt, user)})


@appointments_bp.route("/providers/<uuid:provider_id>/slots", methods=["GET"])
@jwt_required()
def provider_slots(provider_id):
    duration = int(request.args.get("duration_minutes", 50))
    client_tz = request.args.get("client_timezone", "UTC")

    provider = db.session.get(User, provider_id)
    if not provider or not _provider_is_bookable(provider):
        return jsonify({"error": "Not Found"}), 404

    slots = generate_available_slots(provider_id, duration, client_tz)
    return jsonify({"slots": slots, "duration_minutes": duration})
