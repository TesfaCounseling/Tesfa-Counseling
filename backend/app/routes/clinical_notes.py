import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.datetime_utils import as_utc, to_iso_utc
from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    ClinicalNote,
    ClinicalNoteStatus,
    TraineeProfile,
    User,
    UserRole,
)
from app.utils import log_audit, user_has_role

clinical_notes_bp = Blueprint("clinical_notes", __name__)


def _get_user() -> User | None:
    return db.session.get(User, uuid.UUID(get_jwt_identity()))


def _note_to_dict(note: ClinicalNote) -> dict:
    appt = note.appointment
    return {
        "id": str(note.id),
        "appointment_id": str(note.appointment_id),
        "author_id": str(note.author_id),
        "author_name": note.author.full_name if note.author else None,
        "client_id": str(note.client_id),
        "client_name": note.client.full_name if note.client else None,
        "subjective": note.subjective,
        "objective": note.objective,
        "assessment": note.assessment,
        "plan": note.plan,
        "status": note.status.value,
        "submitted_at": note.submitted_at.isoformat() if note.submitted_at else None,
        "cosigned_by_id": str(note.cosigned_by_id) if note.cosigned_by_id else None,
        "cosigned_by_name": note.cosigned_by.full_name if note.cosigned_by else None,
        "cosigned_at": note.cosigned_at.isoformat() if note.cosigned_at else None,
        "supervisor_comment": note.supervisor_comment,
        "session_at": to_iso_utc(appt.starts_at) if appt else None,
        "duration_minutes": appt.duration_minutes if appt else None,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
    }


def _session_to_dict(appt: Appointment, note: ClinicalNote | None) -> dict:
    return {
        "appointment_id": str(appt.id),
        "starts_at": to_iso_utc(appt.starts_at),
        "ends_at": to_iso_utc(appt.ends_at),
        "duration_minutes": appt.duration_minutes,
        "status": appt.status.value,
        "client_id": str(appt.client_id),
        "client_name": appt.client.full_name if appt.client else None,
        "provider_id": str(appt.provider_id),
        "provider_name": appt.provider.full_name if appt.provider else None,
        "note_id": str(note.id) if note else None,
        "note_status": note.status.value if note else None,
    }


def _is_trainee(user: User) -> bool:
    return user.trainee_profile is not None and user.therapist_profile is None


def _can_supervise(user: User, appt: Appointment) -> bool:
    if appt.supervisor_id and appt.supervisor_id == user.id:
        return True
    provider = appt.provider
    if provider and provider.trainee_profile and provider.trainee_profile.supervisor_id == user.id:
        return True
    return False


def _session_ready_for_notes(appt: Appointment) -> bool:
    if appt.status == AppointmentStatus.CANCELLED:
        return False
    now = datetime.now(timezone.utc)
    return appt.status == AppointmentStatus.COMPLETED or as_utc(appt.ends_at) <= now


def _is_provider(user: User) -> bool:
    return user.therapist_profile is not None or user.trainee_profile is not None


@clinical_notes_bp.route("/sessions", methods=["GET"])
@jwt_required()
def list_note_sessions():
    """Provider: past sessions that may need clinical notes."""
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not _is_provider(user):
        return jsonify({"error": "Forbidden", "message": "Session notes are for counselors and trainees only"}), 403

    now = datetime.now(timezone.utc)
    appts = (
        Appointment.query.filter(
            Appointment.provider_id == user.id,
            Appointment.status.in_([
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.COMPLETED,
                AppointmentStatus.IN_PROGRESS,
            ]),
            Appointment.ends_at <= now,
        )
        .order_by(Appointment.starts_at.desc())
        .limit(50)
        .all()
    )

    if appts:
        appt_ids = [a.id for a in appts]
        note_map = {
            n.appointment_id: n
            for n in ClinicalNote.query.filter(ClinicalNote.appointment_id.in_(appt_ids)).all()
        }
    else:
        note_map = {}

    return jsonify({"sessions": [_session_to_dict(a, note_map.get(a.id)) for a in appts]})


