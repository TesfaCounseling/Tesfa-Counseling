import os
from datetime import timedelta
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent


def _default_database_url() -> str:
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        if explicit.startswith("postgres://"):
            return explicit.replace("postgres://", "postgresql://", 1)
        return explicit

    # SQLite lives at project root (off Google Drive / sync folders).
    project_root = _BACKEND_DIR.parent
    default_local = project_root / "tesfa_counseling.db"
    legacy_local = Path(r"C:\dev\ethio-counseling\ethio_counseling.db")
    configured = os.environ.get("LOCAL_DATABASE_PATH")
    if configured:
        local_path = Path(configured)
    elif default_local.exists():
        local_path = default_local
    elif legacy_local.exists():
        local_path = legacy_local
    else:
        local_path = default_local

    source_path = _BACKEND_DIR / "instance" / "tesfa_counseling.db"
    legacy_source = _BACKEND_DIR / "instance" / "ethio_counseling.db"
    if not source_path.exists() and legacy_source.exists():
        source_path = legacy_source
    if not local_path.exists() and source_path.exists() and source_path.stat().st_size > 0:
        from app.db_utils import ensure_local_sqlite_copy

        ensure_local_sqlite_copy(source_path, local_path)

    if local_path.parent.exists() or os.name == "nt":
        return f"sqlite:///{local_path.as_posix()}"

    return f"sqlite:///{(source_path).as_posix()}"


def _engine_options(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        from app.db_utils import sqlite_engine_options

        return sqlite_engine_options()
    return {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {
            "connect_timeout": int(os.environ.get("DATABASE_CONNECT_TIMEOUT", "10")),
            "options": f"-c statement_timeout={os.environ.get('DATABASE_STATEMENT_TIMEOUT_MS', '30000')}",
        },
    }


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    database_url = _default_database_url()
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = _engine_options(database_url)

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
        if origin.strip()
    ]

    TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
    DAILY_API_KEY = os.environ.get("DAILY_API_KEY", "")
    STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
