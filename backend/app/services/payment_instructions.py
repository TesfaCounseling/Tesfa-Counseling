"""Remittance payment instructions (diaspora → Ethiopia account)."""
from __future__ import annotations

import os
import secrets
import string


def generate_payment_reference() -> str:
    alphabet = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"TESFA-{suffix}"


def remittance_instructions() -> dict:
    methods_raw = os.environ.get(
        "PAYMENT_ACCEPTED_METHODS",
        "Remitly, TapTap Send, Wise, Western Union, CBE",
    )
    methods = [m.strip() for m in methods_raw.split(",") if m.strip()]
    account_name = os.environ.get("PAYMENT_ACCOUNT_NAME", "Tesfa Counseling").strip()
    details = os.environ.get(
        "PAYMENT_ACCOUNT_DETAILS",
        "Add your Ethiopian bank / remittance receive details in Render env PAYMENT_ACCOUNT_DETAILS.",
    ).strip()
    notes = os.environ.get(
        "PAYMENT_INSTRUCTIONS_NOTES",
        "Include the payment reference in the transfer memo/message so we can match your payment.",
    ).strip()
    return {
        "account_name": account_name,
        "account_details": details,
        "accepted_methods": methods,
        "notes": notes,
        # Local rails (Telebirr, etc.) come later — keep the flag for UI copy.
        "local_methods_coming_soon": True,
    }
