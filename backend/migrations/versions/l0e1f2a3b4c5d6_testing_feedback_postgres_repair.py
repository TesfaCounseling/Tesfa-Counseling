"""Postgres idempotent testing_feedback repair

Revision ID: l0e1f2a3b4c5d6
Revises: k0e1f2a3b4c5
Create Date: 2026-07-06

"""
from alembic import op
from sqlalchemy import text

revision = "l0e1f2a3b4c5d6"
down_revision = "k0e1f2a3b4c5"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    bind.execute(
        text(
            """
            DO $$ BEGIN
                CREATE TYPE testing_feedback_type AS ENUM (
                    'change', 'bug', 'add_feature', 'confusing', 'other'
                );
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
            """
        )
    )

    bind.execute(
        text(
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
            """
        )
    )

    bind.execute(text("ALTER TABLE testing_feedback ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(120)"))
    bind.execute(text("ALTER TABLE testing_feedback ALTER COLUMN user_id DROP NOT NULL"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_testing_feedback_user_id ON testing_feedback (user_id)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_testing_feedback_created_at ON testing_feedback (created_at)"))
    bind.execute(text("CREATE INDEX IF NOT EXISTS ix_testing_feedback_page_path ON testing_feedback (page_path)"))


def downgrade():
    pass
