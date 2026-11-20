"""Origin checks for cookie-authenticated, state-changing requests."""

from __future__ import annotations

from flask import Flask, jsonify, request

from app.cors_util import is_allowed_cors_origin

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


def _has_bearer_authorization() -> bool:
    value = request.headers.get("Authorization") or ""
    return value.lower().startswith("bearer ")


def register_origin_csrf(app: Flask) -> None:
    @app.before_request
    def _reject_disallowed_origins():
        if request.method in _SAFE_METHODS:
            return None
        if _has_bearer_authorization():
            return None
        origin = request.headers.get("Origin")
        if not origin:
            # Non-browser clients (pytest, curl) and same-site navigations.
            return None
        if is_allowed_cors_origin(origin, app.config.get("CORS_ORIGINS") or []):
            return None
        return jsonify({"error": "Forbidden", "message": "Invalid request origin"}), 403
