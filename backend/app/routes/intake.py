import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ApprovalStatus, SessionMode, TraineeIntake, TraineeProfile, User, UserRole
from app.utils import get_provider_organization_id, log_audit, user_has_role

intake_bp = Blueprint("intake", __name__)


def _get_user() -> User | None:
    return db.session.get(User, uuid.UUID(get_jwt_identity()))


def _intake_to_dict(intake: TraineeIntake) -> dict:
    return {
        "id": str(intake.id),
        "client_id": str(intake.client_id),
        "client_name": intake.client.full_name if intake.client else None,
        "trainee_provider_id": str(intake.trainee_provider_id),
        "trainee_name": intake.trainee.full_name if intake.trainee else None,
        "presenting_concerns": intake.presenting_concerns,
        "primary_goals": intake.primary_goals,
        "prior_therapy": intake.prior_therapy,
        "current_medications": intake.current_medications,
        "emergency_contact_name": intake.emergency_contact_name,
        "emergency_contact_phone": intake.emergency_contact_phone,
        "country": intake.country,
        "preferred_session_mode": intake.preferred_session_mode.value,
        "supervised_care_consent": intake.supervised_care_consent,
        "telehealth_consent": intake.telehealth_consent,
        "crisis_acknowledgment": intake.crisis_acknowledgment,
        "completed_at": intake.completed_at.isoformat() if intake.completed_at else None,
        "created_at": intake.created_at.isoformat(),
    }


def _is_approved_trainee(user: User) -> bool:
    return (
        user.trainee_profile is not None
        and user.trainee_profile.approval_status == ApprovalStatus.APPROVED
        and user.is_active
    )


def _get_intake(client_id: uuid.UUID, trainee_id: uuid.UUID) -> TraineeIntake | None:
    return TraineeIntake.query.filter_by(client_id=client_id, trainee_provider_id=trainee_id).first()


@intake_bp.route("/trainee/<uuid:trainee_provider_id>/status", methods=["GET"])
@jwt_required()
def trainee_intake_status(trainee_provider_id):
    user = _get_user()
    if not user or not user.client_profile:
        return jsonify({"error": "Forbidden", "message": "Clients only"}), 403

    trainee = db.session.get(User, trainee_provider_id)
    if not trainee or not _is_approved_trainee(trainee):
        return jsonify({"error": "Not Found", "message": "Trainee not found"}), 404

    intake = _get_intake(user.id, trainee_provider_id)
    return jsonify({
        "required": True,
        "completed": intake is not None and intake.completed_at is not None,
        "intake": _intake_to_dict(intake) if intake and intake.completed_at else None,
    })


@intake_bp.route("/trainee/<uuid:trainee_provider_id>", methods=["GET"])
@jwt_required()
def get_trainee_intake(trainee_provider_id):
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    trainee = db.session.get(User, trainee_provider_id)
    if not trainee or not _is_approved_trainee(trainee):
        return jsonify({"error": "Not Found"}), 404

    client_id = request.args.get("client_id")
    if client_id:
        try:
            target_client_id = uuid.UUID(client_id)
        except ValueError:
            return jsonify({"error": "ValidationError", "message": "Invalid client_id"}), 400
        if user.id != trainee_provider_id and user.id != target_client_id:
            return jsonify({"error": "Forbidden"}), 403
        intake = _get_intake(target_client_id, trainee_provider_id)
    elif user.client_profile:
        intake = _get_intake(user.id, trainee_provider_id)
    elif user.id == trainee_provider_id:
        intakes = TraineeIntake.query.filter_by(trainee_provider_id=trainee_provider_id).order_by(
            TraineeIntake.completed_at.desc()
        ).all()
        return jsonify({"intakes": [_intake_to_dict(i) for i in intakes if i.completed_at]})
    else:
        return jsonify({"error": "Forbidden"}), 403

    if not intake or not intake.completed_at:
        return jsonify({"intake": None})
    return jsonify({"intake": _intake_to_dict(intake)})


