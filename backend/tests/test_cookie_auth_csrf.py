"""Cookie auth, logout, CSRF, and origin checks. Bearer Authorization remains valid."""

from __future__ import annotations

import uuid


def _register(client, role="client"):
    email = f"cookie-{uuid.uuid4().hex[:10]}@example.com"
    payload = {
        "email": email,
        "password": "password123",
        "first_name": "Cookie",
        "last_name": "Tester",
        "role": role,
        "timezone": "America/Toronto",
    }
    if role == "therapist":
        payload["languages"] = "English"
        payload["specializations"] = "Anxiety"
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.get_json()
    return email, response


def _cookie_value(client, name: str, path: str | None = None) -> str | None:
    cookie = client.get_cookie(name, path=path) if path else client.get_cookie(name)
    if cookie is None and path is None:
        cookie = client.get_cookie(name, path="/api/v1/auth")
    if cookie is None:
        return None
    return cookie.value


def test_register_sets_httponly_cookies_and_bearer_still_works(client):
    email, created = _register(client)
    body = created.get_json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert _cookie_value(client, "access_token_cookie")
    assert _cookie_value(client, "refresh_token_cookie", path="/api/v1/auth")
    assert _cookie_value(client, "csrf_access_token")
    assert _cookie_value(client, "tesfa_signed_in") == "1"

    set_cookie = "; ".join(created.headers.getlist("Set-Cookie"))
    assert "HttpOnly" in set_cookie
    assert "access_token_cookie=" in set_cookie

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["email"] == email

    bearer = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert bearer.status_code == 200


def test_cookie_mutating_request_requires_csrf(client):
    _register(client)
    missing = client.patch("/api/v1/auth/me/preferences", json={"preferred_language": "en"})
    assert missing.status_code in (401, 403, 422)

    csrf = _cookie_value(client, "csrf_access_token")
    assert csrf
    ok = client.patch(
        "/api/v1/auth/me/preferences",
        json={"preferred_language": "en"},
        headers={"X-CSRF-TOKEN": csrf},
    )
    assert ok.status_code == 200, ok.get_json()


def test_bearer_mutating_request_does_not_need_csrf(client):
    _, created = _register(client)
    token = created.get_json()["access_token"]
    client.delete_cookie("access_token_cookie")
    client.delete_cookie("csrf_access_token")
    response = client.patch(
        "/api/v1/auth/me/preferences",
        json={"preferred_language": "en"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200, response.get_json()


def test_logout_clears_auth_cookies(client):
    _register(client)
    csrf = _cookie_value(client, "csrf_access_token")
    logged_out = client.post("/api/v1/auth/logout", headers={"X-CSRF-TOKEN": csrf})
    assert logged_out.status_code == 200
    assert not _cookie_value(client, "access_token_cookie")
    signed_in = _cookie_value(client, "tesfa_signed_in")
    assert not signed_in or signed_in in ("", "0")

    me = client.get("/api/v1/auth/me")
    assert me.status_code in (401, 422)


def test_login_with_cookies_after_logout(client):
    email, _created = _register(client)
    csrf = _cookie_value(client, "csrf_access_token")
    client.post("/api/v1/auth/logout", headers={"X-CSRF-TOKEN": csrf})

    login = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login.status_code == 200, login.get_json()
    assert _cookie_value(client, "access_token_cookie")
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["email"] == email


def test_refresh_sets_new_access_cookie(client):
    _register(client)
    csrf_refresh = _cookie_value(client, "csrf_refresh_token")
    refreshed = client.post("/api/v1/auth/refresh", headers={"X-CSRF-TOKEN": csrf_refresh})
    assert refreshed.status_code == 200, refreshed.get_json()
    assert refreshed.get_json().get("access_token")
    assert _cookie_value(client, "access_token_cookie")
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200


def test_disallowed_origin_rejected_on_state_change_without_bearer(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "x@example.com", "password": "password123"},
        headers={"Origin": "https://evil.example"},
    )
    assert response.status_code == 403
    assert response.get_json()["error"] == "Forbidden"


def test_allowed_preview_origin_can_login(client):
    email, created = _register(client)
    csrf = _cookie_value(client, "csrf_access_token")
    client.post("/api/v1/auth/logout", headers={"X-CSRF-TOKEN": csrf})

    preview = "https://deploy-preview-99--tesfa-counseling.netlify.app"
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
        headers={"Origin": preview},
    )
    assert login.status_code == 200, login.get_json()
    assert login.headers.get("Access-Control-Allow-Origin") == preview
    assert login.headers.get("Access-Control-Allow-Credentials") in ("true", "True")
    assert created.get_json()["access_token"]


def _cookie(client, name: str, path: str = "/"):
    return client.get_cookie(name, path=path)


def test_login_cookie_flags_me_cookie_only_and_no_store(client):
    email, _created = _register(client)
    csrf = _cookie_value(client, "csrf_access_token")
    client.post("/api/v1/auth/logout", headers={"X-CSRF-TOKEN": csrf})

    login = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert login.status_code == 200, login.get_json()
    header = "; ".join(login.headers.getlist("Set-Cookie"))
    assert "Path=/" in header
    assert "HttpOnly" in header
    assert "SameSite=Lax" in header or "SameSite=lax" in header

    access = _cookie(client, "access_token_cookie")
    assert access is not None
    assert access.path == "/"
    assert access.http_only is True or getattr(access, "httponly", False)

    tesfa = _cookie(client, "tesfa_signed_in")
    assert tesfa is not None
    assert tesfa.value == "1"
    assert tesfa.path == "/"

    # Fresh request with only cookies (reload). No Authorization header.
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.get_json()["user"]["email"] == email
    cache = (me.headers.get("Cache-Control") or "").lower()
    assert "no-store" in cache
