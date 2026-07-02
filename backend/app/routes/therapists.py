import uuid

from flask import Blueprint, jsonify, make_response

from app.extensions import db
from app.models import ApprovalStatus, SessionPricing, TherapistProfile, User
from app.provider_profile_utils import (
    therapist_has_photo,
    therapist_photo_path,
    therapist_public_profile_complete,
    therapist_publicly_listable,
)

therapists_bp = Blueprint("therapists", __name__)


def _provider_dict(user: User, profile_type: str) -> dict:
    therapist = user.therapist_profile
    if profile_type == "therapist":
        profile = therapist
        photo_url = therapist_photo_path(user.id) if profile and therapist_has_photo(profile) else None
        return {
            "id": str(user.id),
            "full_name": user.full_name,
            "type": profile_type,
            "bio": profile.bio if profile else None,
            "specializations": profile.specializations if profile else None,
            "languages": profile.languages if profile else None,
            "program_name": None,
            "photo_url": photo_url,
        }
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "type": "trainee",
        "bio": None,
        "specializations": None,
        "languages": None,
        "program_name": None,
        "photo_url": None,
    }


def _pricing_dict(p: SessionPricing) -> dict:
    return {
        "duration_minutes": p.duration_minutes,
        "pricing_type": p.pricing_type.value,
        "amount_cents": p.amount_cents,
        "currency": p.currency,
    }


def _get_public_provider(user_id) -> tuple[User, str] | None:
    user = db.session.get(User, user_id)
    if not user or not user.is_active or not user.therapist_profile:
        return None
    profile = user.therapist_profile
    if not therapist_publicly_listable(profile):
        return None
    return user, "therapist"


@therapists_bp.route("", methods=["GET"])
def list_therapists():
    """Public list of approved counselors with completed profiles."""
    rows = (
        db.session.query(User)
        .join(TherapistProfile, TherapistProfile.user_id == User.id)
        .filter(TherapistProfile.approval_status == ApprovalStatus.APPROVED, User.is_active.is_(True))
        .order_by(TherapistProfile.updated_at.desc())
        .all()
    )

    listable = [
        (user, _provider_dict(user, "therapist"))
        for user in rows
        if therapist_publicly_listable(user.therapist_profile)
    ]
    listable.sort(
        key=lambda pair: (
            0 if therapist_public_profile_complete(pair[0].therapist_profile) else 1,
            pair[1]["full_name"].lower(),
        )
    )
    providers = [provider for _, provider in listable]

    return jsonify({"providers": providers})


@therapists_bp.route("/<uuid:provider_id>", methods=["GET"])
def get_therapist(provider_id):
    result = _get_public_provider(provider_id)
    if not result:
        return jsonify({"error": "Not Found"}), 404
    user, profile_type = result
    return jsonify({"provider": _provider_dict(user, profile_type)})


@therapists_bp.route("/<uuid:provider_id>/photo", methods=["GET"])
def get_therapist_photo(provider_id):
    user = db.session.get(User, provider_id)
    profile = user.therapist_profile if user else None
    if not user or not profile or not therapist_has_photo(profile):
        return jsonify({"error": "Not Found"}), 404
    if not therapist_publicly_listable(profile):
        return jsonify({"error": "Not Found"}), 404

    response = make_response(profile.photo_data)
    response.headers["Content-Type"] = profile.photo_mime_type
    response.headers["Cache-Control"] = "public, max-age=300"
    return response


@therapists_bp.route("/<uuid:provider_id>/pricing", methods=["GET"])
def get_therapist_pricing(provider_id):
    result = _get_public_provider(provider_id)
    if not result:
        return jsonify({"error": "Not Found"}), 404
    user, _ = result
    pricing = SessionPricing.query.filter_by(provider_id=user.id, is_active=True).order_by(
        SessionPricing.duration_minutes.asc()
    ).all()
    return jsonify({"pricing": [_pricing_dict(p) for p in pricing]})
