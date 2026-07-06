import os

from flask import Blueprint, jsonify
from sqlalchemy import text

from app.config import beta_feedback_enabled
from app.extensions import db
from app.services.notifications import smtp_configured

health_bp = Blueprint("health", __name__)


def _testing_feedback_db_ready() -> bool:
    try:
        db.session.execute(text("SELECT 1 FROM testing_feedback LIMIT 1"))
        db.session.rollback()
        return True
    except Exception:
        db.session.rollback()
        return False


@health_bp.route("/health", methods=["GET"])
def health():
    beta_enabled = beta_feedback_enabled()
    return jsonify({
        "status": "ok",
        "service": "tesfa-counseling-api",
        "daily_api_key_set": bool(os.environ.get("DAILY_API_KEY", "").strip()),
        "smtp_configured": smtp_configured(),
        "beta_feedback_enabled": beta_enabled,
        "testing_feedback_db_ready": _testing_feedback_db_ready() if beta_enabled else False,
    })
