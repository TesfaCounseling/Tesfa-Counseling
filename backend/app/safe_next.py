"""Same-site relative ?next= paths for post-login redirects."""


def is_safe_next_path(value: str | None) -> bool:
    """True when value is a same-site relative path: one leading '/', not '//' or a URL."""
    if not isinstance(value, str) or not value:
        return False
    if any(ch in value for ch in ("\\", "\n", "\r", "\t", "\0")):
        return False
    if not value.startswith("/") or value.startswith("//"):
        return False
    if "://" in value:
        return False
    return True
