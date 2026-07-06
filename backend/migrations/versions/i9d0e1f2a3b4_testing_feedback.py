"""Testing-phase page feedback

Revision ID: i9d0e1f2a3b4
Revises: h8c9d0e1f2a3
Create Date: 2026-06-23

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "i9d0e1f2a3b4"
down_revision = "h8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade():
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
    testing_feedback_type.create(op.get_bind(), checkfirst=True)
    feedback_status.create(op.get_bind(), checkfirst=True)

    bind = op.get_bind()
    if "testing_feedback" in inspect(bind).get_table_names():
        return

    op.create_table(
        "testing_feedback",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
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


def downgrade():
    op.drop_index("ix_testing_feedback_page_path", table_name="testing_feedback")
    op.drop_index("ix_testing_feedback_created_at", table_name="testing_feedback")
    op.drop_index("ix_testing_feedback_user_id", table_name="testing_feedback")
    op.drop_table("testing_feedback")
    postgresql.ENUM(name="testing_feedback_type").drop(op.get_bind(), checkfirst=True)
