"""
Seed a platform admin user.

Usage:
  cd backend
  python seed_admin.py

Production (Render Shell):
  flask db upgrade
  python seed_admin.py
"""
import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db
from app.models import Organization, OrganizationMember, User, UserRole


def main():
    email = os.environ.get("ADMIN_EMAIL", "admin@tesfacounseling.local")
    password = os.environ.get("ADMIN_PASSWORD", "admin-change-me")

    config_name = "production" if os.environ.get("FLASK_ENV") == "production" else "default"
    app = create_app(config_name)
    db_url = app.config.get("SQLALCHEMY_DATABASE_URI", "")

    if db_url.startswith("sqlite"):
        print("ERROR: Using SQLite, not Postgres. DATABASE_URL is missing in this shell.")
        print("  Render Shell: confirm Environment has DATABASE_URL, then run:")
        print("    echo $DATABASE_URL")
        print("    flask db upgrade")
        print("    python seed_admin.py")
        raise SystemExit(1)

    print(f"Database: Postgres ({db_url.split('@')[-1] if '@' in db_url else 'connected'})")

    with app.app_context():
        existing = User.query.filter_by(email=email).first()
        if existing:
            print(f"Admin already exists: {email}")
            return

        org = Organization.query.filter_by(slug="platform").first()
        if not org:
            org = Organization(name="Platform", slug="platform", timezone="UTC")
            db.session.add(org)
            db.session.flush()

        user = User(email=email, first_name="Platform", last_name="Admin", is_email_verified=True)
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        db.session.add(
            OrganizationMember(
                organization_id=org.id,
                user_id=user.id,
                role=UserRole.PLATFORM_ADMIN,
            )
        )
        db.session.commit()
        print(f"Created platform admin: {email}")


if __name__ == "__main__":
    main()
