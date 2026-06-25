from datetime import datetime, timedelta, timezone
import uuid

from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_

from app.decorators import require_roles
from app.extensions import db
from app.models import (
    Appointment,
    AppointmentStatus,
    ApprovalStatus,
    AuditLog,
    ClientProfile,
    Organization,
    OrganizationMember,
    PricingType,
    SessionPricing,
    TherapistProfile,
    TraineeProfile,
    User,
    UserRole,
)
from app.utils import log_audit, user_has_role

admin_bp = Blueprint("admin", __name__)

GRANTABLE_ROLES = {UserRole.SUPERVISOR, UserRole.PLATFORM_ADMIN}
PROVIDER_ROLES = {UserRole.THERAPIST, UserRole.TRAINEE, UserRole.CLIENT}


def _provider_org_name(user: User) -> str | None:
    for membership in user.memberships:
        if membership.is_active and membership.role in (UserRole.THERAPIST, UserRole.TRAINEE):
            org = membership.organization
            if org:
                return org.name
    return None


def _therapist_to_dict(profile: TherapistProfile) -> dict:
    user = profile.user
    return {
        "id": str(profile.id),
        "user_id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "bio": profile.bio,
        "specializations": profile.specializations,
        "languages": profile.languages,
        "license_number": profile.license_number,
        "license_authority": profile.license_authority,
        "organization_name": _provider_org_name(user),
        "approval_status": profile.approval_status.value,
        "created_at": profile.created_at.isoformat(),
    }


def _trainee_to_dict(profile: TraineeProfile) -> dict:
    user = profile.user
    return {
        "id": str(profile.id),
        "user_id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "program_name": profile.program_name,
        "languages": profile.languages,
        "organization_name": _provider_org_name(user),
        "supervisor_id": str(profile.supervisor_id) if profile.supervisor_id else None,
        "approval_status": profile.approval_status.value,
        "created_at": profile.created_at.isoformat(),
    }


@admin_bp.route("/therapists/pending", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN)
def pending_therapists(current_user):
    profiles = (
        TherapistProfile.query.filter_by(approval_status=ApprovalStatus.PENDING)
        .order_by(TherapistProfile.created_at.asc())
        .all()
    )
    return jsonify({"therapists": [_therapist_to_dict(p) for p in profiles]})


@admin_bp.route("/therapists/<uuid:profile_id>/approve", methods=["POST"])
@require_roles(UserRole.PLATFORM_ADMIN)
def approve_therapist(profile_id, current_user):
    profile = db.session.get(TherapistProfile, profile_id)
    if not profile:
        return jsonify({"error": "Not Found", "message": "Therapist profile not found"}), 404

    profile.approval_status = ApprovalStatus.APPROVED
    profile.approved_at = datetime.now(timezone.utc)
    profile.rejection_reason = None

    log_audit("therapist.approved", "therapist_profile", str(profile.id), f"by={current_user.id}")
    db.session.commit()

    return jsonify({"therapist": _therapist_to_dict(profile)})


@admin_bp.route("/therapists/<uuid:profile_id>/reject", methods=["POST"])
@require_roles(UserRole.PLATFORM_ADMIN)
def reject_therapist(profile_id, current_user):
    profile = db.session.get(TherapistProfile, profile_id)
    if not profile:
        return jsonify({"error": "Not Found", "message": "Therapist profile not found"}), 404

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()
    if not reason:
        return jsonify({"error": "ValidationError", "message": "Rejection reason is required"}), 400

    profile.approval_status = ApprovalStatus.REJECTED
    profile.rejection_reason = reason
    profile.approved_at = None

    log_audit("therapist.rejected", "therapist_profile", str(profile.id), reason)
    db.session.commit()

    return jsonify({"therapist": _therapist_to_dict(profile)})


@admin_bp.route("/trainees/pending", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR)
def pending_trainees(current_user):
    profiles = (
        TraineeProfile.query.filter_by(approval_status=ApprovalStatus.PENDING)
        .order_by(TraineeProfile.created_at.asc())
        .all()
    )
    return jsonify({"trainees": [_trainee_to_dict(p) for p in profiles]})


