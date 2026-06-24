import re
import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import (
    ApprovalStatus,
    ClientProfile,
    ConsentRecord,
    ConsentType,
    OrganizationMember,
    TherapistProfile,
    TraineeProfile,
    User,
    UserRole,
)
from sqlalchemy.exc import OperationalError

from app.db_utils import run_with_db_retry
from app.utils import create_provider_organization, log_audit

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
VALID_REGISTER_ROLES = {UserRole.THERAPIST, UserRole.TRAINEE, UserRole.CLIENT}


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

    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "is_email_verified": user.is_email_verified,
        "account_type": account_type,
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

    if role not in VALID_REGISTER_ROLES:
        return jsonify({"error": "ValidationError", "message": "Role cannot be registered publicly"}), 400

    languages = (data.get("languages") or "").strip()
    if role in (UserRole.THERAPIST, UserRole.TRAINEE) and not languages:
        return jsonify({"error": "ValidationError", "message": "Languages spoken are required for providers"}), 400

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
        db.session.add(TherapistProfile(user_id=user.id, languages=languages))
    elif role == UserRole.TRAINEE:
        provider_org_name = organization_name or f"{first_name} {last_name}".strip() or "Independent Practice"
        organization = create_provider_organization(provider_org_name)
        db.session.add(OrganizationMember(organization_id=organization.id, user_id=user.id, role=role))
        program_name = (data.get("program_name") or "").strip() or None
        db.session.add(TraineeProfile(user_id=user.id, languages=languages, program_name=program_name))
    elif role == UserRole.CLIENT:
        db.session.add(ClientProfile(user_id=user.id))

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
    except OperationalError:
        db.session.rollback()
        return jsonify(
            {
                "error": "ServiceUnavailable",
                "message": "Database is busy. Please wait a moment and try again.",
            }
        ), 503


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = db.session.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        return jsonify({"error": "Unauthorized", "message": "Invalid or inactive user"}), 401

    return jsonify({"access_token": create_access_token(identity=str(user.id))})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.get(User, uuid.UUID(user_id))
    if not user:
        return jsonify({"error": "Not Found", "message": "User not found"}), 404
    return jsonify({"user": _user_to_dict(user)})
