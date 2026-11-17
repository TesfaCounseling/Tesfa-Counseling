"""Add timezone to therapist and trainee profiles

Revision ID: p3b4c5d6e7f8a9
Revises: o2a3b4c5d6e7f8
Create Date: 2026-11-16

"""
import sqlalchemy as sa
from alembic import op

revision = "p3b4c5d6e7f8a9"
down_revision = "o2a3b4c5d6e7f8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("therapist_profiles", sa.Column("timezone", sa.String(length=64), nullable=True))
    op.add_column("trainee_profiles", sa.Column("timezone", sa.String(length=64), nullable=True))


def downgrade():
    op.drop_column("trainee_profiles", "timezone")
    op.drop_column("therapist_profiles", "timezone")