@admin_bp.route("/trainees/<uuid:profile_id>/approve", methods=["POST"])
@require_roles(UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR)
def approve_trainee(profile_id, current_user):
    profile = db.session.get(TraineeProfile, profile_id)
    if not profile:
        return jsonify({"error": "Not Found", "message": "Trainee profile not found"}), 404

    data = request.get_json(silent=True) or {}
    supervisor_id = data.get("supervisor_id")
    if supervisor_id:
        try:
            supervisor_uuid = uuid.UUID(supervisor_id)
        except ValueError:
            return jsonify({"error": "ValidationError", "message": "Invalid supervisor_id"}), 400
        supervisor = db.session.get(User, supervisor_uuid)
        if not supervisor or not supervisor.is_active:
            return jsonify({"error": "ValidationError", "message": "Supervisor not found"}), 400
        if not (
            user_has_role(supervisor, UserRole.SUPERVISOR)
            or user_has_role(supervisor, UserRole.THERAPIST)
            or user_has_role(supervisor, UserRole.PLATFORM_ADMIN)
        ):
            return jsonify({"error": "ValidationError", "message": "Invalid supervisor"}), 400
        profile.supervisor_id = supervisor_uuid
    elif user_has_role(current_user, UserRole.SUPERVISOR):
        profile.supervisor_id = current_user.id

    profile.approval_status = ApprovalStatus.APPROVED
    log_audit("trainee.approved", "trainee_profile", str(profile.id), f"by={current_user.id}")
    db.session.commit()

    return jsonify({"trainee": _trainee_to_dict(profile)})


@admin_bp.route("/supervisors", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR)
def list_supervisors(current_user):
    """Users who can supervise trainees (supervisor role or licensed therapists)."""
    members = OrganizationMember.query.filter(
        OrganizationMember.is_active.is_(True),
        OrganizationMember.role.in_([UserRole.SUPERVISOR, UserRole.THERAPIST, UserRole.PLATFORM_ADMIN]),
    ).all()
    seen: set[uuid.UUID] = set()
    supervisors = []
    for m in members:
        if m.user_id in seen or not m.user.is_active:
            continue
        seen.add(m.user_id)
        supervisors.append({
            "id": str(m.user.id),
            "full_name": m.user.full_name,
            "email": m.user.email,
            "role": m.role.value,
        })
    supervisors.sort(key=lambda x: x["full_name"].lower())
    return jsonify({"supervisors": supervisors})


@admin_bp.route("/trainees/<uuid:profile_id>/reject", methods=["POST"])
@require_roles(UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR)
def reject_trainee(profile_id, current_user):
    profile = db.session.get(TraineeProfile, profile_id)
    if not profile:
        return jsonify({"error": "Not Found", "message": "Trainee profile not found"}), 404

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "").strip()
    if not reason:
        return jsonify({"error": "ValidationError", "message": "Rejection reason is required"}), 400

    profile.approval_status = ApprovalStatus.REJECTED
    profile.rejection_reason = reason

    log_audit("trainee.rejected", "trainee_profile", str(profile.id), reason)
    db.session.commit()

    return jsonify({"trainee": _trainee_to_dict(profile)})


def _user_admin_dict(user: User) -> dict:
    active_memberships = [m for m in user.memberships if m.is_active]
    org_ids = {m.organization_id for m in active_memberships}
    if org_ids:
        org_names = {
            str(org.id): org.name
            for org in Organization.query.filter(Organization.id.in_(org_ids)).all()
        }
    else:
        org_names = {}
    roles = [
        {
            "role": m.role.value,
            "organization_id": str(m.organization_id),
            "organization_name": org_names.get(str(m.organization_id)),
        }
        for m in active_memberships
    ]
    profile_type = None
    if user.therapist_profile:
        profile_type = "therapist"
    elif user.trainee_profile:
        profile_type = "trainee"
    elif user.client_profile:
        profile_type = "client"

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_email_verified": user.is_email_verified,
        "profile_type": profile_type,
        "roles": roles,
        "created_at": user.created_at.isoformat(),
    }


def _provider_admin_dict(user: User, profile_type: str, profile) -> dict:
    data = {
        "profile_id": str(profile.id),
        "user_id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "type": profile_type,
        "approval_status": profile.approval_status.value,
        "is_active": user.is_active,
        "created_at": profile.created_at.isoformat(),
    }
    if profile_type == "therapist":
        data["specializations"] = profile.specializations
        data["languages"] = profile.languages
        data["approved_at"] = profile.approved_at.isoformat() if profile.approved_at else None
    else:
        data["program_name"] = profile.program_name
    return data


