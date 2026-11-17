"""Add counselor title/location/payout fields and payment client note

Revision ID: q4c5d6e7f8a9b0
Revises: p3b4c5d6e7f8a9
Create Date: 2026-11-17

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "q4c5d6e7f8a9b0"
down_revision = "p3b4c5d6e7f8a9"
branch_labels = None
depends_on = None


def _add_column_if_missing(table: str, column: sa.Column) -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if table not in inspector.get_table_names():
        return
    existing = {col["name"] for col in inspector.get_columns(table)}
    if column.name in existing:
        return
    op.add_column(table, column)


def upgrade():
    _add_column_if_missing("therapist_profiles", sa.Column("professional_title", sa.String(length=120), nullable=True))
    _add_column_if_missing("therapist_profiles", sa.Column("practice_location", sa.String(length=255), nullable=True))
    _add_column_if_missing("therapist_profiles", sa.Column("payout_account_name", sa.String(length=255), nullable=True))
    _add_column_if_missing("therapist_profiles", sa.Column("payout_details", sa.Text(), nullable=True))
    _add_column_if_missing("therapist_profiles", sa.Column("payout_methods", sa.String(length=255), nullable=True))
    _add_column_if_missing("trainee_profiles", sa.Column("payout_account_name", sa.String(length=255), nullable=True))
    _add_column_if_missing("trainee_profiles", sa.Column("payout_details", sa.Text(), nullable=True))
    _add_column_if_missing("trainee_profiles", sa.Column("payout_methods", sa.String(length=255), nullable=True))
    _add_column_if_missing("appointments", sa.Column("payment_client_note", sa.String(length=500), nullable=True))


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)

    def drop_if_present(table: str, column: str) -> None:
        if table not in inspector.get_table_names():
            return
        existing = {col["name"] for col in inspector.get_columns(table)}
        if column in existing:
            op.drop_column(table, column)

    drop_if_present("appointments", "payment_client_note")
    drop_if_present("trainee_profiles", "payout_methods")
    drop_if_present("trainee_profiles", "payout_details")
    drop_if_present("trainee_profiles", "payout_account_name")
    drop_if_present("therapist_profiles", "payout_methods")
    drop_if_present("therapist_profiles", "payout_details")
    drop_if_present("therapist_profiles", "payout_account_name")
    drop_if_present("therapist_profiles", "practice_location")
    drop_if_present("therapist_profiles", "professional_title")
