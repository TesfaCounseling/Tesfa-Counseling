"""Phase 3 video fields on appointments

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa


revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("appointments", sa.Column("video_room_name", sa.String(length=255), nullable=True))
    op.add_column("appointments", sa.Column("video_room_url", sa.String(length=512), nullable=True))


def downgrade():
    op.drop_column("appointments", "video_room_url")
    op.drop_column("appointments", "video_room_name")
