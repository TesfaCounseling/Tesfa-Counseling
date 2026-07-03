import os

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "tesfa-counseling-api",
        "daily_api_key_set": bool(os.environ.get("DAILY_API_KEY", "").strip()),
    })
