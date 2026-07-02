"""Apply pending SQLite migrations when a prior upgrade stopped mid-revision."""
from __future__ import annotations

import sqlite3
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(override=True)

DB_PATH = Path(__file__).resolve().parents[2] / "tesfa_counseling.db"


def main() -> None:
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA foreign_keys=ON")
    cur = conn.cursor()

    cur.execute("SELECT version_num FROM alembic_version")
    version = cur.fetchone()[0]
    print("current version:", version)

    cur.execute("PRAGMA table_info(appointments)")
    appt_cols = {row[1] for row in cur.fetchall()}
    schedule_cols = {
        "schedule_change_type",
        "schedule_change_at",
        "schedule_change_by_id",
        "client_schedule_ack_at",
    }
    if schedule_cols.issubset(appt_cols) and version == "e5f6a7b8c9d0":
        print("schedule alert columns present — stamping f6a7b8c9d0e1")
        cur.execute("UPDATE alembic_version SET version_num = 'f6a7b8c9d0e1'")
        conn.commit()
        version = "f6a7b8c9d0e1"

    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row[0] for row in cur.fetchall()}
    print("tables:", sorted(tables))
    print("final version:", version)
    conn.close()


if __name__ == "__main__":
    main()
