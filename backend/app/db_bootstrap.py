"""Ensure optional tables exist when Alembic pre-deploy did not run (e.g. manual Render setup)."""

import logging

from sqlalchemy import inspect, text

from app.config import beta_feedback_enabled
from app.extensions import db

logger = logging.getLogger(__name__)


def ensure_testing_feedback_schema() -> None:
    if not beta_feedback_enabled():
        return

    bind = db.engine
    if bind.dialect.name != "postgresql":
        return

    inspector = inspect(bind)
    if "testing_feedback" in inspector.get_table_names():
        columns = {col["name"] for col in inspector.get_columns("testing_feedback")}
        if "submitter_name" in columns:
            return

    logger.warning("testing_feedback schema missing on Postgres — applying bootstrap SQL")

    statements = [
        """
        DO $$ BEGIN
            CREATE TYPE testing_feedback_type AS ENUM (
                'change', 'bug', 'add_feature', 'confusing', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """,
        """
        CREATE TABLE IF NOT EXISTS testing_feedback (
            id UUID PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            submitter_name VARCHAR(120),
            tester_role VARCHAR(80) NOT NULL,
            feedback_type testing_feedback_type NOT NULL,
            page_path VARCHAR(500) NOT NULL,
            page_title VARCHAR(200) NOT NULL DEFAULT '',
            message TEXT NOT NULL,
            status feedback_status NOT NULL DEFAULT 'open',
            resolved_at TIMESTAMPTZ,
            resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "ALTER TABLE testing_feedback ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(120)",
        "ALTER TABLE testing_feedback ALTER COLUMN user_id DROP NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_testing_feedback_user_id ON testing_feedback (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_testing_feedback_created_at ON testing_feedback (created_at)",
        "CREATE INDEX IF NOT EXISTS ix_testing_feedback_page_path ON testing_feedback (page_path)",
    ]

    with bind.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))

    logger.info("testing_feedback schema bootstrap complete")
