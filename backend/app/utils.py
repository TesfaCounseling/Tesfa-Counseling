import re
import uuid

from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from werkzeug.exceptions import HTTPException

from sqlalchemy.exc import OperationalError

from app.extensions import db
from app.models import Organization, OrganizationMember, User, UserRole

PROVIDER_ROLES = (UserRole.THERAPIST, UserRole.TRAINEE)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "organization"


def create_provider_organization(name: str) -> Organization:
    org_slug_base = slugify(name)
    org_slug = org_slug_base
    suffix = 1
    while Organization.query.filter_by(slug=org_slug).first():
        org_slug = f"{org_slug_base}-{suffix}"
        suffix += 1
    organization = Organization(name=name, slug=org_slug)
    db.session.add(organization)
    db.session.flush()
    return organization


def get_provider_organization_id(provider_id: uuid.UUID) -> uuid.UUID | None:
    membership = OrganizationMember.query.filter(
        OrganizationMember.user_id == provider_id,
        OrganizationMember.is_active.is_(True),
        OrganizationMember.role.in_(PROVIDER_ROLES),
    ).first()
    return membership.organization_id if membership else None


def ensure_client_org_membership(client_id: uuid.UUID, organization_id: uuid.UUID) -> OrganizationMember:
    """Link a client to a practice org (idempotent). Called when booking a session."""
    existing = OrganizationMember.query.filter_by(
        user_id=client_id,
        organization_id=organization_id,
    ).first()
    if existing:
        existing.is_active = True
        if existing.role != UserRole.CLIENT:
            existing.role = UserRole.CLIENT
        return existing

    membership = OrganizationMember(
        organization_id=organization_id,
        user_id=client_id,
        role=UserRole.CLIENT,
    )
    db.session.add(membership)
    db.session.flush()
    return membership


def get_current_user() -> User | None:
    user_id = get_jwt_identity()
    if not user_id:
        return None
    return db.session.get(User, uuid.UUID(user_id))


def user_has_role(user: User, role: UserRole, organization_id: uuid.UUID | None = None) -> bool:
    query = OrganizationMember.query.filter_by(user_id=user.id, role=role, is_active=True)
    if organization_id:
        query = query.filter_by(organization_id=organization_id)
    return query.first() is not None


def is_platform_admin(user: User) -> bool:
    return user_has_role(user, UserRole.PLATFORM_ADMIN)


def log_audit(
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: str | None = None,
    actor_id=None,
) -> None:
    from app.models import AuditLog

    if actor_id is None:
        try:
            user = get_current_user()
            if user:
                actor_id = user.id
        except RuntimeError:
            actor_id = None

    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
    )
    db.session.add(entry)


def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        return jsonify({"error": error.name, "message": error.description}), error.code

    @app.errorhandler(OperationalError)
    def handle_database_error(error: OperationalError):
        db.session.rollback()
        if "locked" in str(error).lower():
            return jsonify(
                {
                    "error": "ServiceUnavailable",
                    "message": "Database is busy. Please wait a moment and try again.",
                }
            ), 503
        app.logger.exception("Database error: %s", error)
        return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred"}), 500

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error: Exception):
        app.logger.exception("Unhandled exception: %s", error)
        return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred"}), 500
