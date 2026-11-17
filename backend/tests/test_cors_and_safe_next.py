from app.config import Config
from app.cors_util import is_allowed_cors_origin
from app.safe_next import is_safe_next_path

PRODUCTION = "https://tesfacounseling.com"
PREVIEW = "https://deploy-preview-42--tesfa-counseling.netlify.app"


def test_is_safe_next_path_allows_same_site_relative():
    assert is_safe_next_path("/dashboard") is True
    assert is_safe_next_path("/counselors/abc/book") is True
    assert is_safe_next_path("/appointments/1/pay?x=1") is True


def test_is_safe_next_path_rejects_open_redirects():
    assert is_safe_next_path(None) is False
    assert is_safe_next_path("") is False
    assert is_safe_next_path("dashboard") is False
    assert is_safe_next_path("//evil.example") is False
    assert is_safe_next_path("https://evil.example/phish") is False
    assert is_safe_next_path("http://evil.example") is False
    assert is_safe_next_path("/\\evil.example") is False
    assert is_safe_next_path("/https://evil.example") is False


def test_cors_helper_allows_production_and_preview_not_wildcard():
    configured = Config.CORS_ORIGINS
    assert is_allowed_cors_origin(PRODUCTION, configured)
    assert is_allowed_cors_origin("https://www.tesfacounseling.com", configured)
    assert is_allowed_cors_origin("https://tesfa-counseling.netlify.app", configured)
    assert is_allowed_cors_origin(PREVIEW, configured)
    assert is_allowed_cors_origin("http://localhost:3000", configured)
    assert is_allowed_cors_origin("*", configured) is False
    assert is_allowed_cors_origin("https://evil.example", configured) is False
    assert is_allowed_cors_origin("https://deploy-preview-42--other-site.netlify.app", configured) is False
    assert is_allowed_cors_origin("https://deploy-preview-abc--tesfa-counseling.netlify.app", configured) is False
    assert is_allowed_cors_origin("http://deploy-preview-42--tesfa-counseling.netlify.app", configured) is False


def _acao(response):
    return response.headers.get("Access-Control-Allow-Origin")


def test_cors_headers_allow_preview_and_production(client):
    for origin in (PRODUCTION, PREVIEW, "http://localhost:3000"):
        response = client.get("/api/v1/health", headers={"Origin": origin})
        assert response.status_code == 200
        assert _acao(response) == origin


def test_cors_headers_deny_other_origins(client):
    for origin in (
        "https://evil.example",
        "https://deploy-preview-1--not-tesfa.netlify.app",
        "https://tesfa-counseling.netlify.app.evil.example",
    ):
        response = client.get("/api/v1/health", headers={"Origin": origin})
        assert response.status_code == 200
        assert _acao(response) != origin
