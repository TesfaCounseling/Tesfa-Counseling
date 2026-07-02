import logging
import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import ClientFeedback, FeedbackCategory, User
from app.services.notifications import notify_client_feedback_backup
from app.utils import log_audit

logger = logging.getLogger(__name__)

feedback_bp = Blueprint("feedback", __name__)

VALID_CATEGORIES = {FeedbackCategory.FEEDBACK, FeedbackCategory.COMPLAINT}


def _get_user() -> User | None:
    return db.session.get(User, uuid.UUID(get_jwt_identity()))


def _feedback_to_dict(record: ClientFeedback) -> dict:
    return {
        "id": str(record.id),
        "category": record.category.value,
        "subject": record.subject,
        "message": record.message,
        "status": record.status.value,
        "created_at": record.created_at.isoformat(),
    }


@feedback_bp.route("", methods=["POST"])
@jwt_required()
def submit_feedback():
    user = _get_user()
    if not user or not user.is_active:
        return jsonify({"error": "Unauthorized", "message": "Invalid or inactive user"}), 401
    if not user.client_profile:
        return jsonify({"error": "Forbidden", "message": "Only clients can submit feedback"}), 403

    data = request.get_json(silent=True) or {}
    category_raw = (data.get("category") or "").strip().lower()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    try:
        category = FeedbackCategory(category_raw)
    except ValueError:
        return jsonify({"error": "ValidationError", "message": "Category must be feedback or complaint"}), 400

    if category not in VALID_CATEGORIES:
        return jsonify({"error": "ValidationError", "message": "Category must be feedback or complaint"}), 400
    if not subject or len(subject) > 200:
        return jsonify({"error": "ValidationError", "message": "Subject is required (max 200 characters)"}), 400
    if not message or len(message) > 5000:
        return jsonify({"error": "ValidationError", "message": "Message is required (max 5000 characters)"}), 400

    record = ClientFeedback(
        client_id=user.id,
        category=category,
        subject=subject,
        message=message,
    )
    db.session.add(record)
    db.session.flush()

    log_audit(
        "feedback.submitted",
        "client_feedback",
        str(record.id),
        f"category={category.value}; subject={subject[:80]}",
        actor_id=user.id,
    )
    db.session.commit()

    try:
        notify_client_feedback_backup(record, user)
    except OSError as exc:
        logger.warning("Feedback backup notification failed: %s", exc)

    return jsonify({"feedback": _feedback_to_dict(record)}), 201
