"""Seed an approved demo counselor with availability for testing Phase 2."""
from datetime import time

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models import (
    ApprovalStatus,
    AvailabilityRule,
    Organization,
    OrganizationMember,
    SessionPricing,
    TherapistProfile,
    User,
    UserRole,
    PricingType,
)


def main():
    app = create_app()
    with app.app_context():
        email = "counselor@demo.local"
        user = User.query.filter_by(email=email).first()
        if not user:
            org = Organization.query.filter_by(slug="demo-clinic").first()
            if not org:
                org = Organization(name="Demo Clinic", slug="demo-clinic")
                db.session.add(org)
                db.session.flush()

            user = User(email=email, first_name="Demo", last_name="Counselor", is_email_verified=True)
            user.set_password("demo12345")
            db.session.add(user)
            db.session.flush()

            db.session.add(OrganizationMember(organization_id=org.id, user_id=user.id, role=UserRole.THERAPIST))
            profile = TherapistProfile(
                user_id=user.id,
                bio="Experienced counselor specializing in anxiety, depression, and life transitions.",
                specializations="Anxiety, depression, stress management",
                languages="English, Spanish, Amharic",
                approval_status=ApprovalStatus.APPROVED,
            )
            db.session.add(profile)
        else:
            profile = user.therapist_profile
            if profile:
                profile.approval_status = ApprovalStatus.APPROVED
                profile.languages = "English, Spanish, Amharic"
                if not profile.bio:
                    profile.bio = "Experienced counselor specializing in anxiety, depression, and life transitions."
                if not profile.specializations:
                    profile.specializations = "Anxiety, depression, stress management"

        if not AvailabilityRule.query.filter_by(provider_id=user.id).first():
            for dow in range(0, 5):
                db.session.add(
                    AvailabilityRule(
                        provider_id=user.id,
                        day_of_week=dow,
                        start_time=time(9, 0),
                        end_time=time(17, 0),
                        timezone="UTC",
                    )
                )

        if not SessionPricing.query.filter_by(provider_id=user.id, duration_minutes=50).first():
            db.session.add(
                SessionPricing(
                    provider_id=user.id,
                    duration_minutes=50,
                    amount_cents=5000,
                    pricing_type=PricingType.STANDARD,
                )
            )

        db.session.commit()
        print(f"Demo counselor ready: {email} / demo12345")


if __name__ == "__main__":
    main()
