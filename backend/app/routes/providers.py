import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import User
from app.utils import get_current_user, log_audit

providers_bp = Blueprint("providers", __name__)


def _profile_response(user: User) -> dict | None:
    if user.therapist_profile:
        profile = user.therapist_profile
        return {
            "type": "therapist",
            "profile_id": str(profile.id),
            "bio": profile.bio,
            "specializations": profile.specializations,
            "languages": profile.languages,
            "license_number": profile.license_number,
            "license_authority": profile.license_authority,
            "approval_status": profile.approval_status.value,
        }
    if user.trainee_profile:
        profile = user.trainee_profile
        supervisor_name = None
        supervisor_email = None
        if profile.supervisor_id:
            supervisor = db.session.get(User, profile.supervisor_id)
            if supervisor:
                supervisor_name = supervisor.full_name
                supervisor_email = supervisor.email
        return {
            "type": "trainee",
            "profile_id": str(profile.id),
            "program_name": profile.program_name,
            "languages": profile.languages,
            "approval_status": profile.approval_status.value,
            "supervisor_id": str(profile.supervisor_id) if profile.supervisor_id else None,
            "supervisor_name": supervisor_name,
            "supervisor_email": supervisor_email,
        }
    return None


@providers_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    profile = _profile_response(user)
    if not profile:
        return jsonify({"error": "Not Found", "message": "No provider profile for this account"}), 404

    return jsonify({"profile": profile, "user": {"full_name": user.full_name, "email": user.email}})


@providers_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_my_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}

    if user.therapist_profile:
        profile = user.therapist_profile
        if "bio" in data:
            profile.bio = (data.get("bio") or "").strip() or None
        if "specializations" in data:
            profile.specializations = (data.get("specializations") or "").strip() or None
        if "languages" in data:
            languages = (data.get("languages") or "").strip()
            if not languages:
                return jsonify({"error": "ValidationError", "message": "Languages are required"}), 400
            profile.languages = languages
        if "license_number" in data:
            profile.license_number = (data.get("license_number") or "").strip() or None
        if "license_authority" in data:
            profile.license_authority = (data.get("license_authority") or "").strip() or None
    elif user.trainee_profile:
        profile = user.trainee_profile
        if "program_name" in data:
            profile.program_name = (data.get("program_name") or "").strip() or None
        if "languages" in data:
            languages = (data.get("languages") or "").strip()
            if not languages:
                return jsonify({"error": "ValidationError", "message": "Languages are required"}), 400
            profile.languages = languages
    else:
        return jsonify({"error": "Not Found", "message": "No provider profile for this account"}), 404

    log_audit("provider.profile_updated", "user", str(user.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"profile": _profile_response(user)})
