import uuid

from flask import Blueprint, jsonify, make_response, request
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import User
from app.provider_profile_utils import (
    ALLOWED_PHOTO_MIME_TYPES,
    MAX_PHOTO_BYTES,
    therapist_has_photo,
    provider_my_photo_path,
    therapist_public_profile_complete,
)
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
            "photo_url": provider_my_photo_path() if therapist_has_photo(profile) else None,
            "public_profile_complete": therapist_public_profile_complete(profile),
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


@providers_bp.route("/me/photo", methods=["GET"])
@jwt_required()
def get_my_photo():
    user = get_current_user()
    if not user or not user.therapist_profile:
        return jsonify({"error": "Not Found", "message": "No counselor profile for this account"}), 404

    profile = user.therapist_profile
    if not therapist_has_photo(profile):
        return jsonify({"error": "Not Found", "message": "No photo uploaded"}), 404

    response = make_response(profile.photo_data)
    response.headers["Content-Type"] = profile.photo_mime_type
    response.headers["Cache-Control"] = "private, max-age=60"
    return response


@providers_bp.route("/me/photo", methods=["POST"])
@jwt_required()
def upload_my_photo():
    user = get_current_user()
    if not user or not user.therapist_profile:
        return jsonify({"error": "Not Found", "message": "No counselor profile for this account"}), 404

    upload = request.files.get("photo")
    if not upload or not upload.filename:
        return jsonify({"error": "ValidationError", "message": "Photo file is required"}), 400

    mime_type = (upload.mimetype or "").split(";")[0].strip().lower()
    if mime_type not in ALLOWED_PHOTO_MIME_TYPES:
        return jsonify({"error": "ValidationError", "message": "Photo must be JPEG, PNG, or WebP"}), 400

    photo_data = upload.read(MAX_PHOTO_BYTES + 1)
    if not photo_data:
        return jsonify({"error": "ValidationError", "message": "Photo file is empty"}), 400
    if len(photo_data) > MAX_PHOTO_BYTES:
        return jsonify({"error": "ValidationError", "message": "Photo must be 2 MB or smaller"}), 400

    profile = user.therapist_profile
    profile.photo_mime_type = mime_type
    profile.photo_data = photo_data
    log_audit("provider.photo_updated", "user", str(user.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"profile": _profile_response(user)})


@providers_bp.route("/me/photo", methods=["DELETE"])
@jwt_required()
def delete_my_photo():
    user = get_current_user()
    if not user or not user.therapist_profile:
        return jsonify({"error": "Not Found", "message": "No counselor profile for this account"}), 404

    profile = user.therapist_profile
    profile.photo_mime_type = None
    profile.photo_data = None
    log_audit("provider.photo_removed", "user", str(user.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"profile": _profile_response(user)})