@intake_bp.route("/trainee/<uuid:trainee_provider_id>", methods=["POST"])
@jwt_required()
def submit_trainee_intake(trainee_provider_id):
    user = _get_user()
    if not user or not user.client_profile:
        return jsonify({"error": "Forbidden", "message": "Clients only"}), 403

    trainee = db.session.get(User, trainee_provider_id)
    if not trainee or not _is_approved_trainee(trainee):
        return jsonify({"error": "Not Found", "message": "Trainee not found"}), 404

    data = request.get_json(silent=True) or {}
    presenting = (data.get("presenting_concerns") or "").strip()
    goals = (data.get("primary_goals") or "").strip()
    emergency_name = (data.get("emergency_contact_name") or "").strip()
    emergency_phone = (data.get("emergency_contact_phone") or "").strip()

    if not presenting or not goals or not emergency_name or not emergency_phone:
        return jsonify({"error": "ValidationError", "message": "Required fields are missing"}), 400

    if not data.get("supervised_care_consent"):
        return jsonify({"error": "ValidationError", "message": "Supervised care consent is required"}), 400
    if not data.get("telehealth_consent"):
        return jsonify({"error": "ValidationError", "message": "Telehealth consent is required"}), 400
    if not data.get("crisis_acknowledgment"):
        return jsonify({"error": "ValidationError", "message": "Crisis acknowledgment is required"}), 400

    mode_raw = data.get("preferred_session_mode", "video")
    try:
        preferred_mode = SessionMode(mode_raw)
    except ValueError:
        return jsonify({"error": "ValidationError", "message": "Invalid session mode"}), 400

    organization_id = get_provider_organization_id(trainee_provider_id)
    if not organization_id:
        return jsonify({"error": "ValidationError", "message": "Trainee organization not found"}), 400

    now = datetime.now(timezone.utc)
    intake = _get_intake(user.id, trainee_provider_id)
    if intake and intake.completed_at:
        return jsonify({"error": "Conflict", "message": "Intake already completed"}), 409

    if not intake:
        intake = TraineeIntake(
            client_id=user.id,
            trainee_provider_id=trainee_provider_id,
            organization_id=organization_id,
            presenting_concerns=presenting,
            primary_goals=goals,
            emergency_contact_name=emergency_name,
            emergency_contact_phone=emergency_phone,
        )
        db.session.add(intake)

    intake.presenting_concerns = presenting
    intake.primary_goals = goals
    intake.prior_therapy = (data.get("prior_therapy") or "").strip() or None
    intake.current_medications = (data.get("current_medications") or "").strip() or None
    intake.emergency_contact_name = emergency_name
    intake.emergency_contact_phone = emergency_phone
    intake.country = (data.get("country") or "").strip() or None
    intake.preferred_session_mode = preferred_mode
    intake.supervised_care_consent = True
    intake.telehealth_consent = True
    intake.crisis_acknowledgment = True
    intake.completed_at = now

    if user.client_profile:
        user.client_profile.emergency_contact_name = emergency_name
        user.client_profile.emergency_contact_phone = emergency_phone
        if intake.country:
            user.client_profile.country = intake.country

    log_audit("trainee_intake.completed", "trainee_intake", str(intake.id), actor_id=user.id)
    db.session.commit()
    return jsonify({"intake": _intake_to_dict(intake)}), 201


def _supervisor_trainee_ids(user: User) -> list[uuid.UUID]:
    if user_has_role(user, UserRole.SUPERVISOR):
        rows = TraineeProfile.query.filter_by(supervisor_id=user.id).all()
        return [row.user_id for row in rows]
    return []


@intake_bp.route("/supervision", methods=["GET"])
@jwt_required()
def list_supervision_intakes():
    """Supervisor: client intake forms for assigned trainees."""
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    trainee_ids = _supervisor_trainee_ids(user)
    if not trainee_ids:
        return jsonify({"intakes": []})

    intakes = (
        TraineeIntake.query.filter(
            TraineeIntake.trainee_provider_id.in_(trainee_ids),
            TraineeIntake.completed_at.isnot(None),
        )
        .order_by(TraineeIntake.completed_at.desc())
        .all()
    )
    return jsonify({"intakes": [_intake_to_dict(i) for i in intakes]})
