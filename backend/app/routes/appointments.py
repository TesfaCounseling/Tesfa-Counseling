import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.datetime_utils import format_in_timezone, to_iso_utc
from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    AppointmentType,
    ApprovalStatus,
    AvailabilityRule,
    PricingType,
    SessionMode,
    SessionPricing,
    TraineeIntake,
    User,
)
from app.services.notifications import (
    notify_appointment_booked,
    notify_appointment_cancelled,
    notify_appointment_rescheduled,
)
from app.services.scheduling import assert_slot_available, generate_available_slots
from app.services.video import can_join_video_session, ensure_appointment_video_room
from app.utils import ensure_client_org_membership, get_provider_organization_id, log_audit

appointments_bp = Blueprint("appointments", __name__)


def _get_user() -> User | None:
    return db.session.get(User, uuid.UUID(get_jwt_identity()))


def _appointment_to_dict(appt: Appointment) -> dict:
    now = datetime.now(timezone.utc)
    return {
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
        "provider_name": appt.provider.full_name if appt.provider else None,
        "client_name": appt.client.full_name if appt.client else None,
        "video_room_url": appt.video_room_url,
        "session_mode": appt.session_mode.value,
        "can_join_video": bool(appt.video_room_url and can_join_video_session(appt.starts_at, appt.ends_at, now)),
    }


def _provider_is_bookable(user: User) -> bool:
    if user.therapist_profile and user.therapist_profile.approval_status == ApprovalStatus.APPROVED:
        return True
    if user.trainee_profile and user.trainee_profile.approval_status == ApprovalStatus.APPROVED:
        return True
    return False


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
        query = query.filter(
            Appointment.starts_at >= datetime.now(timezone.utc),
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
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
    return jsonify({"appointments": [_appointment_to_dict(a) for a in appointments]})


@appointments_bp.route("/<uuid:appointment_id>", methods=["GET"])
@jwt_required()
def get_appointment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404
    if user.id not in (appt.client_id, appt.provider_id):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify({"appointment": _appointment_to_dict(appt)})


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

    pricing_type = PricingType(data.get("pricing_type", pricing.pricing_type.value if pricing else "standard"))
    amount_cents = pricing.amount_cents if pricing else 0
    currency = pricing.currency if pricing else "USD"

    if pricing and pricing.pricing_type == PricingType.SLIDING_SCALE:
        requested_cents = data.get("amount_cents")
        if requested_cents is not None:
            try:
                amount_cents = int(requested_cents)
            except (TypeError, ValueError):
                return jsonify({"error": "ValidationError", "message": "Invalid amount"}), 400
            allowed = {0, pricing.amount_cents, pricing.amount_cents // 2}
            if amount_cents not in allowed:
                return jsonify({"error": "ValidationError", "message": "Invalid sliding scale amount"}), 400
            if amount_cents == 0:
                pricing_type = PricingType.PRO_BONO
            elif amount_cents == pricing.amount_cents // 2:
                pricing_type = PricingType.SLIDING_SCALE
        elif pricing_type == PricingType.PRO_BONO:
            amount_cents = 0
    elif pricing_type == PricingType.PRO_BONO:
        amount_cents = 0

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
    )
    db.session.add(appointment)
    log_audit("appointment.booked", "appointment", actor_id=user.id)
    db.session.flush()

    ensure_appointment_video_room(appointment)
    notify_appointment_booked(appointment, user, provider)
    db.session.commit()

    return jsonify({"appointment": _appointment_to_dict(appointment)}), 201


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
        return jsonify({"appointment": _appointment_to_dict(appt)})

    data = request.get_json(silent=True) or {}
    appt.status = AppointmentStatus.CANCELLED
    appt.cancellation_reason = data.get("reason", "")
    appt.cancelled_by_id = user.id

    notify_appointment_cancelled(appt, appt.client, appt.provider, user)
    log_audit("appointment.cancelled", "appointment", str(appt.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"appointment": _appointment_to_dict(appt)})


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

    ensure_appointment_video_room(appt)
    notify_appointment_rescheduled(appt, appt.client, appt.provider, user)
    log_audit("appointment.rescheduled", "appointment", str(appt.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"appointment": _appointment_to_dict(appt)})


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
    return jsonify({"appointment": _appointment_to_dict(appt)})


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
