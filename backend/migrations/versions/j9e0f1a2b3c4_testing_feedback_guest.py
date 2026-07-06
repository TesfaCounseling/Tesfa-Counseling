"""Testing feedback guest submissions

Revision ID: j9e0f1a2b3c4
Revises: i9d0e1f2a3b4
Create Date: 2026-07-06

"""
import sqlalchemy as sa
from alembic import op

revision = "j9e0f1a2b3c4"
down_revision = "i9d0e1f2a3b4"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("testing_feedback", schema=None) as batch_op:
        batch_op.add_column(sa.Column("submitter_name", sa.String(length=120), nullable=True))
        batch_op.alter_column("user_id", existing_type=sa.UUID(), nullable=True)


def downgrade():
    with op.batch_alter_table("testing_feedback", schema=None) as batch_op:
        batch_op.alter_column("user_id", existing_type=sa.UUID(), nullable=False)
        batch_op.drop_column("submitter_name")
