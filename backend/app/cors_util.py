"""CORS origin allow-list: configured origins, production site hosts, Netlify deploy previews."""
from __future__ import annotations

import re
from collections.abc import Iterable
from re import Pattern

# Exact production frontends. Do not use a wildcard for all origins.
DEFAULT_PUBLIC_CORS_ORIGINS = (
    "https://tesfacounseling.com",
    "https://www.tesfacounseling.com",
    "http://tesfacounseling.com",
    "http://www.tesfacounseling.com",
    "https://tesfa-counseling.netlify.app",
)

# https://deploy-preview-<number>--tesfa-counseling.netlify.app
NETLIFY_DEPLOY_PREVIEW_ORIGIN_RE = re.compile(
    r"^https://deploy-preview-\d+--tesfa-counseling\.netlify\.app$"
)

_REGEX_HINT_CHARS = set("*\\]?$^[)(+")


def parse_cors_origin_env(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _looks_like_regex(value: str) -> bool:
    return any(char in value for char in _REGEX_HINT_CHARS)


def flask_cors_origins(configured: Iterable[str]) -> list[str | Pattern[str]]:
    """Values Flask-CORS can match: exact hosts plus compiled preview/LAN patterns."""
    origins: list[str | Pattern[str]] = []
    seen_exact: set[str] = set()
    seen_patterns: list[str] = []

    def add_exact(origin: str) -> None:
        if origin and origin not in seen_exact:
            origins.append(origin)
            seen_exact.add(origin)

    def add_pattern(pattern: str) -> None:
        if pattern in seen_patterns:
            return
        try:
            compiled = re.compile(f"^{pattern}$") if not pattern.startswith("^") else re.compile(pattern)
        except re.error:
            add_exact(pattern)
            return
        origins.append(compiled)
        seen_patterns.append(pattern)

    for origin in configured:
        if _looks_like_regex(origin):
            add_pattern(origin)
        else:
            add_exact(origin)

    for origin in DEFAULT_PUBLIC_CORS_ORIGINS:
        add_exact(origin)

    origins.append(NETLIFY_DEPLOY_PREVIEW_ORIGIN_RE)
    return origins


def is_allowed_cors_origin(origin: str | None, configured: Iterable[str] | None = None) -> bool:
    if not origin:
        return False
    for allowed in flask_cors_origins(configured or ()):
        if isinstance(allowed, Pattern):
            if allowed.fullmatch(origin):
                return True
        elif origin == allowed:
            return True
    return False
