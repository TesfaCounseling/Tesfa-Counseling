import os

from flask import Blueprint, jsonify

from app.config import beta_feedback_enabled
from app.services.notifications import smtp_configured

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    beta_enabled = beta_feedback_enabled()
    return jsonify({
        "status": "ok",
        "service": "tesfa-counseling-api",
        "daily_api_key_set": bool(os.environ.get("DAILY_API_KEY", "").strip()),
        "smtp_configured": smtp_configured(),
        "beta_feedback_enabled": beta_enabled,
    })
