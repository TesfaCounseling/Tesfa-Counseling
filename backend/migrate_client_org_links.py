"""
Migrate client organization links to industry-standard model.

Clients are NOT assigned an org at registration. They are linked to a
counselor's practice org when they book (or were booked in the past).

Also removes legacy shared client org (counsel-connect) and empty orphans.

Usage:
  cd backend
  python migrate_client_org_links.py
"""
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models import Appointment, Organization, OrganizationMember, User, UserRole
from app.utils import ensure_client_org_membership

LEGACY_CLIENT_ORG_SLUGS = {"counsel-connect"}
PROTECTED_ORG_SLUGS = {"platform", "demo-clinic"}


def link_clients_from_appointments() -> int:
    linked = 0
    for appt in Appointment.query.all():
        client = db.session.get(User, appt.client_id)
        if not client or not client.client_profile:
            continue
        ensure_client_org_membership(appt.client_id, appt.organization_id)
        linked += 1
    return linked


def remove_legacy_client_memberships() -> int:
    removed = 0
    legacy_orgs = Organization.query.filter(Organization.slug.in_(LEGACY_CLIENT_ORG_SLUGS)).all()
    legacy_ids = {org.id for org in legacy_orgs}

    for membership in OrganizationMember.query.filter_by(role=UserRole.CLIENT).all():
        org = db.session.get(Organization, membership.organization_id)
        if not org:
            db.session.delete(membership)
            removed += 1
            continue

        if org.slug in LEGACY_CLIENT_ORG_SLUGS:
            db.session.delete(membership)
            removed += 1
            continue

        if membership.organization_id in legacy_ids:
            db.session.delete(membership)
            removed += 1

    return removed


def remove_orphan_client_memberships() -> int:
    """Remove client org links where the client has no appointments in that org."""
    removed = 0
    for membership in OrganizationMember.query.filter_by(role=UserRole.CLIENT, is_active=True).all():
        has_appt = Appointment.query.filter_by(
            client_id=membership.user_id,
            organization_id=membership.organization_id,
        ).first()
        if not has_appt:
            db.session.delete(membership)
            removed += 1
    return removed


def delete_empty_organizations() -> list[str]:
    deleted: list[str] = []
    for org in Organization.query.all():
        if org.slug in PROTECTED_ORG_SLUGS:
            continue
        member_count = OrganizationMember.query.filter_by(organization_id=org.id).count()
        appt_count = Appointment.query.filter_by(organization_id=org.id).count()
        if member_count == 0 and appt_count == 0:
            deleted.append(org.slug)
            db.session.delete(org)
    return deleted


def main():
    app = create_app()
    with app.app_context():
        linked = link_clients_from_appointments()
        removed_legacy = remove_legacy_client_memberships()
        removed_orphans = remove_orphan_client_memberships()
        deleted_orgs = delete_empty_organizations()
        db.session.commit()

        client_memberships = OrganizationMember.query.filter_by(role=UserRole.CLIENT, is_active=True).count()
        org_count = Organization.query.count()

        print(f"Linked {linked} client-org relationship(s) from appointment history")
        print(f"Removed {removed_legacy} legacy shared-org client membership(s)")
        print(f"Removed {removed_orphans} orphan client membership(s) with no sessions")
        if deleted_orgs:
            print(f"Deleted empty organization(s): {', '.join(deleted_orgs)}")
        else:
            print("No empty organizations deleted")
        print(f"Active client practice links: {client_memberships}")
        print(f"{org_count} organization(s) remain")


if __name__ == "__main__":
    main()
