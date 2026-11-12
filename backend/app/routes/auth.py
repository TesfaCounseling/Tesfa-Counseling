import hashlib
import os
import re
import secrets
import uuid
from datetime import timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import (
    ApprovalStatus,
    ClientProfile,
    ConsentRecord,
    ConsentType,
    OrganizationMember,
    PasswordResetToken,
    TherapistProfile,
    TraineeProfile,
    User,
    UserRole,
    utcnow,
)
from sqlalchemy.exc import OperationalError

from app.db_utils import run_with_db_retry
from app.services.notifications import send_password_reset_email
from app.utils import create_provider_organization, log_audit

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
VALID_REGISTER_ROLES = {UserRole.THERAPIST, UserRole.CLIENT}
PASSWORD_RESET_EXPIRY_MINUTES = 60


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _app_base_url() -> str:
    return os.environ.get("APP_URL", "https://www.tesfacounseling.com").rstrip("/")


def _as_aware_utc(dt):
    from datetime import timezone

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _user_to_dict(user: User) -> dict:
    roles = [
        {"role": m.role.value, "organization_id": str(m.organization_id)}
        for m in user.memberships
        if m.is_active
    ]
    account_type = None
    if user.therapist_profile:
        account_type = "therapist"
    elif user.trainee_profile:
        account_type = "trainee"
    elif user.client_profile:
        account_type = "client"

    preferred_language = None
    if user.client_profile:
        preferred_language = user.client_profile.preferred_language

    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "is_email_verified": user.is_email_verified,
        "account_type": account_type,
        "preferred_language": preferred_language,
        "roles": roles,
    }


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    role_str = (data.get("role") or "").strip()
    organization_name = (data.get("organization_name") or "").strip()

    if not EMAIL_RE.match(email):
        return jsonify({"error": "ValidationError", "message": "Invalid email address"}), 400
    if len(password) < 8:
        return jsonify({"error": "ValidationError", "message": "Password must be at least 8 characters"}), 400
    if not first_name or not last_name:
        return jsonify({"error": "ValidationError", "message": "First and last name are required"}), 400

    try:
        role = UserRole(role_str)
    except ValueError:
        return jsonify({"error": "ValidationError", "message": "Invalid role"}), 400

    if role == UserRole.TRAINEE:
        return jsonify({"error": "ValidationError", "message": "Trainee registration is not available"}), 400

    if role not in VALID_REGISTER_ROLES:
        return jsonify({"error": "ValidationError", "message": "Role cannot be registered publicly"}), 400

    languages = (data.get("languages") or "").strip()
    specializations = (data.get("specializations") or "").strip()
    if role == UserRole.THERAPIST and not languages:
        return jsonify({"error": "ValidationError", "message": "Languages spoken are required for providers"}), 400
    if role == UserRole.THERAPIST and not specializations:
        return jsonify({"error": "ValidationError", "message": "Specialties are required for counselors"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Conflict", "message": "Email already registered"}), 409

    user = User(email=email, first_name=first_name, last_name=last_name)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    if role == UserRole.THERAPIST:
        provider_org_name = organization_name or f"{first_name} {last_name}".strip() or "Independent Practice"
        organization = create_provider_organization(provider_org_name)
        db.session.add(OrganizationMember(organization_id=organization.id, user_id=user.id, role=role))
        db.session.add(TherapistProfile(user_id=user.id, languages=languages, specializations=specializations))
    elif role == UserRole.TRAINEE:
        provider_org_name = organization_name or f"{first_name} {last_name}".strip() or "Independent Practice"
        organization = create_provider_organization(provider_org_name)
        db.session.add(OrganizationMember(organization_id=organization.id, user_id=user.id, role=role))
        program_name = (data.get("program_name") or "").strip() or None
        db.session.add(TraineeProfile(user_id=user.id, languages=languages, program_name=program_name))
    elif role == UserRole.CLIENT:
        preferred_language = (data.get("preferred_language") or "en").strip().lower()
        if preferred_language not in ("en", "am"):
            preferred_language = "en"
        db.session.add(ClientProfile(user_id=user.id, preferred_language=preferred_language))

    consents = data.get("consents") or []
    for consent in consents:
        try:
            consent_type = ConsentType(consent.get("type"))
        except (ValueError, AttributeError):
            continue
        db.session.add(
            ConsentRecord(
                user_id=user.id,
                consent_type=consent_type,
                version=consent.get("version", "1.0"),
                accepted=bool(consent.get("accepted", True)),
                ip_address=request.remote_addr,
            )
        )

    if role in (UserRole.CLIENT, UserRole.THERAPIST, UserRole.TRAINEE):
        db.session.add(
            ConsentRecord(
                user_id=user.id,
                consent_type=ConsentType.CRISIS_DISCLAIMER,
                version="1.0",
                accepted=True,
                ip_address=request.remote_addr,
            )
        )

    log_audit("user.registered", "user", str(user.id), f"role={role.value}", actor_id=user.id)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return (
        jsonify(
            {
                "user": _user_to_dict(user),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
        ),
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    def _login():
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"error": "Unauthorized", "message": "Invalid email or password"}), 401
        if not user.is_active:
            return jsonify({"error": "Forbidden", "message": "Account is suspended"}), 403

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        log_audit("user.login", "user", str(user.id), actor_id=user.id)
        db.session.commit()

        return jsonify(
            {
                "user": _user_to_dict(user),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }
        )

    try:
        return run_with_db_retry(_login)
    except OperationalError as exc:
        db.session.rollback()
        if "locked" in str(exc).lower():
            return jsonify(
                {
                    "error": "ServiceUnavailable",
                    "message": "Database is busy. Please wait a moment and try again.",
                }
            ), 503
        raise


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = db.session.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        return jsonify({"error": "Unauthorized", "message": "Invalid or inactive user"}), 401

    return jsonify({"access_token": create_access_token(identity=str(user.id))})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not EMAIL_RE.match(email):
        return jsonify({"error": "ValidationError", "message": "Invalid email address"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.is_active:
        return jsonify(
            {
                "exists": False,
                "message": "No account found with that email. Check the address or create an account.",
            }
        ), 404

    PasswordResetToken.query.filter_by(user_id=user.id, used_at=None).delete(synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_reset_token(raw_token),
        expires_at=utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRY_MINUTES),
    )
    db.session.add(reset)
    db.session.flush()

    reset_url = f"{_app_base_url()}/reset-password?token={raw_token}"
    sent = send_password_reset_email(
        to_address=user.email,
        recipient_name=user.first_name or user.full_name,
        reset_url=reset_url,
        expires_minutes=PASSWORD_RESET_EXPIRY_MINUTES,
    )
    if not sent:
        db.session.rollback()
        return jsonify(
            {
                "error": "ServiceUnavailable",
                "message": "Could not send the reset email. Please try again in a few minutes.",
            }
        ), 503

    log_audit("user.password_reset_requested", "user", str(user.id), actor_id=user.id)
    db.session.commit()

    return jsonify(
        {
            "exists": True,
            "message": "We found your account and sent a reset link. Check your inbox and spam folder.",
        }
    )


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    password = data.get("password") or ""

    if not token:
        return jsonify({"error": "ValidationError", "message": "Reset token is required"}), 400
    if len(password) < 8:
        return jsonify({"error": "ValidationError", "message": "Password must be at least 8 characters"}), 400

    reset = PasswordResetToken.query.filter_by(token_hash=_hash_reset_token(token)).first()
    now = utcnow()
    if not reset or reset.used_at is not None or _as_aware_utc(reset.expires_at) < now:
        return jsonify(
            {"error": "ValidationError", "message": "This reset link is invalid or has expired"}
        ), 400

    user = db.session.get(User, reset.user_id)
    if not user or not user.is_active:
        return jsonify(
            {"error": "ValidationError", "message": "This reset link is invalid or has expired"}
        ), 400

    user.set_password(password)
    reset.used_at = now
    PasswordResetToken.query.filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.id != reset.id,
        PasswordResetToken.used_at.is_(None),
    ).delete(synchronize_session=False)

    log_audit("user.password_reset_completed", "user", str(user.id), actor_id=user.id)
    db.session.commit()

    return jsonify({"message": "Password updated. You can sign in with your new password."})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.get(User, uuid.UUID(user_id))
    if not user:
        return jsonify({"error": "Not Found", "message": "User not found"}), 404
    return jsonify({"user": _user_to_dict(user)})


@auth_bp.route("/me/preferences", methods=["PATCH"])
@jwt_required()
def update_preferences():
    user_id = get_jwt_identity()
    user = db.session.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        return jsonify({"error": "Unauthorized", "message": "Invalid or inactive user"}), 401

    data = request.get_json(silent=True) or {}
    if "preferred_language" in data:
        lang = (data.get("preferred_language") or "en").strip().lower()
        if lang not in ("en", "am"):
            return jsonify({"error": "ValidationError", "message": "Language must be en or am"}), 400
        if user.client_profile:
            user.client_profile.preferred_language = lang

    db.session.commit()
    return jsonify({"user": _user_to_dict(user)})
