"""Therapist profile photo storage

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-25

"""
import sqlalchemy as sa
from alembic import op

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("therapist_profiles", sa.Column("photo_mime_type", sa.String(length=64), nullable=True))
    op.add_column("therapist_profiles", sa.Column("photo_data", sa.LargeBinary(), nullable=True))


def downgrade():
    op.drop_column("therapist_profiles", "photo_data")
    op.drop_column("therapist_profiles", "photo_mime_type")
