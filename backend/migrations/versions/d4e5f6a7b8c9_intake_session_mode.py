"""Trainee intake + session mode on appointments

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-06-19

"""
import sqlalchemy as sa
from alembic import op

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade():
    session_mode = sa.Enum("video", "audio_only", name="session_mode")
    intake_session_mode = sa.Enum("video", "audio_only", name="trainee_intake_session_mode")
    session_mode.create(op.get_bind(), checkfirst=True)
    intake_session_mode.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "appointments",
        sa.Column("session_mode", session_mode, nullable=False, server_default="video"),
    )

    op.create_table(
        "trainee_intakes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("client_id", sa.UUID(), nullable=False),
        sa.Column("trainee_provider_id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("presenting_concerns", sa.Text(), nullable=False),
        sa.Column("primary_goals", sa.Text(), nullable=False),
        sa.Column("prior_therapy", sa.Text(), nullable=True),
        sa.Column("current_medications", sa.Text(), nullable=True),
        sa.Column("emergency_contact_name", sa.String(length=255), nullable=False),
        sa.Column("emergency_contact_phone", sa.String(length=32), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("preferred_session_mode", intake_session_mode, nullable=False, server_default="video"),
        sa.Column("supervised_care_consent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("telehealth_consent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("crisis_acknowledgment", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["trainee_provider_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("client_id", "trainee_provider_id", name="uq_trainee_intake_client"),
    )
    op.create_index("ix_trainee_intakes_client_id", "trainee_intakes", ["client_id"])
    op.create_index("ix_trainee_intakes_trainee_provider_id", "trainee_intakes", ["trainee_provider_id"])


def downgrade():
    op.drop_table("trainee_intakes")
    op.drop_column("appointments", "session_mode")
    sa.Enum(name="trainee_intake_session_mode").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="session_mode").drop(op.get_bind(), checkfirst=True)
