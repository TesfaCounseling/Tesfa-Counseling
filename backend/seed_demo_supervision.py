"""Seed supervisor, trainee, and a demo clinical note for client demos."""
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models import (
    ApprovalStatus,
    Appointment,
    AppointmentStatus,
    AppointmentType,
    AvailabilityRule,
    ClinicalNote,
    ClinicalNoteStatus,
    Organization,
    OrganizationMember,
    PricingType,
    SessionPricing,
    TraineeProfile,
    TherapistProfile,
    User,
    UserRole,
)
from datetime import time


def main():
    app = create_app()
    with app.app_context():
        org = Organization.query.filter_by(slug="demo-clinic").first()
        if not org:
            org = Organization(name="Demo Clinic", slug="demo-clinic")
            db.session.add(org)
            db.session.flush()

        supervisor_email = "supervisor@demo.local"
        supervisor = User.query.filter_by(email=supervisor_email).first()
        if not supervisor:
            supervisor = User(
                email=supervisor_email,
                first_name="Dr. Sarah",
                last_name="Mitchell",
                is_email_verified=True,
            )
            supervisor.set_password("demo12345")
            db.session.add(supervisor)
            db.session.flush()
            db.session.add(
                OrganizationMember(organization_id=org.id, user_id=supervisor.id, role=UserRole.SUPERVISOR)
            )
            db.session.add(
                TherapistProfile(
                    user_id=supervisor.id,
                    bio="Licensed supervisor with 15 years clinical experience.",
                    specializations="Supervision, trauma, CBT",
                    languages="English",
                    approval_status=ApprovalStatus.APPROVED,
                )
            )

        trainee_email = "trainee@demo.local"
        trainee_user = User.query.filter_by(email=trainee_email).first()
        if not trainee_user:
            trainee_user = User(
                email=trainee_email,
                first_name="Alex",
                last_name="Rivera",
                is_email_verified=True,
            )
            trainee_user.set_password("demo12345")
            db.session.add(trainee_user)
            db.session.flush()
            db.session.add(
                OrganizationMember(organization_id=org.id, user_id=trainee_user.id, role=UserRole.TRAINEE)
            )
            db.session.add(
                TraineeProfile(
                    user_id=trainee_user.id,
                    program_name="MA Clinical Psychology",
                    languages="English, Spanish",
                    supervisor_id=supervisor.id,
                    approval_status=ApprovalStatus.APPROVED,
                )
            )
        else:
            if trainee_user.trainee_profile:
                trainee_user.trainee_profile.supervisor_id = supervisor.id
                trainee_user.trainee_profile.approval_status = ApprovalStatus.APPROVED

        if not AvailabilityRule.query.filter_by(provider_id=trainee_user.id).first():
            for dow in range(0, 5):
                db.session.add(
                    AvailabilityRule(
                        provider_id=trainee_user.id,
                        day_of_week=dow,
                        start_time=time(10, 0),
                        end_time=time(16, 0),
                        timezone="UTC",
                    )
                )

        if not SessionPricing.query.filter_by(provider_id=trainee_user.id, duration_minutes=50).first():
            db.session.add(
                SessionPricing(
                    provider_id=trainee_user.id,
                    duration_minutes=50,
                    amount_cents=4000,
                    pricing_type=PricingType.SLIDING_SCALE,
                    currency="USD",
                )
            )

        db.session.commit()
        print("Demo supervision accounts ready:")
        print(f"  Supervisor: {supervisor_email} / demo12345")
        print(f"  Trainee:    {trainee_email} / demo12345")


if __name__ == "__main__":
    main()
