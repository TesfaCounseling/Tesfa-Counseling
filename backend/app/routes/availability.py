import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import (
    ApprovalStatus,
    AvailabilityBlock,
    AvailabilityRule,
    SessionPricing,
    TherapistProfile,
    TraineeProfile,
    User,
    UserRole,
)
from app.services.scheduling import parse_time
from app.utils import log_audit

availability_bp = Blueprint("availability", __name__)


def _get_user() -> User | None:
    return db.session.get(User, uuid.UUID(get_jwt_identity()))


def _rule_to_dict(rule: AvailabilityRule) -> dict:
    return {
        "id": str(rule.id),
        "day_of_week": rule.day_of_week,
        "start_time": rule.start_time.strftime("%H:%M"),
        "end_time": rule.end_time.strftime("%H:%M"),
        "timezone": rule.timezone,
        "is_active": rule.is_active,
    }


def _pricing_to_dict(p: SessionPricing) -> dict:
    return {
        "id": str(p.id),
        "duration_minutes": p.duration_minutes,
        "pricing_type": p.pricing_type.value,
        "amount_cents": p.amount_cents,
        "currency": p.currency,
        "is_active": p.is_active,
    }


@availability_bp.route("/rules", methods=["GET"])
@jwt_required()
def list_rules():
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    provider_id = request.args.get("provider_id") or str(user.id)
    rules = AvailabilityRule.query.filter_by(provider_id=uuid.UUID(provider_id), is_active=True).all()
    return jsonify({"rules": [_rule_to_dict(r) for r in rules]})


@availability_bp.route("/rules", methods=["POST"])
@jwt_required()
def create_rule():
    user = _get_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    try:
        rule = AvailabilityRule(
            provider_id=user.id,
            day_of_week=int(data["day_of_week"]),
            start_time=parse_time(data["start_time"]),
            end_time=parse_time(data["end_time"]),
            timezone=data.get("timezone", "UTC"),
        )
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "ValidationError", "message": "Invalid availability rule"}), 400

    if rule.start_time >= rule.end_time:
        return jsonify({"error": "ValidationError", "message": "End time must be after start time"}), 400

    db.session.add(rule)
    log_audit("availability.created", "availability_rule", actor_id=user.id)
    db.session.commit()
    return jsonify({"rule": _rule_to_dict(rule)}), 201


@availability_bp.route("/rules/<uuid:rule_id>", methods=["DELETE"])
@jwt_required()
def delete_rule(rule_id):
    user = _get_user()
    rule = db.session.get(AvailabilityRule, rule_id)
    if not rule or rule.provider_id != user.id:
        return jsonify({"error": "Not Found"}), 404

    rule.is_active = False
    log_audit("availability.deleted", "availability_rule", str(rule.id), actor_id=user.id)
    db.session.commit()
    return jsonify({"ok": True})


@availability_bp.route("/blocks", methods=["POST"])
@jwt_required()
def create_block():
    user = _get_user()
    data = request.get_json(silent=True) or {}
    try:
        starts_at = datetime.fromisoformat(data["starts_at"].replace("Z", "+00:00"))
        ends_at = datetime.fromisoformat(data["ends_at"].replace("Z", "+00:00"))
    except (KeyError, ValueError, AttributeError):
        return jsonify({"error": "ValidationError", "message": "Invalid block times"}), 400

    block = AvailabilityBlock(
        provider_id=user.id,
        starts_at=starts_at.astimezone(timezone.utc),
        ends_at=ends_at.astimezone(timezone.utc),
        reason=data.get("reason"),
    )
    db.session.add(block)
    db.session.commit()
    return jsonify({"block": {"id": str(block.id)}}), 201


@availability_bp.route("/pricing", methods=["GET"])
@jwt_required()
def list_pricing():
    user = _get_user()
    pricing = SessionPricing.query.filter_by(provider_id=user.id, is_active=True).all()
    return jsonify({"pricing": [_pricing_to_dict(p) for p in pricing]})


@availability_bp.route("/pricing", methods=["POST"])
@jwt_required()
def upsert_pricing():
    user = _get_user()
    data = request.get_json(silent=True) or {}
    try:
        duration = int(data["duration_minutes"])
        amount_cents = int(data.get("amount_cents", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "ValidationError", "message": "Invalid pricing data"}), 400

    from app.models import PricingType

    pricing_type = PricingType(data.get("pricing_type", "standard"))
    existing = SessionPricing.query.filter_by(provider_id=user.id, duration_minutes=duration).first()
    if existing:
        existing.amount_cents = amount_cents
        existing.pricing_type = pricing_type
        existing.currency = data.get("currency", "USD")
        existing.is_active = True
        row = existing
    else:
        row = SessionPricing(
            provider_id=user.id,
            duration_minutes=duration,
            amount_cents=amount_cents,
            pricing_type=pricing_type,
            currency=data.get("currency", "USD"),
        )
        db.session.add(row)

    db.session.commit()
    return jsonify({"pricing": _pricing_to_dict(row)}), 201
