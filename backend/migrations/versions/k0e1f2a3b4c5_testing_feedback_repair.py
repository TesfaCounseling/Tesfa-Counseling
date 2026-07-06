"""Repair testing_feedback schema for guest submissions

Revision ID: k0e1f2a3b4c5
Revises: j9e0f1a2b3c4
Create Date: 2026-07-06

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "k0e1f2a3b4c5"
down_revision = "j9e0f1a2b3c4"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = inspect(bind)
    tables = insp.get_table_names()

    testing_feedback_type = postgresql.ENUM(
        "change",
        "bug",
        "add_feature",
        "confusing",
        "other",
        name="testing_feedback_type",
        create_type=False,
    )
    feedback_status = postgresql.ENUM(
        "open",
        "resolved",
        name="feedback_status",
        create_type=False,
    )

    if bind.dialect.name == "postgresql":
        testing_feedback_type.create(bind, checkfirst=True)
        feedback_status.create(bind, checkfirst=True)

    if "testing_feedback" not in tables:
        op.create_table(
            "testing_feedback",
            sa.Column("id", sa.UUID(), nullable=False),
            sa.Column("user_id", sa.UUID(), nullable=True),
            sa.Column("submitter_name", sa.String(length=120), nullable=True),
            sa.Column("tester_role", sa.String(length=80), nullable=False),
            sa.Column("feedback_type", testing_feedback_type, nullable=False),
            sa.Column("page_path", sa.String(length=500), nullable=False),
            sa.Column("page_title", sa.String(length=200), nullable=False, server_default=""),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("status", feedback_status, nullable=False, server_default="open"),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("resolved_by_id", sa.UUID(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["resolved_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_testing_feedback_user_id", "testing_feedback", ["user_id"])
        op.create_index("ix_testing_feedback_created_at", "testing_feedback", ["created_at"])
        op.create_index("ix_testing_feedback_page_path", "testing_feedback", ["page_path"])
        return

    columns = {col["name"] for col in insp.get_columns("testing_feedback")}
    if "submitter_name" not in columns:
        op.add_column("testing_feedback", sa.Column("submitter_name", sa.String(length=120), nullable=True))

    user_col = next(c for c in insp.get_columns("testing_feedback") if c["name"] == "user_id")
    if user_col.get("nullable") is False:
        op.alter_column("testing_feedback", "user_id", existing_type=sa.UUID(), nullable=True)


def downgrade():
    pass
