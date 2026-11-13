"""Add remittance payment fields to appointments

Revision ID: o2a3b4c5d6e7f8
Revises: n1f2a3b4c5d6e7
Create Date: 2026-11-12

"""
import sqlalchemy as sa
from alembic import op

revision = "o2a3b4c5d6e7f8"
down_revision = "n1f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            DO $$ BEGIN
                CREATE TYPE payment_status AS ENUM (
                    'not_required', 'pending', 'submitted', 'verified', 'rejected'
                );
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
            """
        )
        payment_status_type = sa.Enum(
            "not_required",
            "pending",
            "submitted",
            "verified",
            "rejected",
            name="payment_status",
            create_type=False,
        )
    else:
        payment_status_type = sa.Enum(
            "not_required",
            "pending",
            "submitted",
            "verified",
            "rejected",
            name="payment_status",
        )

    op.add_column(
        "appointments",
        sa.Column("payment_status", payment_status_type, nullable=False, server_default="verified"),
    )
    op.add_column("appointments", sa.Column("payment_reference", sa.String(length=32), nullable=True))
    op.add_column("appointments", sa.Column("payment_method", sa.String(length=64), nullable=True))
    op.add_column("appointments", sa.Column("payment_receipt_filename", sa.String(length=255), nullable=True))
    op.add_column("appointments", sa.Column("payment_receipt_mime_type", sa.String(length=64), nullable=True))
    op.add_column("appointments", sa.Column("payment_receipt_data", sa.LargeBinary(), nullable=True))
    op.add_column("appointments", sa.Column("payment_submitted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("payment_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("payment_verified_by_id", sa.UUID(), nullable=True))
    op.add_column("appointments", sa.Column("payment_rejection_reason", sa.Text(), nullable=True))
    op.create_index("ix_appointments_payment_reference", "appointments", ["payment_reference"], unique=True)
    op.create_foreign_key(
        "fk_appointments_payment_verified_by_id",
        "appointments",
        "users",
        ["payment_verified_by_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_appointments_payment_verified_by_id", "appointments", type_="foreignkey")
    op.drop_index("ix_appointments_payment_reference", table_name="appointments")
    op.drop_column("appointments", "payment_rejection_reason")
    op.drop_column("appointments", "payment_verified_by_id")
    op.drop_column("appointments", "payment_verified_at")
    op.drop_column("appointments", "payment_submitted_at")
    op.drop_column("appointments", "payment_receipt_data")
    op.drop_column("appointments", "payment_receipt_mime_type")
    op.drop_column("appointments", "payment_receipt_filename")
    op.drop_column("appointments", "payment_method")
    op.drop_column("appointments", "payment_reference")
    op.drop_column("appointments", "payment_status")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS payment_status")
