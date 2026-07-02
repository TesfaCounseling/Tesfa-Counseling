"""Provider schedule change acknowledgment

Revision ID: h8c9d0e1f2a3
Revises: g7b8c9d0e1f2
Create Date: 2026-06-23

"""
import sqlalchemy as sa
from alembic import op

revision = "h8c9d0e1f2a3"
down_revision = "g7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "appointments",
        sa.Column("provider_schedule_ack_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("appointments", "provider_schedule_ack_at")
