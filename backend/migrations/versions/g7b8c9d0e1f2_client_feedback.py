"""Client feedback and complaints

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-23

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision = "g7b8c9d0e1f2"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade():
    feedback_category = postgresql.ENUM(
        "feedback",
        "complaint",
        name="feedback_category",
        create_type=False,
    )
    feedback_status = postgresql.ENUM(
        "open",
        "resolved",
        name="feedback_status",
        create_type=False,
    )
    feedback_category.create(op.get_bind(), checkfirst=True)
    feedback_status.create(op.get_bind(), checkfirst=True)

    bind = op.get_bind()
    if "client_feedback" in inspect(bind).get_table_names():
        return

    op.create_table(
        "client_feedback",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("client_id", sa.UUID(), nullable=False),
        sa.Column("category", feedback_category, nullable=False),
        sa.Column("subject", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", feedback_status, nullable=False, server_default="open"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resolved_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_client_feedback_client_id", "client_feedback", ["client_id"])
    op.create_index("ix_client_feedback_created_at", "client_feedback", ["created_at"])


def downgrade():
    op.drop_index("ix_client_feedback_created_at", table_name="client_feedback")
    op.drop_index("ix_client_feedback_client_id", table_name="client_feedback")
    op.drop_table("client_feedback")
    postgresql.ENUM(name="feedback_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="feedback_category").drop(op.get_bind(), checkfirst=True)