def _is_supervisor_user(user: User) -> bool:
    if user_has_role(user, UserRole.SUPERVISOR):
        return True
    return TraineeProfile.query.filter_by(supervisor_id=user.id).first() is not None


def _pending_notes_for_supervisor(user: User) -> list[ClinicalNote]:
    notes = (
        ClinicalNote.query.filter_by(status=ClinicalNoteStatus.SUBMITTED)
        .order_by(ClinicalNote.submitted_at.asc())
        .all()
    )
    return [n for n in notes if _can_supervise(user, n.appointment)]


@clinical_notes_bp.route("/supervision/overview", methods=["GET"])
@jwt_required()
def supervision_overview():
    """Supervisor home: assigned trainees and pending cosign count."""
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not _is_supervisor_user(user):
        return jsonify({"error": "Forbidden", "message": "Supervision overview is for supervisors only"}), 403

    trainees = (
        TraineeProfile.query.filter_by(supervisor_id=user.id)
        .order_by(TraineeProfile.created_at.asc())
        .all()
    )
    pending_notes = _pending_notes_for_supervisor(user)
    pending_by_trainee: dict[uuid.UUID, int] = {}
    for note in pending_notes:
        provider_id = note.appointment.provider_id
        pending_by_trainee[provider_id] = pending_by_trainee.get(provider_id, 0) + 1

    trainee_rows = []
    for profile in trainees:
        trainee_user = profile.user
        trainee_rows.append(
            {
                "id": str(trainee_user.id),
                "full_name": trainee_user.full_name,
                "email": trainee_user.email,
                "program_name": profile.program_name,
                "languages": profile.languages,
                "approval_status": profile.approval_status.value,
                "pending_notes": pending_by_trainee.get(trainee_user.id, 0),
            }
        )

    return jsonify(
        {
            "trainees": trainee_rows,
            "pending_count": len(pending_notes),
            "pending_notes": [_note_to_dict(n) for n in pending_notes[:5]],
        }
    )


@clinical_notes_bp.route("/supervision", methods=["GET"])
@jwt_required()
def list_supervision_queue():
    """Supervisor: notes awaiting cosign."""
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if not _is_supervisor_user(user):
        return jsonify({"error": "Forbidden", "message": "Supervision queue is for supervisors only"}), 403

    visible = _pending_notes_for_supervisor(user)
    return jsonify({"notes": [_note_to_dict(n) for n in visible]})


@clinical_notes_bp.route("/by-appointment/<uuid:appointment_id>", methods=["GET"])
@jwt_required()
def get_note_by_appointment(appointment_id):
    user = _get_user()
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        return jsonify({"error": "Not Found"}), 404

    note = ClinicalNote.query.filter_by(appointment_id=appointment_id).first()
    if user.id not in (appt.provider_id, appt.client_id) and not (note and _can_supervise(user, appt)):
        if not _can_supervise(user, appt):
            return jsonify({"error": "Forbidden"}), 403

    return jsonify({
        "session": _session_to_dict(appt, note),
        "note": _note_to_dict(note) if note else None,
    })


@clinical_notes_bp.route("", methods=["POST"])
@jwt_required()
def create_note():
    user = _get_user()
    data = request.get_json(silent=True) or {}
    try:
        appointment_id = uuid.UUID(data["appointment_id"])
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "ValidationError", "message": "appointment_id required"}), 400

    appt = db.session.get(Appointment, appointment_id)
    if not appt or appt.provider_id != user.id:
        return jsonify({"error": "Forbidden", "message": "Only the session provider can write notes"}), 403
    if not _session_ready_for_notes(appt):
        return jsonify({"error": "Conflict", "message": "Notes are available after the session ends"}), 409
    if ClinicalNote.query.filter_by(appointment_id=appointment_id).first():
        return jsonify({"error": "Conflict", "message": "Note already exists for this session"}), 409

    note = ClinicalNote(
        appointment_id=appt.id,
        author_id=user.id,
        client_id=appt.client_id,
        organization_id=appt.organization_id,
        subjective=(data.get("subjective") or "").strip() or None,
        objective=(data.get("objective") or "").strip() or None,
        assessment=(data.get("assessment") or "").strip() or None,
        plan=(data.get("plan") or "").strip() or None,
    )
    db.session.add(note)
    log_audit("clinical_note.created", "clinical_note", str(note.id), actor_id=user.id)
    db.session.commit()
    return jsonify({"note": _note_to_dict(note)}), 201


