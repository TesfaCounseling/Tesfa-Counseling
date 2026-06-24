"""Add languages to trainee profiles

Revision ID: a1b2c3d4e5f6
Revises: e95c4e9c45bc
Create Date: 2026-06-18

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "e95c4e9c45bc"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("trainee_profiles", sa.Column("languages", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("trainee_profiles", "languages")
