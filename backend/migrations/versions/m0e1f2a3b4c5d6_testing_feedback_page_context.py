"""Add page_context to testing feedback

Revision ID: m0e1f2a3b4c5d6
Revises: l0e1f2a3b4c5d6
Create Date: 2026-07-06

"""
import sqlalchemy as sa
from alembic import op

revision = "m0e1f2a3b4c5d6"
down_revision = "l0e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "testing_feedback",
        sa.Column("page_context", sa.String(length=500), nullable=False, server_default=""),
    )


def downgrade():
    op.drop_column("testing_feedback", "page_context")
