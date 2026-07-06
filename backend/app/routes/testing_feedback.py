import logging
import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import SQLAlchemyError

from app.config import beta_feedback_enabled
from app.extensions import db
from app.models import FeedbackStatus, TestingFeedback, TestingFeedbackType, User, UserRole
from app.services.notifications import notify_testing_feedback
from app.utils import log_audit, user_has_role

logger = logging.getLogger(__name__)

testing_feedback_bp = Blueprint("testing_feedback", __name__)

VALID_TYPES = set(TestingFeedbackType)


def _beta_feedback_enabled() -> bool:
    return beta_feedback_enabled()


def _get_user(user_id: str | None) -> User | None:
    if not user_id:
        return None
    return db.session.get(User, uuid.UUID(user_id))


def _tester_role_label(user: User) -> str:
    if user_has_role(user, UserRole.PLATFORM_ADMIN):
        return "platform_admin"
    if user_has_role(user, UserRole.SUPERVISOR):
        return "supervisor"
    if user.therapist_profile:
        return "counselor"
    if user.trainee_profile:
        return "trainee"
    if user.client_profile:
        return "client"
    roles = sorted({m.role.value for m in user.memberships if m.is_active})
    return roles[0] if roles else "tester"


def _feedback_to_dict(record: TestingFeedback) -> dict:
    return {
        "id": str(record.id),
        "feedback_type": record.feedback_type.value,
        "page_path": record.page_path,
        "page_title": record.page_title,
        "page_context": record.page_context,
        "message": record.message,
        "status": record.status.value,
        "tester_role": record.tester_role,
        "created_at": record.created_at.isoformat(),
    }


@testing_feedback_bp.route("/enabled", methods=["GET"])
def testing_feedback_enabled():
    return jsonify({"enabled": _beta_feedback_enabled()})


@testing_feedback_bp.route("", methods=["POST"])
@jwt_required(optional=True)
def submit_testing_feedback():
    if not _beta_feedback_enabled():
        return jsonify({"error": "Not Found", "message": "Feedback is not available right now"}), 404

    identity = get_jwt_identity()
    user = _get_user(identity)
    if identity and (not user or not user.is_active):
        return jsonify({"error": "Unauthorized", "message": "Invalid or inactive user"}), 401

    data = request.get_json(silent=True) or {}
    type_raw = (data.get("feedback_type") or data.get("type") or "").strip().lower()
    page_path = (data.get("page_path") or "").strip()
    page_title = (data.get("page_title") or "").strip()[:200]
    page_context = (data.get("page_context") or "").strip()[:500]
    message = (data.get("message") or "").strip()
    submitter_name = (data.get("submitter_name") or "").strip()[:120]

    try:
        feedback_type = TestingFeedbackType(type_raw)
    except ValueError:
        return jsonify({"error": "ValidationError", "message": "Invalid feedback type"}), 400

    if feedback_type not in VALID_TYPES:
        return jsonify({"error": "ValidationError", "message": "Invalid feedback type"}), 400
    if not page_path or len(page_path) > 500:
        return jsonify({"error": "ValidationError", "message": "Page path is required"}), 400
    if not message or len(message) > 8000:
        return jsonify({"error": "ValidationError", "message": "Message is required (max 8000 characters)"}), 400

    if user:
        tester_role = _tester_role_label(user)
        display_name = None
    else:
        if not submitter_name:
            return jsonify({"error": "ValidationError", "message": "Your name is required"}), 400
        tester_role = "guest"
        display_name = submitter_name

    record = TestingFeedback(
        user_id=user.id if user else None,
        submitter_name=display_name,
        tester_role=tester_role,
        feedback_type=feedback_type,
        page_path=page_path,
        page_title=page_title,
        page_context=page_context,
        message=message,
    )

    try:
        db.session.add(record)
        db.session.flush()

        log_audit(
            "testing_feedback.submitted",
            "testing_feedback",
            str(record.id),
            f"type={feedback_type.value}; page={page_path[:120]}",
            actor_id=user.id if user else None,
        )
        db.session.commit()
    except SQLAlchemyError as exc:
        db.session.rollback()
        logger.exception("Failed to save testing feedback: %s", exc)
        return jsonify(
            {
                "error": "Internal Server Error",
                "message": "Could not save feedback right now. Please try again in a minute.",
            }
        ), 500

    try:
        notify_testing_feedback(record, user)
    except Exception as exc:
        logger.warning("Testing feedback notification failed: %s", exc)

    return jsonify({"feedback": _feedback_to_dict(record)}), 201
