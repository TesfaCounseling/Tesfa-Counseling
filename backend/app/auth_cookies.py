"""HttpOnly JWT cookies plus a non-secret signed-in flag for UI."""

from __future__ import annotations

from flask import Response, current_app
from flask_jwt_extended import set_access_cookies, set_refresh_cookies, unset_jwt_cookies

SIGNED_IN_COOKIE = "tesfa_signed_in"


def _cookie_secure() -> bool:
    return bool(current_app.config.get("JWT_COOKIE_SECURE"))


def _cookie_samesite() -> str:
    return str(current_app.config.get("JWT_COOKIE_SAMESITE") or "Lax")


def attach_auth_cookies(response: Response, access_token: str, refresh_token: str | None = None) -> Response:
    set_access_cookies(response, access_token)
    if refresh_token:
        set_refresh_cookies(response, refresh_token)
    max_age = int(current_app.config["JWT_REFRESH_TOKEN_EXPIRES"].total_seconds())
    response.set_cookie(
        SIGNED_IN_COOKIE,
        "1",
        max_age=max_age,
        secure=_cookie_secure(),
        httponly=False,
        samesite=_cookie_samesite(),
        path="/",
    )
    return response


def clear_auth_cookies(response: Response) -> Response:
    unset_jwt_cookies(response)
    response.set_cookie(
        SIGNED_IN_COOKIE,
        "",
        expires=0,
        max_age=0,
        secure=_cookie_secure(),
        httponly=False,
        samesite=_cookie_samesite(),
        path="/",
    )
    return response