@clinical_notes_bp.route("/<uuid:note_id>", methods=["GET", "PATCH"])
@jwt_required()
def get_or_update_note(note_id):
    user = _get_user()
    note = db.session.get(ClinicalNote, note_id)
    if not note:
        return jsonify({"error": "Not Found"}), 404

    appt = note.appointment
    if request.method == "GET":
        if user.id not in (note.author_id, appt.provider_id) and not _can_supervise(user, appt):
            return jsonify({"error": "Forbidden"}), 403
        return jsonify({"note": _note_to_dict(note), "session": _session_to_dict(appt, note)})

    if note.author_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    if note.status != ClinicalNoteStatus.DRAFT:
        return jsonify({"error": "Conflict", "message": "Only draft notes can be edited"}), 409

    data = request.get_json(silent=True) or {}
    for field in ("subjective", "objective", "assessment", "plan"):
        if field in data:
            setattr(note, field, (data[field] or "").strip() or None)

    db.session.commit()
    return jsonify({"note": _note_to_dict(note)})


@clinical_notes_bp.route("/<uuid:note_id>/submit", methods=["POST"])
@jwt_required()
def submit_note(note_id):
    user = _get_user()
    note = db.session.get(ClinicalNote, note_id)
    if not note or note.author_id != user.id:
        return jsonify({"error": "Forbidden"}), 403
    if note.status != ClinicalNoteStatus.DRAFT:
        return jsonify({"error": "Conflict", "message": "Note already submitted"}), 409

    if not any([note.subjective, note.objective, note.assessment, note.plan]):
        return jsonify({"error": "ValidationError", "message": "Add note content before submitting"}), 400

    now = datetime.now(timezone.utc)
    note.submitted_at = now

    if _is_trainee(user):
        note.status = ClinicalNoteStatus.SUBMITTED
        log_audit("clinical_note.submitted", "clinical_note", str(note.id), actor_id=user.id)
    else:
        note.status = ClinicalNoteStatus.COSIGNED
        note.cosigned_by_id = user.id
        note.cosigned_at = now
        log_audit("clinical_note.finalized", "clinical_note", str(note.id), actor_id=user.id)

    if note.appointment.status != AppointmentStatus.COMPLETED:
        note.appointment.status = AppointmentStatus.COMPLETED

    db.session.commit()
    return jsonify({"note": _note_to_dict(note)})


@clinical_notes_bp.route("/<uuid:note_id>/cosign", methods=["POST"])
@jwt_required()
def cosign_note(note_id):
    user = _get_user()
    note = db.session.get(ClinicalNote, note_id)
    if not note:
        return jsonify({"error": "Not Found"}), 404
    if note.status != ClinicalNoteStatus.SUBMITTED:
        return jsonify({"error": "Conflict", "message": "Note is not awaiting cosign"}), 409
    if not _can_supervise(user, note.appointment):
        return jsonify({"error": "Forbidden", "message": "You are not the assigned supervisor"}), 403

    data = request.get_json(silent=True) or {}
    comment = (data.get("supervisor_comment") or "").strip() or None

    now = datetime.now(timezone.utc)
    note.status = ClinicalNoteStatus.COSIGNED
    note.cosigned_by_id = user.id
    note.cosigned_at = now
    note.supervisor_comment = comment
    note.appointment.status = AppointmentStatus.COMPLETED

    log_audit("clinical_note.cosigned", "clinical_note", str(note.id), actor_id=user.id)
    db.session.commit()
    return jsonify({"note": _note_to_dict(note)})