def _resolve_resource_label(entry: AuditLog) -> str | None:
    if not entry.resource_id:
        return None
    try:
        resource_uuid = uuid.UUID(entry.resource_id)
    except ValueError:
        return None

    if entry.resource_type == "user":
        user = db.session.get(User, resource_uuid)
        return user.full_name if user else None
    if entry.resource_type == "therapist_profile":
        profile = db.session.get(TherapistProfile, resource_uuid)
        return profile.user.full_name if profile and profile.user else None
    if entry.resource_type == "trainee_profile":
        profile = db.session.get(TraineeProfile, resource_uuid)
        return profile.user.full_name if profile and profile.user else None
    if entry.resource_type == "organization":
        org = db.session.get(Organization, resource_uuid)
        return org.name if org else None
    return None


def _audit_to_dict(entry: AuditLog) -> dict:
    actor = db.session.get(User, entry.actor_id) if entry.actor_id else None
    resource_label = _resolve_resource_label(entry)
    return {
        "id": str(entry.id),
        "action": entry.action,
        "resource_type": entry.resource_type,
        "resource_id": entry.resource_id,
        "resource_label": resource_label,
        "details": entry.details,
        "actor_email": actor.email if actor else None,
        "actor_name": actor.full_name if actor else None,
        "created_at": entry.created_at.isoformat(),
    }


def _organization_to_dict(org: Organization) -> dict:
    member_count = OrganizationMember.query.filter_by(organization_id=org.id, is_active=True).count()
    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "timezone": org.timezone,
        "is_active": org.is_active,
        "member_count": member_count,
        "created_at": org.created_at.isoformat(),
    }


def _user_can_edit_org(user: User, org: Organization) -> bool:
    if user_has_role(user, UserRole.PLATFORM_ADMIN):
        return True
    return (
        OrganizationMember.query.filter_by(
            user_id=user.id,
            organization_id=org.id,
            role=UserRole.ORG_ADMIN,
            is_active=True,
        ).first()
        is not None
    )


def _get_platform_org() -> Organization:
    org = Organization.query.filter_by(slug="platform").first()
    if not org:
        org = Organization(name="Platform", slug="platform", timezone="UTC")
        db.session.add(org)
        db.session.flush()
    return org


def _parse_grantable_role(value: str) -> UserRole | None:
    try:
        role = UserRole(value)
    except ValueError:
        return None
    return role if role in GRANTABLE_ROLES else None


def _user_can_manage_staff_role(actor: User, role: UserRole, organization_id: uuid.UUID) -> bool:
    if not user_has_role(actor, UserRole.PLATFORM_ADMIN):
        return False
    if role == UserRole.PLATFORM_ADMIN:
        return organization_id == _get_platform_org().id
    return True


def _count_active_platform_admins() -> int:
    platform = _get_platform_org()
    return OrganizationMember.query.filter_by(
        organization_id=platform.id,
        role=UserRole.PLATFORM_ADMIN,
        is_active=True,
    ).count()


def _user_is_active_platform_admin(user: User) -> bool:
    platform = _get_platform_org()
    return (
        OrganizationMember.query.filter_by(
            organization_id=platform.id,
            user_id=user.id,
            role=UserRole.PLATFORM_ADMIN,
            is_active=True,
        ).first()
        is not None
    )


def _resolve_staff_role_org(role: UserRole, organization_id: uuid.UUID | None) -> uuid.UUID:
    """Supervisor and platform admin always live on the Platform org."""
    if role in (UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR):
        return _get_platform_org().id
    raise ValueError(f"organization_id is required for {role.value}")


def _find_staff_membership(
    user: User, role: UserRole, organization_id: uuid.UUID | None = None
) -> OrganizationMember | None:
    if role in (UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR):
        organization_id = _get_platform_org().id
    elif organization_id is None:
        return None
    return OrganizationMember.query.filter_by(
        organization_id=organization_id,
        user_id=user.id,
        role=role,
        is_active=True,
    ).first()


