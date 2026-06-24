from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.db_utils import configure_sqlite_engine
from app.config import config_by_name
from app.extensions import db, migrate
from app.routes.intake import intake_bp
from app.routes.clinical_notes import clinical_notes_bp
from app.routes.admin import admin_bp
from app.routes.appointments import appointments_bp
from app.routes.auth import auth_bp
from app.routes.availability import availability_bp
from app.routes.health import health_bp
from app.routes.telegram import telegram_bp
from app.routes.providers import providers_bp
from app.routes.therapists import therapists_bp
from app.utils import register_error_handlers


def create_app(config_name: str | None = None) -> Flask:
    app = Flask(__name__)
    config_name = config_name or "default"
    app.config.from_object(config_by_name[config_name])

    configure_sqlite_engine(app)

    db.init_app(app)
    migrate.init_app(app, db)
    JWTManager(app)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    register_error_handlers(app)

    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(telegram_bp, url_prefix="/api/v1/telegram")
    app.register_blueprint(therapists_bp, url_prefix="/api/v1/therapists")
    app.register_blueprint(providers_bp, url_prefix="/api/v1/providers")
    app.register_blueprint(availability_bp, url_prefix="/api/v1/availability")
    app.register_blueprint(appointments_bp, url_prefix="/api/v1/appointments")
    app.register_blueprint(clinical_notes_bp, url_prefix="/api/v1/clinical-notes")
    app.register_blueprint(intake_bp, url_prefix="/api/v1/intake")

    from app.tasks.reminders import send_reminders_command

    app.cli.add_command(send_reminders_command)

    return app
