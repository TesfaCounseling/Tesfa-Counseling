from flask import Blueprint, jsonify

from app.extensions import db
from app.models import ApprovalStatus, SessionPricing, TherapistProfile, TraineeProfile, User

therapists_bp = Blueprint("therapists", __name__)


def _provider_dict(user: User, profile_type: str) -> dict:
    therapist = user.therapist_profile
    trainee = user.trainee_profile
    if profile_type == "therapist":
        profile = therapist
        return {
            "id": str(user.id),
            "full_name": user.full_name,
            "type": profile_type,
            "bio": profile.bio if profile else None,
            "specializations": profile.specializations if profile else None,
            "languages": profile.languages if profile else None,
            "program_name": None,
        }
    profile = trainee
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "type": "trainee",
        "bio": None,
        "specializations": None,
        "languages": profile.languages if profile else None,
        "program_name": profile.program_name if profile else None,
    }


def _pricing_dict(p: SessionPricing) -> dict:
    return {
        "duration_minutes": p.duration_minutes,
        "pricing_type": p.pricing_type.value,
        "amount_cents": p.amount_cents,
        "currency": p.currency,
    }


def _get_approved_provider(user_id) -> tuple[User, str] | None:
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return None
    if user.therapist_profile and user.therapist_profile.approval_status == ApprovalStatus.APPROVED:
        return user, "therapist"
    if user.trainee_profile and user.trainee_profile.approval_status == ApprovalStatus.APPROVED:
        return user, "trainee"
    return None


@therapists_bp.route("", methods=["GET"])
def list_therapists():
    """Public list of approved counselors and trainees available for booking."""
    approved_therapists = (
        db.session.query(User)
        .join(TherapistProfile, TherapistProfile.user_id == User.id)
        .filter(TherapistProfile.approval_status == ApprovalStatus.APPROVED, User.is_active.is_(True))
        .all()
    )
    approved_trainees = (
        db.session.query(User)
        .join(TraineeProfile, TraineeProfile.user_id == User.id)
        .filter(TraineeProfile.approval_status == ApprovalStatus.APPROVED, User.is_active.is_(True))
        .all()
    )

    providers = [_provider_dict(u, "therapist") for u in approved_therapists]
    providers += [_provider_dict(u, "trainee") for u in approved_trainees]

    return jsonify({"providers": providers})


@therapists_bp.route("/<uuid:provider_id>", methods=["GET"])
def get_therapist(provider_id):
    result = _get_approved_provider(provider_id)
    if not result:
        return jsonify({"error": "Not Found"}), 404
    user, profile_type = result
    return jsonify({"provider": _provider_dict(user, profile_type)})


@therapists_bp.route("/<uuid:provider_id>/pricing", methods=["GET"])
def get_therapist_pricing(provider_id):
    result = _get_approved_provider(provider_id)
    if not result:
        return jsonify({"error": "Not Found"}), 404
    user, _ = result
    pricing = SessionPricing.query.filter_by(provider_id=user.id, is_active=True).order_by(
        SessionPricing.duration_minutes.asc()
    ).all()
    return jsonify({"pricing": [_pricing_dict(p) for p in pricing]})
