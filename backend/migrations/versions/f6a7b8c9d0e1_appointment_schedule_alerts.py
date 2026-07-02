"""Appointment schedule change alerts for clients

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-23

"""
import sqlalchemy as sa
from alembic import op

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None

schedule_change_type = sa.Enum("booked", "rescheduled", name="schedule_change_type")


def upgrade():
    schedule_change_type.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "appointments",
        sa.Column("schedule_change_type", schedule_change_type, nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("schedule_change_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("schedule_change_by_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("client_schedule_ack_at", sa.DateTime(timezone=True), nullable=True),
    )
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("appointments", schema=None) as batch_op:
            batch_op.create_foreign_key(
                "fk_appointments_schedule_change_by_id",
                "users",
                ["schedule_change_by_id"],
                ["id"],
                ondelete="SET NULL",
            )
    else:
        op.create_foreign_key(
            "fk_appointments_schedule_change_by_id",
            "appointments",
            "users",
            ["schedule_change_by_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("appointments", schema=None) as batch_op:
            batch_op.drop_constraint("fk_appointments_schedule_change_by_id", type_="foreignkey")
    else:
        op.drop_constraint("fk_appointments_schedule_change_by_id", "appointments", type_="foreignkey")
    op.drop_column("appointments", "client_schedule_ack_at")
    op.drop_column("appointments", "schedule_change_by_id")
    op.drop_column("appointments", "schedule_change_at")
    op.drop_column("appointments", "schedule_change_type")
    schedule_change_type.drop(op.get_bind(), checkfirst=True)
