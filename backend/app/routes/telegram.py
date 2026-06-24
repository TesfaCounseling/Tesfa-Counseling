from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import TelegramLink
from app.utils import log_audit

telegram_bp = Blueprint("telegram", __name__)


@telegram_bp.route("/webhook", methods=["POST"])
def webhook():
    """Telegram bot webhook — Phase 2 will handle commands and linking."""
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    from flask import current_app

    expected = current_app.config.get("TELEGRAM_WEBHOOK_SECRET", "")
    if expected and secret != expected:
        return jsonify({"error": "Unauthorized"}), 401

    update = request.get_json(silent=True) or {}
    message = update.get("message") or {}
    text = (message.get("text") or "").strip()

    if text.startswith("/start"):
        chat = message.get("chat") or {}
        current_app.logger.info("Telegram /start from chat_id=%s", chat.get("id"))

    return jsonify({"ok": True})


@telegram_bp.route("/status", methods=["GET"])
def status():
    linked_count = db.session.query(TelegramLink).count()
    return jsonify({"linked_accounts": linked_count, "webhook": "ready"})