def _daily_counts(model, date_field, days: int = 7) -> list[dict]:
    """Return [{date: 'YYYY-MM-DD', count: N}, ...] for the last `days` calendar days (UTC)."""
    now = datetime.now(timezone.utc)
    result = []
    for offset in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=offset)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = model.query.filter(date_field >= day_start, date_field < day_end).count()
        result.append({"date": day_start.date().isoformat(), "count": count})
    return result


@admin_bp.route("/statistics", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN)
def admin_statistics(current_user):
    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)
    since_30d = now - timedelta(days=30)

    active_statuses = (
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
    )
    completed_statuses = (AppointmentStatus.COMPLETED,)

    appt_base = Appointment.query

    revenue_total = (
        db.session.query(func.coalesce(func.sum(Appointment.amount_cents), 0))
        .filter(Appointment.status != AppointmentStatus.CANCELLED)
        .scalar()
    )
    revenue_completed = (
        db.session.query(func.coalesce(func.sum(Appointment.amount_cents), 0))
        .filter(Appointment.status == AppointmentStatus.COMPLETED)
        .scalar()
    )
    revenue_30d = (
        db.session.query(func.coalesce(func.sum(Appointment.amount_cents), 0))
        .filter(
            Appointment.status != AppointmentStatus.CANCELLED,
            Appointment.created_at >= since_30d,
        )
        .scalar()
    )

    avg_session = (
        db.session.query(func.coalesce(func.avg(Appointment.amount_cents), 0))
        .filter(
            Appointment.status != AppointmentStatus.CANCELLED,
            Appointment.amount_cents > 0,
        )
        .scalar()
    )

    by_status = {
        status.value: Appointment.query.filter_by(status=status).count()
        for status in AppointmentStatus
    }
    by_pricing = {
        pt.value: Appointment.query.filter_by(pricing_type=pt).count()
        for pt in PricingType
    }

    currency_rows = (
        db.session.query(
            Appointment.currency,
            func.coalesce(func.sum(Appointment.amount_cents), 0).label("total_cents"),
            func.count(Appointment.id).label("count"),
        )
        .filter(Appointment.status != AppointmentStatus.CANCELLED)
        .group_by(Appointment.currency)
        .all()
    )

    top_provider_rows = (
        db.session.query(
            User.id,
            User.first_name,
            User.last_name,
            func.count(Appointment.id).label("bookings"),
            func.coalesce(func.sum(Appointment.amount_cents), 0).label("revenue_cents"),
        )
        .join(Appointment, Appointment.provider_id == User.id)
        .filter(Appointment.status != AppointmentStatus.CANCELLED)
        .group_by(User.id, User.first_name, User.last_name)
        .order_by(func.count(Appointment.id).desc())
        .limit(10)
        .all()
    )

    platform_admin_count = (
        OrganizationMember.query.filter_by(role=UserRole.PLATFORM_ADMIN, is_active=True).count()
    )

    return jsonify(
        {
            "generated_at": now.isoformat(),
            "users": {
                "total": User.query.count(),
                "active": User.query.filter_by(is_active=True).count(),
                "inactive": User.query.filter_by(is_active=False).count(),
                "new_7d": User.query.filter(User.created_at >= since_7d).count(),
                "new_30d": User.query.filter(User.created_at >= since_30d).count(),
                "clients": ClientProfile.query.count(),
                "platform_admins": platform_admin_count,
                "counselors": {
                    "pending": TherapistProfile.query.filter_by(approval_status=ApprovalStatus.PENDING).count(),
                    "approved": TherapistProfile.query.filter_by(approval_status=ApprovalStatus.APPROVED).count(),
                    "rejected": TherapistProfile.query.filter_by(approval_status=ApprovalStatus.REJECTED).count(),
                    "suspended": TherapistProfile.query.filter_by(approval_status=ApprovalStatus.SUSPENDED).count(),
                },
                "trainees": {
                    "pending": TraineeProfile.query.filter_by(approval_status=ApprovalStatus.PENDING).count(),
                    "approved": TraineeProfile.query.filter_by(approval_status=ApprovalStatus.APPROVED).count(),
                    "rejected": TraineeProfile.query.filter_by(approval_status=ApprovalStatus.REJECTED).count(),
                    "suspended": TraineeProfile.query.filter_by(approval_status=ApprovalStatus.SUSPENDED).count(),
                },
            },
            "organizations": {
                "total": Organization.query.count(),
                "active": Organization.query.filter_by(is_active=True).count(),
                "inactive": Organization.query.filter_by(is_active=False).count(),
            },
            "appointments": {
                "total": appt_base.count(),
                "upcoming": appt_base.filter(
                    Appointment.starts_at >= now,
                    Appointment.status.in_(active_statuses),
                ).count(),
                "completed": appt_base.filter(Appointment.status.in_(completed_statuses)).count(),
                "cancelled": appt_base.filter(Appointment.status == AppointmentStatus.CANCELLED).count(),
                "no_show": appt_base.filter(Appointment.status == AppointmentStatus.NO_SHOW).count(),
                "new_7d": appt_base.filter(Appointment.created_at >= since_7d).count(),
                "new_30d": appt_base.filter(Appointment.created_at >= since_30d).count(),
                "with_video_room": appt_base.filter(Appointment.video_room_url.isnot(None)).count(),
                "by_status": by_status,
                "by_pricing_type": by_pricing,
            },
            "revenue": {
                "total_recorded_cents": int(revenue_total or 0),
                "completed_cents": int(revenue_completed or 0),
                "last_30d_cents": int(revenue_30d or 0),
                "avg_paid_session_cents": int(round(float(avg_session or 0))),
                "pro_bono_sessions": Appointment.query.filter_by(pricing_type=PricingType.PRO_BONO).count(),
                "sliding_scale_sessions": Appointment.query.filter_by(pricing_type=PricingType.SLIDING_SCALE).count(),
                "by_currency": [
                    {"currency": row.currency, "total_cents": int(row.total_cents), "sessions": row.count}
                    for row in currency_rows
                ],
            },
            "platform": {
                "session_pricing_rules": SessionPricing.query.count(),
                "audit_events_24h": AuditLog.query.filter(AuditLog.created_at >= since_24h).count(),
                "audit_events_7d": AuditLog.query.filter(AuditLog.created_at >= since_7d).count(),
                "audit_events_30d": AuditLog.query.filter(AuditLog.created_at >= since_30d).count(),
            },
            "trends": {
                "signups_daily": _daily_counts(User, User.created_at),
                "bookings_daily": _daily_counts(Appointment, Appointment.created_at),
            },
            "top_providers": [
                {
                    "id": str(row.id),
                    "name": f"{row.first_name} {row.last_name}".strip(),
                    "bookings": row.bookings,
                    "revenue_cents": int(row.revenue_cents),
                }
                for row in top_provider_rows
            ],
        }
    )


