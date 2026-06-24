"""SQLite tuning and retry helpers for dev databases (especially on synced drives)."""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError


def sqlite_engine_options() -> dict:
  import os

  timeout = int(os.environ.get("DATABASE_CONNECT_TIMEOUT", "30"))
  return {
    "pool_pre_ping": True,
    "connect_args": {
      "timeout": timeout,
      "check_same_thread": False,
    },
  }


def configure_sqlite_engine(app) -> None:
  uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
  if not uri.startswith("sqlite"):
    return

  options = sqlite_engine_options()
  app.config["SQLALCHEMY_ENGINE_OPTIONS"] = options

  @event.listens_for(Engine, "connect")
  def _set_sqlite_pragmas(dbapi_conn, connection_record) -> None:
    if isinstance(dbapi_conn, sqlite3.Connection):
      cursor = dbapi_conn.cursor()
      cursor.execute("PRAGMA journal_mode=WAL")
      cursor.execute("PRAGMA busy_timeout=30000")
      cursor.execute("PRAGMA synchronous=NORMAL")
      cursor.close()


def run_with_db_retry(fn, max_retries: int = 5):
  for attempt in range(max_retries):
    try:
      return fn()
    except OperationalError as exc:
      if "locked" not in str(exc).lower() or attempt >= max_retries - 1:
        raise
      time.sleep(0.25 * (2**attempt))


def ensure_local_sqlite_copy(source: Path, target: Path) -> Path:
  """Copy the dev database to a local path if the target does not exist yet."""
  target.parent.mkdir(parents=True, exist_ok=True)
  if target.exists() and target.stat().st_size > 0:
    return target
  if not source.exists() or source.stat().st_size == 0:
    return target
  target.write_bytes(source.read_bytes())
  for suffix in ("-wal", "-shm"):
    sidecar = Path(str(source) + suffix)
    if sidecar.exists():
      Path(str(target) + suffix).write_bytes(sidecar.read_bytes())
  return target
