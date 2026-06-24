"""Phase 2 scheduling

Revision ID: e95c4e9c45bc
Revises: 989683a912d3
Create Date: 2026-06-17 22:10:08.758383

"""
from alembic import op
import sqlalchemy as sa


revision = "e95c4e9c45bc"
down_revision = "989683a912d3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider_id", sa.UUID(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_availability_provider_dow", "availability_rules", ["provider_id", "day_of_week"])

    op.create_table(
        "availability_blocks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider_id", sa.UUID(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["provider_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_availability_blocks_provider_id", "availability_blocks", ["provider_id"])

    op.create_table(
        "session_pricing",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider_id", sa.UUID(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column(
            "pricing_type",
            sa.Enum("STANDARD", "SLIDING_SCALE", "PRO_BONO", "TRAINEE_RATE", name="pricing_type"),
            nullable=False,
        ),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "duration_minutes", name="uq_provider_duration"),
    )

    op.create_table(
        "appointments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("client_id", sa.UUID(), nullable=False),
        sa.Column("provider_id", sa.UUID(), nullable=False),
        sa.Column("supervisor_id", sa.UUID(), nullable=True),
        sa.Column(
            "appointment_type",
            sa.Enum("CLIENT_SESSION", "SUPERVISION", "INTAKE", name="appointment_type"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW", name="appointment_status"
            ),
            nullable=False,
        ),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("client_timezone", sa.String(length=64), nullable=False),
        sa.Column("provider_timezone", sa.String(length=64), nullable=False),
        sa.Column(
            "pricing_type",
            sa.Enum("STANDARD", "SLIDING_SCALE", "PRO_BONO", "TRAINEE_RATE", name="appointment_pricing_type"),
            nullable=False,
        ),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("cancelled_by_id", sa.UUID(), nullable=True),
        sa.Column("reminder_24h_sent", sa.Boolean(), nullable=False),
        sa.Column("reminder_1h_sent", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cancelled_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["client_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["provider_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["supervisor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_appointments_client_id", "appointments", ["client_id"])
    op.create_index("ix_appointments_provider_id", "appointments", ["provider_id"])
    op.create_index("ix_appointments_provider_starts", "appointments", ["provider_id", "starts_at"])


def downgrade():
    op.drop_index("ix_appointments_provider_starts", table_name="appointments")
    op.drop_index("ix_appointments_provider_id", table_name="appointments")
    op.drop_index("ix_appointments_client_id", table_name="appointments")
    op.drop_table("appointments")
    op.drop_table("session_pricing")
    op.drop_index("ix_availability_blocks_provider_id", table_name="availability_blocks")
    op.drop_table("availability_blocks")
    op.drop_index("ix_availability_provider_dow", table_name="availability_rules")
    op.drop_table("availability_rules")