@admin_bp.route("/overview", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN, UserRole.SUPERVISOR)
def admin_overview(current_user):
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    return jsonify(
        {
            "pending_counselors": TherapistProfile.query.filter_by(approval_status=ApprovalStatus.PENDING).count(),
            "pending_trainees": TraineeProfile.query.filter_by(approval_status=ApprovalStatus.PENDING).count(),
            "approved_counselors": TherapistProfile.query.filter_by(approval_status=ApprovalStatus.APPROVED).count(),
            "approved_trainees": TraineeProfile.query.filter_by(approval_status=ApprovalStatus.APPROVED).count(),
            "total_users": User.query.count(),
            "active_users": User.query.filter_by(is_active=True).count(),
            "organizations": Organization.query.filter_by(is_active=True).count(),
            "audit_events_24h": AuditLog.query.filter(AuditLog.created_at >= since).count(),
        }
    )


@admin_bp.route("/users", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN)
def list_users(current_user):
    limit = min(max(int(request.args.get("limit", 50)), 1), 100)
    offset = max(int(request.args.get("offset", 0)), 0)
    search = (request.args.get("q") or "").strip()

    query = User.query.order_by(User.created_at.desc())
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(pattern),
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
            )
        )

    total = query.count()
    users = query.offset(offset).limit(limit).all()
    return jsonify(
        {
            "users": [_user_admin_dict(u) for u in users],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    )


@admin_bp.route("/users/<uuid:user_id>", methods=["PATCH"])
@require_roles(UserRole.PLATFORM_ADMIN)
def update_user(user_id, current_user):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Not Found", "message": "User not found"}), 404

    if user.id == current_user.id:
        return jsonify({"error": "Forbidden", "message": "You cannot modify your own account here"}), 403

    data = request.get_json(silent=True) or {}
    if "is_active" not in data:
        return jsonify({"error": "ValidationError", "message": "No supported fields to update"}), 400

    user.is_active = bool(data["is_active"])
    action = "user.activated" if user.is_active else "user.deactivated"
    log_audit(action, "user", str(user.id), actor_id=current_user.id)
    db.session.commit()

    return jsonify({"user": _user_admin_dict(user)})


@admin_bp.route("/users/<uuid:user_id>", methods=["DELETE"])
@require_roles(UserRole.PLATFORM_ADMIN)
def delete_user(user_id, current_user):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Not Found", "message": "User not found"}), 404

    if user.id == current_user.id:
        return jsonify({"error": "Forbidden", "message": "You cannot delete your own account"}), 403

    if _user_is_active_platform_admin(user) and _count_active_platform_admins() <= 1:
        return jsonify({"error": "Conflict", "message": "Cannot delete the last platform admin"}), 409

    deleted_email = user.email
    deleted_name = user.full_name
    deleted_id = str(user.id)
    log_audit(
        "user.deleted",
        "user",
        deleted_id,
        f"email={deleted_email}",
        actor_id=current_user.id,
    )
    db.session.delete(user)
    db.session.commit()

    return jsonify(
        {
            "ok": True,
            "deleted_user_id": deleted_id,
            "email": deleted_email,
            "full_name": deleted_name,
        }
    )


@admin_bp.route("/users/<uuid:user_id>/roles", methods=["POST"])
@require_roles(UserRole.PLATFORM_ADMIN)
def grant_user_role(user_id, current_user):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Not Found", "message": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    role = _parse_grantable_role((data.get("role") or "").strip())
    if not role:
        return jsonify({"error": "ValidationError", "message": "Invalid or unsupported role"}), 400

    org_id_raw = data.get("organization_id")
    organization_id: uuid.UUID | None = None
    if org_id_raw:
        try:
            organization_id = uuid.UUID(str(org_id_raw))
        except ValueError:
            return jsonify({"error": "ValidationError", "message": "Invalid organization_id"}), 400

    try:
        organization_id = _resolve_staff_role_org(role, organization_id)
    except ValueError:
        return jsonify({"error": "ValidationError", "message": "organization_id is required for org admin"}), 400

    org = db.session.get(Organization, organization_id)
    if not org or not org.is_active:
        return jsonify({"error": "Not Found", "message": "Organization not found"}), 404

    if not _user_can_manage_staff_role(current_user, role, organization_id):
        return jsonify({"error": "Forbidden", "message": "Insufficient permissions for this role"}), 403

    membership = OrganizationMember.query.filter_by(
        organization_id=organization_id,
        user_id=user.id,
    ).first()

    if membership and membership.is_active and membership.role == role:
        return jsonify({"user": _user_admin_dict(user)})

    if membership and membership.is_active and membership.role in PROVIDER_ROLES:
        return jsonify(
            {
                "error": "Conflict",
                "message": (
                    f"This user already has the {membership.role.value} role for {org.name}. "
                    "Choose a different organization (for example Platform) or remove that membership first."
                ),
            }
        ), 409

    if membership and membership.is_active and membership.role in GRANTABLE_ROLES and membership.role != role:
        membership.role = role
        membership.is_active = True
    elif membership:
        membership.role = role
        membership.is_active = True
    else:
        db.session.add(
            OrganizationMember(
                organization_id=organization_id,
                user_id=user.id,
                role=role,
            )
        )

    log_audit(
        "user.role_granted",
        "user",
        str(user.id),
        f"role={role.value},org={organization_id}",
        actor_id=current_user.id,
    )
    db.session.commit()
    return jsonify({"user": _user_admin_dict(user)})


@admin_bp.route("/users/<uuid:user_id>/roles", methods=["DELETE"])
@require_roles(UserRole.PLATFORM_ADMIN)
def revoke_user_role(user_id, current_user):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "Not Found", "message": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    role = _parse_grantable_role((data.get("role") or "").strip())
    if not role:
        return jsonify({"error": "ValidationError", "message": "Invalid or unsupported role"}), 400

    org_id_raw = data.get("organization_id")
    organization_id: uuid.UUID | None = None
    if org_id_raw:
        try:
            organization_id = uuid.UUID(str(org_id_raw))
        except ValueError:
            return jsonify({"error": "ValidationError", "message": "Invalid organization_id"}), 400

    membership = _find_staff_membership(user, role, organization_id)
    if not membership:
        return jsonify({"error": "Not Found", "message": "Role assignment not found"}), 404

    if role == UserRole.PLATFORM_ADMIN and user.id == current_user.id:
        return jsonify({"error": "Forbidden", "message": "You cannot remove your own platform admin role"}), 403

    if role == UserRole.PLATFORM_ADMIN and _count_active_platform_admins() <= 1:
        return jsonify({"error": "Conflict", "message": "At least one platform admin is required"}), 409

    membership.is_active = False
    log_audit(
        "user.role_revoked",
        "user",
        str(user.id),
        f"role={role.value},org={organization_id}",
        actor_id=current_user.id,
    )
    db.session.commit()
    return jsonify({"user": _user_admin_dict(user)})


@admin_bp.route("/providers", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN)
def list_providers(current_user):
    status_filter = (request.args.get("status") or "all").lower()
    valid = {s.value for s in ApprovalStatus} | {"all"}
    if status_filter not in valid:
        return jsonify({"error": "ValidationError", "message": "Invalid status filter"}), 400

    therapist_query = db.session.query(User, TherapistProfile).join(
        TherapistProfile, TherapistProfile.user_id == User.id
    )
    trainee_query = db.session.query(User, TraineeProfile).join(
        TraineeProfile, TraineeProfile.user_id == User.id
    )

    if status_filter != "all":
        therapist_query = therapist_query.filter(TherapistProfile.approval_status == ApprovalStatus(status_filter))
        trainee_query = trainee_query.filter(TraineeProfile.approval_status == ApprovalStatus(status_filter))

    providers = [_provider_admin_dict(u, "therapist", p) for u, p in therapist_query.order_by(User.created_at.desc()).all()]
    providers += [_provider_admin_dict(u, "trainee", p) for u, p in trainee_query.order_by(User.created_at.desc()).all()]
    providers.sort(key=lambda p: p["created_at"], reverse=True)

    return jsonify({"providers": providers})


@admin_bp.route("/audit-logs", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN)
def list_audit_logs(current_user):
    limit = min(max(int(request.args.get("limit", 50)), 1), 100)
    offset = max(int(request.args.get("offset", 0)), 0)

    query = AuditLog.query.order_by(AuditLog.created_at.desc())
    total = query.count()
    logs = query.offset(offset).limit(limit).all()

    return jsonify(
        {
            "logs": [_audit_to_dict(entry) for entry in logs],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    )


@admin_bp.route("/organizations", methods=["GET"])
@require_roles(UserRole.PLATFORM_ADMIN)
def list_organizations(current_user):
    orgs = Organization.query.order_by(Organization.name.asc()).all()
    return jsonify({"organizations": [_organization_to_dict(o) for o in orgs]})


@admin_bp.route("/organizations/<uuid:org_id>", methods=["PATCH"])
@require_roles(UserRole.PLATFORM_ADMIN)
def update_organization(org_id, current_user):
    org = db.session.get(Organization, org_id)
    if not org:
        return jsonify({"error": "Not Found", "message": "Organization not found"}), 404

    if not _user_can_edit_org(current_user, org):
        return jsonify({"error": "Forbidden", "message": "Insufficient permissions for this organization"}), 403

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify({"error": "ValidationError", "message": "Organization name cannot be empty"}), 400
        org.name = name

    if "timezone" in data:
        timezone_value = (data["timezone"] or "").strip()
        if not timezone_value:
            return jsonify({"error": "ValidationError", "message": "Timezone cannot be empty"}), 400
        org.timezone = timezone_value

    if "is_active" in data and user_has_role(current_user, UserRole.PLATFORM_ADMIN):
        org.is_active = bool(data["is_active"])

    log_audit("organization.updated", "organization", str(org.id), actor_id=current_user.id)
    db.session.commit()

    return jsonify({"organization": _organization_to_dict(org)})
