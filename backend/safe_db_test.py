"""
Safe database connectivity test template.

Usage:
  cd backend
  python safe_db_test.py

Requires DATABASE_URL in environment or .env file.
"""
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv()


def get_connection():
    import psycopg2

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set")
        sys.exit(1)

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    connect_timeout = int(os.environ.get("DATABASE_CONNECT_TIMEOUT", "10"))
    statement_timeout_ms = int(os.environ.get("DATABASE_STATEMENT_TIMEOUT_MS", "30000"))

    conn = None
    cursor = None
    try:
        conn = psycopg2.connect(
            database_url,
            connect_timeout=connect_timeout,
            options=f"-c statement_timeout={statement_timeout_ms}",
        )
        cursor = conn.cursor()
        return conn, cursor
    except Exception:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()
        raise


def run_safe_query(cursor, query: str, params=None, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            cursor.execute(query, params)
            return cursor.fetchall()
        except Exception as exc:
            if "lock" in str(exc).lower() and attempt < max_retries - 1:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise


def main():
    conn = None
    cursor = None
    try:
        conn, cursor = get_connection()
        rows = run_safe_query(cursor, "SELECT version();")
        print("Database connection OK")
        print(f"PostgreSQL: {rows[0][0]}")
        rows = run_safe_query(cursor, "SELECT 1 AS ok;")
        print(f"Health check: {rows[0][0]}")
    except Exception as exc:
        print(f"Database connection FAILED: {exc}")
        sys.exit(1)
    finally:
        if cursor is not None:
            cursor.close()
        if conn is not None:
            conn.close()
        print("Connection closed.")


if __name__ == "__main__":
    main()
