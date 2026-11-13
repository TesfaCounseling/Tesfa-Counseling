---
name: outbound-email
description: >-
  Configure and diagnose Tesfa Counseling transactional email (Brevo preferred,
  SendGrid legacy). Use when setting up SMTP/API keys, password-reset mail,
  booking notifications, admin test-email, Render email env vars, or when emails
  fail to send.
disable-model-invocation: false
---

# Tesfa outbound email (Brevo)

## Provider choice

- **Prefer Brevo** (free: 300 emails/day). Use HTTPS API via `BREVO_API_KEY`.
- SendGrid is legacy — only if `SMTP_HOST` contains `sendgrid` and no Brevo key.
- Locally with neither `BREVO_API_KEY` nor `SMTP_HOST`: emails are **stubbed to logs** (success, no inbox).

Code: `backend/app/services/notifications.py` + templates in `email_templates.py`.

## What the human does (Brevo checklist)

1. Create account at [brevo.com](https://www.brevo.com).
2. **Verify sender**
   - Add/authenticate `tesfacounseling.com` (DNS) **or** at least verify `noreply@tesfacounseling.com`.
   - Unverified senders cause API 400s.
3. **Create an API key**
   - Brevo → **SMTP & API** → **API keys** → create key with transactional email permission.
   - Do **not** put an SMTP key in `BREVO_API_KEY` (SMTP keys ≠ API keys).
4. **Set Render env** on `tesfa-counseling-api` (Environment → Add):

| Key | Value |
|-----|--------|
| `BREVO_API_KEY` | Brevo API key (exact name — not `SMTP_PASSWORD`) |
| `SMTP_FROM` | verified sender e.g. `info@tesfacounseling.com` |
| `APP_URL` | `https://www.tesfacounseling.com` |
| `APP_NAME` | `Tesfa Counseling` |

5. **Save** and wait for redeploy/restart. Confirm the variable appears on the service (typo’d names do not count).
6. Clear old SendGrid `SMTP_HOST` if present (optional once Brevo works).
7. **Verify**
   - `GET /api/v1/health` → `brevo_api_key_set: true`, `smtp_configured: true`
   - If `brevo_api_key_set` is false, the key is **not** on the running service — do not trust UI “email sent”
   - Admin → Statistics → **Send test email**
   - Forgot-password should 503 if mail is misconfigured (prod no longer stubs success)

## Agent workflow when mail is broken

1. Hit production health; note `brevo_api_key_set`, `smtp_from_set`, `smtp_configured`.
2. As platform admin, call `POST /api/v1/admin/test-email` with `{"email":"..."}` and read the returned `message` (includes provider error text).
3. Common failures:
   - **401 / invalid key** → wrong key type or revoked key
   - **sender not valid / not verified** → finish Brevo domain/sender auth; match `SMTP_FROM`
   - **credits / limit** → Brevo free = 300/day; wait or upgrade
   - **account exists but no inbox locally** → local stub only; use production or set `BREVO_API_KEY` locally
4. Password reset: `POST /auth/forgot-password` returns **404** if email unknown, **503** if send fails, **200** if sent.

## Optional Brevo SMTP (fallback only)

Only if API cannot be used:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<Brevo SMTP login from SMTP page>
SMTP_PASSWORD=<SMTP key, not API key>
SMTP_FROM=noreply@tesfacounseling.com
```

With `BREVO_API_KEY` unset and host containing `brevo`, code still prefers API using `SMTP_PASSWORD` as the API key — so prefer setting `BREVO_API_KEY` explicitly.

## Do not

- Commit real API keys
- Claim email was sent when health shows no provider configured (local stub is log-only)
- Use SendGrid free tier after credits exhausted without checking Brevo first
