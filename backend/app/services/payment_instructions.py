"""Remittance payment instructions (diaspora → Ethiopia account)."""
from __future__ import annotations

import os
import secrets
import string

DEV_ACCOUNT_DETAILS_PLACEHOLDER = (
    "Add your Ethiopian bank / remittance receive details in Render env PAYMENT_ACCOUNT_DETAILS."
)
DEFAULT_ACCEPTED_METHODS = "Remitly, TapTap Send, Wise, Western Union, CBE"
CLIENT_ACCOUNT_DETAILS_PLACEHOLDER = (
    "Receive-account details are being published. Use your payment reference in the "
    "transfer memo so Tesfa Counseling can match your payment once the account is listed."
)


def generate_payment_reference() -> str:
    alphabet = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"TESFA-{suffix}"


def remittance_instructions() -> dict:
    methods_raw = os.environ.get("PAYMENT_ACCEPTED_METHODS", DEFAULT_ACCEPTED_METHODS)
    methods = [m.strip() for m in methods_raw.split(",") if m.strip()]
    account_name = os.environ.get("PAYMENT_ACCOUNT_NAME", "Tesfa Counseling").strip()
    details = os.environ.get("PAYMENT_ACCOUNT_DETAILS", "").strip()
    if details == DEV_ACCOUNT_DETAILS_PLACEHOLDER:
        details = ""
    notes = os.environ.get(
        "PAYMENT_INSTRUCTIONS_NOTES",
        "Include the payment reference in the transfer memo/message so we can match your payment.",
    ).strip()
    configured = bool(details)
    return {
        "account_name": account_name,
        "account_details": details if configured else CLIENT_ACCOUNT_DETAILS_PLACEHOLDER,
        "account_details_configured": configured,
        "accepted_methods": methods,
        "notes": notes,
        # Local rails (Telebirr, etc.) come later — keep the flag for UI copy.
        "local_methods_coming_soon": True,
    }
