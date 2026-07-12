# Tesfa Counseling — Agent Context

> Living handoff doc. Update this file as work progresses so the next agent can continue without re-discovering decisions.
>
> **Last updated:** 2026-07-12 — client Schedule a session page; homepage/copy polish; Amharic counselor wording

---

## Product summary

**Brand:** Tesfa Counseling (`NEXT_PUBLIC_APP_NAME`; Geʽez logo — `frontend/src/lib/brand.ts`)

**Vision:** International telehealth platform — counselors and supervised trainees worldwide, clients in any country/language. Ethiopia is a **pilot market only**, not the brand identity.

**Style reference:** User liked the blue palette from [Worku Counseling](https://workucounseling.com/) — calm professional blue, not gold/green Ethiopian flag theme.

**Stack:**

| Layer | Tech | Deploy target |
|-------|------|---------------|
| Frontend | Next.js 15, TypeScript, Tailwind | Netlify — **`https://www.tesfacounseling.com`** (primary) + `https://tesfa-counseling.netlify.app` |
| API | Flask, JWT, SQLAlchemy, Alembic | Render — `https://tesfa-counseling.onrender.com` |
| DB | SQLite (dev) / Postgres (prod) | Netlify Database → `DATABASE_URL` on Render |
| Video | Daily.co | `DAILY_API_KEY` on Render (required for join URLs) |
| Email | SendGrid SMTP | `SMTP_*` on Render; domain `tesfacounseling.com` authenticated in SendGrid |
| Notifications | HTML email + Telegram stub + reminders CLI | Email live in prod when SMTP configured |

**Workspace (canonical):** `C:\dev\tesfa-counseling` — full project on local disk. Open this folder in Cursor for development and Git.

**SQLite (dev):** `C:\dev\tesfa-counseling\tesfa_counseling.db` at project root (migrated from legacy `C:\dev\ethio-counseling`). Uses `backend/app/db_utils.py` (WAL, busy timeout, retry).

**Start dev servers** (from repo root):

```powershell
.\start-backend.ps1    # Flask → http://127.0.0.1:5050
.\start-frontend.ps1   # Next.js → http://localhost:3000
```

**Google Drive:** No longer used for active development. An older copy may remain at `g:\My Drive\Ethio Counceling` for backup only — do not edit there.

---

## Architecture (two servers locally)

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | `http://localhost:3000` | Website UI (Next.js) |
| API | `http://127.0.0.1:5050/api/v1` | Backend (Flask) |

Users only browse **:3000**. The frontend calls **:5050** via `NEXT_PUBLIC_API_URL`.

---

## What is DONE

### Phase 0–1 — Foundation
- [x] Flask app, blueprints, JWT auth
- [x] User roles: client, therapist, trainee, org_admin, platform_admin, supervisor
- [x] Register flows: `/register/client`, `/register/counselor`, `/register/trainee`
- [x] Login (supports `?next=/admin`), refresh, `/me` (includes `account_type`)
- [x] Admin approval API + **full admin dashboard UI**
- [x] Models: users, orgs, profiles, consent, audit
- [x] Seed scripts: `seed_admin.py`, `seed_demo_counselor.py`
- [x] **Industry-standard org model** (see Organizations section below)

### Phase 2 — Scheduling & booking
- [x] `AvailabilityRule`, `AvailabilityBlock`, `SessionPricing`, `Appointment` models + migrations
- [x] Scheduling service (`backend/app/services/scheduling.py`) — slot generation, conflict checks, reschedule exclusion
- [x] APIs: availability rules/blocks/pricing, appointments CRUD, provider slots
- [x] **Reschedule** — `POST /appointments/:id/reschedule`
- [x] **Counselor search filters** — language + specialty on `/counselors`
- [x] **Provider profile edit** — `/provider/profile`, `GET/PATCH /providers/me`
- [x] **Languages required** at registration for counselors/trainees
- [x] Email notifications on book/cancel/reschedule — **HTML branded templates** + plain-text fallback (`email_templates.py`, `notifications.py`)
- [x] SendGrid SMTP in production (`smtp.sendgrid.net`, user `apikey`, API key as password)
- [x] Telegram notification stub on book/cancel
- [x] Reminders CLI: `flask send-reminders`
- [x] Session pricing UI in **dollars** (stored as cents in DB); shows current rates

### Phase 3 — Video (production-ready)
- [x] `video_room_name`, `video_room_url` on `Appointment` model
- [x] Daily.co room creation on book/reschedule + **backfill** on `GET /appointments?upcoming=true` (`video.py`)
- [x] Dashboard **Join video session** button — only in join window (**15 min before → 30 min after** session)
- [x] API hides direct Daily URL until join window; exposes `video_room_ready` + `can_join_video`
- [x] Short join route: `GET /appointments/:id/video-join` — redirects to Daily when open; friendly HTML page if too early/closed
- [x] Booking/reschedule emails say video opens 15 min before (no early clickable Daily link)
- [x] Admin diagnostics: `GET /admin/daily-check`, `POST /admin/daily-test-room`, `POST /admin/backfill-video-rooms` (+ buttons in Statistics panel)
- [x] Health check flags: `daily_api_key_set`, `smtp_configured`
- [x] `backend/scripts/test_daily.py` — run on Render shell to verify Daily + backfill
- [ ] Embedded waiting room / in-app video UI — not done
- [x] Requires `DAILY_API_KEY` on Render — without it, booking works but no join URL

### Phase 4 — Clinical notes & supervision (partial)
- [x] `ClinicalNote` model (SOAP: subjective, objective, assessment, plan)
- [x] Status flow: draft → submitted (trainee) → cosigned (supervisor) / finalized (licensed counselor)
- [x] APIs: `backend/app/routes/clinical_notes.py` — provider notes, supervision queue, cosign
- [x] Provider UI: `/provider/notes`, `/provider/notes/[appointmentId]`
- [x] Supervision UI: `/supervision` — cosign queue
- [x] **Dual-role dashboard tabs** — Counseling | Supervision for counselor+supervisor (`DashboardTabs.tsx`, `SupervisionDashboard.tsx`)
- [x] Trainee notes require supervisor cosign; licensed counselors finalize directly
- [x] **Supervision is supervisor-role only** — `platform_admin` does NOT inherit supervisor/cosign (see Roles section)

### Trainee intake
- [x] `TraineeIntake` model + `backend/app/routes/intake.py`
- [x] Trainee-only intake form before booking (`/counselors/[id]/intake`)
- [x] Trainee view: `/provider/intakes`
- [x] **Supervisor view:** `/supervision/intakes` — `GET /intake/supervision` (not the cosign queue)
- [x] Book validation requires completed intake for trainees
- [x] `session_mode` on appointments (`video` | `audio_only`) — migration `d4e5f6a7b8c9`
- [ ] Optional intake for licensed counselors — **not built** (pending client decision)

### E2E UX fixes (2026-06-17)
- [x] **Client dashboard** — Find a counselor + My schedule cards; upcoming sessions; feedback
- [x] **Admin approvals** — expandable **View application** (org, languages, bio, license, program, etc.) in `AdminApprovals.tsx`
- [x] **Trainee dashboard** — shows assigned **supervisor** name/email via `getMyProviderProfile()` (`providers.py`)
- [x] **Supervision dashboard** — link to **Client intake forms**; cosign queue “All caught up” = no pending **notes**, not intakes

### Timezone & scheduling display
- [x] `backend/app/datetime_utils.py` — `as_utc()`, `to_iso_utc()`, `format_in_timezone()`
- [x] API returns appointment times as UTC ISO with `Z`; adds `client_local_display` / `provider_local_display`
- [x] `frontend/src/lib/format.ts` — `parseUtcIso`, `formatAppointmentWhen`, `appointmentTimezoneLabel`
- [x] `SlotPicker.tsx` groups slots by **client local date** (not UTC date)
- [x] Scheduling iterates days in **counselor timezone** (`scheduling.py`)
- [x] Provider schedule defaults timezone to browser (`getBrowserTimezone()`)

### Database reliability (dev)
- [x] `backend/app/db_utils.py` — WAL mode, busy timeout, retry on lock
- [x] `config.py` — SQLite at **project root** `tesfa_counseling.db` (falls back to legacy `C:\dev\ethio-counseling\ethio_counseling.db` if present)
- [x] Login retry + clearer 503 on DB lock (`auth.py`)

### Project layout & rebrand (2026-06-17)
- [x] **Canonical workspace:** `C:\dev\tesfa-counseling` — full repo on local disk (no Google Drive sync)
- [x] `start-backend.ps1` + simplified `start-frontend.ps1` (run from repo root)
- [x] Product name **Tesfa Counseling** everywhere (was Counsel Connect / ethio-counseling in configs)
- [x] Render service: `tesfa-counseling-api` · npm package: `tesfa-counseling-frontend`
- [x] New seed default admin: `admin@tesfacounseling.local` (migrated DBs may still use `admin@counselconnect.local`)
- [x] **Git** — repo `TesfaCounseling/Tesfa-Counseling`, branch `main`, auto-deploy Render + Netlify on push

### Admin & roles (solo-operator config)
- [x] **Grant/revoke staff roles:** `POST/DELETE /api/v1/admin/users/<id>/roles`
- [x] Grantable roles: **`supervisor`**, **`platform_admin`** only (`org_admin` removed from UI — reserved for future multi-clinic)
- [x] **Supervisor & platform_admin** auto-assigned on **Platform** org (no org picker); `_resolve_staff_role_org()` in `admin.py`
- [x] `AdminUsers.tsx` — search users, grant/revoke roles, enable/disable
- [x] **Solo operator model:** platform owner approves counselors/trainees; full admin = `platform_admin` only
- [x] `canReviewCounselors` → `platform_admin` only; `canReviewTrainees` → `platform_admin` + `supervisor`
- [x] **`/admin` redirects to `/dashboard`** — admin panels embedded in dashboard (no separate click-through)
- [x] `AdminDashboardPanel.tsx` — reusable admin tabs (Overview, Approvals, Statistics, Providers, Users, Activity, Organizations)
- [x] **Platform admin lands on `/dashboard`** with admin tabs visible immediately after login
- [x] `AccountTabs.tsx` — top-level **Platform | Counseling | Supervision | Approvals** when user has multiple hats
- [x] Removed `AdminDashboardLink.tsx` (obsolete)

### Homepage UX (2026-06-23)
- [x] `WhoWeServe.tsx` — audience cards (Individuals, Couples, Families, Young adults) in `card-vibrant`
- [x] Section heading: **Who we serve** only (no extra subtitle paragraph)
- [x] Mission card heading: **Our mission**; removed redundant “Through secure online sessions…” sentence from `MISSION` in `brand.ts`
- [x] Hero CTAs simplified: one **Find a counselor** button + text link for counselors/trainees to register (header **Get started** handles signup)
- [x] `globals.css` — `.audience-tile` styles; **never use `@apply group`** in CSS (Tailwind error — put `group` on JSX element)

### Admin dashboard (embedded in `/dashboard`)
Role-based tabs via `AdminDashboardPanel`:
- **Overview** — stats, pending count, quick link to approvals
- **Approvals** — counselor/trainee approve/reject; **View application** expands full registration details
- **Providers** — directory, filter by status (`platform_admin` only)
- **Users** — search, enable/disable, grant/revoke supervisor/platform_admin (`platform_admin` only)
- **Activity** — audit log (`platform_admin` only)
- **Organizations** — view/edit practice orgs (`platform_admin` only)
- **Feedback** — client complaints (`platform_admin` + `supervisor`)
- **Testing** — UAT page feedback inbox (`platform_admin` only; open-count badge)
- [x] **Statistics** — platform stats (`platform_admin` only); **Video (Daily.co)** + **Send test email** diagnostics

**Access:**
| Role | Dashboard experience |
|------|---------------------|
| `platform_admin` | Full admin tabs on `/dashboard` (default after login) |
| `supervisor` | Approvals tab (trainees) + Supervision tab; `/admin` → `/dashboard` |
| `therapist` / `trainee` | Counseling provider tools on dashboard |
| `client` | Find counselor + **My schedule** → `/schedule`; upcoming sessions; feedback |

**Admin login:** `admin@tesfacounseling.local` / `admin-change-me` (new seeds). **Migrated local DB** may still have `admin@counselconnect.local` — use that until re-seeded.

**Grant supervisor:** Admin → Users → search email → Grant role → Supervisor (Platform org is automatic).

### UI / branding
- [x] Env brand: Tesfa Counseling via `NEXT_PUBLIC_APP_NAME`
- [x] Homepage copy: **“Tesfa” means hope** — Geʽez explanation kept; removed “in Amharic” only
- [x] Default timezone **UTC** (display uses client/provider local where implemented)
- [x] Blue theme in `frontend/src/app/globals.css` (Worku-inspired, user approved)
- [x] Shared components: `PageHero`, `ProviderCard`, `SlotPicker`, `CounselorList`, `AuthShell`
- [x] `SiteHeader` — shows Dashboard + Log out when logged in (even on admin/dashboard pages)
- [x] Brand name from env: `frontend/src/lib/brand.ts` + `NEXT_PUBLIC_APP_NAME`
- [x] Unified `card-vibrant` + `max-w-5xl` layout

### Production deploy (live — 2026-07)
- [x] `render.yaml` — Flask API, `flask db upgrade` on deploy, health check, `DAILY_API_KEY`, `APP_URL` (sync: false)
- [x] `netlify.toml` — Next.js plugin (no manual publish path)
- [x] `DEPLOY.md` — step-by-step Netlify + Render guide
- [x] Postgres URL fix: `postgres://` → `postgresql://` in `config.py`
- [x] `frontend/src/lib/apiBase.ts` — do not rewrite API URL to Netlify hostname on production
- [x] **Custom domain** `www.tesfacounseling.com` on Netlify — add all origins to Render `CORS_ORIGINS` (include `http://` variants while SSL provisioning)
- [x] **SendGrid** — domain auth on `tesfacounseling.com` (GoDaddy DNS); use API key for SMTP (not account password)
- [x] Migrations run on Render deploy; manual shell used once for enum fixes (`g7`, `h8` migrations)

### i18n (Amharic / English)
- [x] `frontend/src/lib/i18n.ts` — language toggle, `LANGUAGE_STORAGE_KEY`
- [x] Homepage, dashboard, booking, schedule alerts translated

### Client feedback & schedule alerts
- [x] `ClientFeedback` model + migration
- [x] Feedback API + client form on dashboard
- [x] Admin feedback panel for platform owner
- [x] Schedule change alerts (client + provider) after reschedule — migration `h8c9d0e1f2a3`

### Client scheduling (`/schedule`)
- [x] Client dashboard **My schedule** card → `/schedule` (booking-first, not a past-sessions dump)
- [x] **Returning clients** — counselors inferred from appointment history (no formal assigned-counselor field); **Schedule a session** → `/counselors/:id/book`
- [x] **New clients** — primary CTA is Find a counselor
- [x] Upcoming sessions (join / reschedule / cancel); past sessions behind a toggle
- [x] Shared `ClientSessionsList.tsx`; SQLite bootstrap normalizes `schedule_change_type` `BOOKED`→`booked` on startup

### Testing-phase feedback (UAT — separate from client feedback)
- [x] `TestingFeedback` model + migrations (`i9` → `m0`; guest `submitter_name`, nullable `user_id`)
- [x] **Give Us Your Feedback** floating widget on all pages (`BetaFeedbackWidget.tsx`) — gated by `NEXT_PUBLIC_BETA_FEEDBACK=true`
- [x] **Guests** can submit (name required); **logged-in** users submit without extra fields
- [x] Captures **`page_path`**, **`page_title`**, **`page_context`** (human-readable tab/section, e.g. `Dashboard › Counseling › Counselor home`)
- [x] `FeedbackPageProvider` + `useFeedbackPageLocation` — dashboard tabs, admin sections, provider pages wired
- [x] DOM fallback reads active tab buttons (`data-feedback-tabs`) when context not set
- [x] API: `POST /api/v1/testing-feedback` (optional JWT), `GET/PATCH /admin/testing-feedback` (platform_admin only)
- [x] Admin **Testing** tab (`AdminTestingFeedback.tsx`) — filter by page, mark done/reopen; shows `page_context` as primary label
- [x] Email/Telegram backup to platform admins on submit
- [x] **`BETA_FEEDBACK_ENABLED`** — on by default when unset; set `false` to disable after UAT
- [x] Postgres bootstrap on API startup (`db_bootstrap.py`) if `testing_feedback` table/columns missing
- [x] Health flags: `beta_feedback_enabled`, `testing_feedback_db_ready`
- [x] `render.yaml`: `BETA_FEEDBACK_ENABLED=true`; `startCommand` runs `flask db upgrade` before gunicorn
- [x] `netlify.toml`: `NEXT_PUBLIC_BETA_FEEDBACK=true`

**Do not confuse with client feedback:**

| | **Client feedback** | **Testing feedback (UAT)** |
|---|---|---|
| Purpose | Ongoing client complaints | Testing-phase change requests |
| UI | Dashboard form (`ClientFeedbackForm.tsx`) | Floating **Give Us Your Feedback** widget (top-right) |
| Admin tab | Feedback (`platform_admin` + `supervisor`) | Testing (`platform_admin` only) |
| Table | `client_feedback` | `testing_feedback` |

**After UAT:** set `BETA_FEEDBACK_ENABLED=false` on Render and `NEXT_PUBLIC_BETA_FEEDBACK=false` on Netlify, then redeploy/restart.
- [x] Provider photo upload + `GET /providers/me/photo` for authenticated preview
- [x] Counselor listing fixes

### Other UX (2026-06 – 2026-07)
- [x] Login redirect with `?next=`
- [x] Mobile header polish
- [x] Admin statistics: removed pro bono / trainee rate from stats API and display

---

## What is NOT done yet

| Area | Feature | Status |
|------|---------|--------|
| 5 | Stripe payments (actual card charge) | Not started — prices recorded on appointment only |
| 4 | Secure messaging | Not started |
| 3 | Full video UX (embedded room, waiting room) | Partial |
| 2 | Production Telegram webhook | Stub only |
| 2 | Scheduled email reminders | CLI exists; no email cron (1h/24h Telegram only) |
| — | Custom domain SSL fully forced HTTPS | May still be provisioning on Netlify |
| — | **org_admin** (multi-clinic delegated admin) | Role in DB; removed from grant UI until client wants it |
| — | Multi-currency pricing | USD only; counselor sets rate |
| — | Sliding scale tiers at booking | Type exists; no tier UI |
| — | Client country → currency display | Discussed; not built |
| — | i18n UI | **Amharic + English** on key flows; not full app coverage |
| — | `GET /therapists/:id` | Book page still loads full list |
| — | Optional intake for licensed counselors | Pending client decision |
| — | Provider profile edit for existing counselors with blank languages | Manual/admin or re-save via UI |
| — | Turn off UAT widget after testing | Set `BETA_FEEDBACK_ENABLED=false` + `NEXT_PUBLIC_BETA_FEEDBACK=false` |

## Organizations (industry model — important)

**Do not give clients their own org at registration.**

| Role | Org behavior |
|------|----------------|
| **Counselor / trainee** | Gets own **practice org** at registration (from clinic name or their name) |
| **Client** | **No org at signup** — only `User` + `ClientProfile` |
| **On first booking** | Client linked to **counselor's practice org** via `ensure_client_org_membership()` |
| **Multiple counselors** | Client can belong to **multiple practice orgs** (one per clinic booked) |
| **Platform admin** | Internal org with slug `platform` |

Legacy cleanup script (safe to re-run after deploy):
```bash
cd backend
python migrate_client_org_links.py
```

Removed: shared `counsel-connect` client bucket org (was a pilot shortcut).

---

## Roles (current solo-operator model)

| Role | Where assigned | Purpose |
|------|----------------|---------|
| `platform_admin` | Platform org | Owner: full admin tabs on dashboard, approve counselors, grant roles |
| `supervisor` | Platform org (auto) | Clinical oversight: cosign trainee notes, approve trainees |
| `therapist` | Practice org | Licensed counselor |
| `trainee` | Practice org | Supervised counselor-in-training |
| `client` | Practice org (on booking) | Books sessions |
| `org_admin` | Specific org | **Not used in UI** — reserved for future multi-clinic delegation |

**One role per org per user** (`organization_members` unique constraint) — why supervisor/platform roles live on **Platform** org, not the counselor's practice org.

**Frontend role helpers:** `frontend/src/lib/roles.ts`
- `isSupervisor()` — **`supervisor` only** (not platform_admin)
- `canManagePlatform()` — platform_admin only
- `hasAdminAccess()` — platform_admin or supervisor (limited admin tabs for supervisor)

**Backend:** `_is_supervisor_user()` / `_can_supervise()` in `clinical_notes.py` — no platform_admin bypass.

---

## Pricing model (current + planned)

**Today:**
- Counselor sets price per session length (50 / 90 min) on **Manage schedule**
- Stored as `amount_cents` in DB; UI shows **dollars** (e.g. $50 → 5000 cents)
- Pricing types: standard, pro_bono, sliding_scale, trainee_rate
- On book: price copied to `Appointment.amount_cents` — **no Stripe charge yet**
- Client sees price on dashboard after booking

**Agreed direction (not built):**
- **Counselor origin** → base rate + currency (counselor sets fee)
- **Client origin** → currency display, sliding scale / pro bono eligibility — not auto-different prices without counselor consent

---

## Design system

**CSS:** `frontend/src/app/globals.css` · **Tailwind:** `frontend/tailwind.config.ts`

Note: Tailwind classes use prefix `ethio-*` (legacy) — maps to **blue** brand, not Ethiopian flag colors.

| Token | Value |
|-------|-------|
| Page bg | `#E8EFF5` |
| Primary blue | `#046BD2` |
| Primary dark | `#0354A8` |
| Card surface | `#F5F9FC` |

**Key components:**
- `frontend/src/components/SiteHeader.tsx` — auth-aware header, `clearAuthSession()`
- `frontend/src/components/BrandLogo.tsx` — uses `NEXT_PUBLIC_APP_NAME`
- `frontend/src/components/PageHero.tsx`
- `frontend/src/components/ProviderCard.tsx`
- `frontend/src/components/SlotPicker.tsx`
- `frontend/src/components/CounselorList.tsx` — language + specialty filters
- `frontend/src/components/admin/*` — admin dashboard panels (`AdminDashboardPanel.tsx` is main embed)
- `frontend/src/components/WhoWeServe.tsx` — homepage audience cards
- `frontend/src/components/dashboard/*` — `CounselorDashboard`, `SupervisionDashboard`, `DashboardTabs`, `AccountTabs`
- `frontend/src/components/BetaFeedbackWidget.tsx` — **Give Us Your Feedback** (testing UAT)
- `frontend/src/lib/feedbackPageContext.tsx` — page/tab context for feedback widget
- `frontend/src/lib/pageLocation.ts` — pathname labels + DOM tab capture

---

## Frontend routes

| Route | Type | Notes |
|-------|------|--------|
| `/` | Server | Home, mission card, Who we serve, feature cards |
| `/login` | Client | Default redirect `?next=/dashboard` |
| `/register`, `/register/client`, `/counselor`, `/trainee` | Client | Languages required for providers |
| `/counselors` | Server | Provider list + filters |
| `/counselors/[id]/book` | Client | Book or `?reschedule=:id` |
| `/counselors/[id]/intake` | Client | Trainee intake before booking |
| `/dashboard` | Client | **Main hub after login** — role-based: admin tabs, counseling, supervision, client sessions |
| `/admin` | Client | Redirects to `/dashboard` if admin access |
| `/supervision` | Client | Cosign queue — trainee **session notes** only |
| `/supervision/intakes` | Client | Supervisor view of client intake forms for assigned trainees |
| `/provider/schedule` | Client | Weekly hours + pricing (USD) |
| `/provider/profile` | Client | Edit bio, languages, specialties |
| `/provider/notes` | Client | Clinical notes list |
| `/provider/notes/[appointmentId]` | Client | SOAP note editor |
| `/provider/intakes` | Client | View trainee intakes |

**API client:** `frontend/src/lib/api.ts` · **Roles:** `frontend/src/lib/roles.ts` · **Filters:** `frontend/src/lib/providerUtils.ts`

**Env (`frontend/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:5050/api/v1
NEXT_PUBLIC_APP_NAME=Tesfa Counseling
NEXT_PUBLIC_BETA_FEEDBACK=true       # show Give Us Your Feedback widget
```

---

## Backend structure

```
backend/
├── app/
│   ├── models.py
│   ├── config.py              # postgres:// fix, local SQLite path, DAILY_API_KEY, SMTP
│   ├── datetime_utils.py      # UTC normalization for API + display
│   ├── db_utils.py            # SQLite WAL, busy timeout, copy helper
│   ├── db_bootstrap.py        # Postgres: ensure testing_feedback table on startup
│   ├── routes/
│   │   ├── auth.py
│   │   ├── admin.py           # overview, users, roles grant/revoke, providers, audit, orgs, approvals
│   │   ├── clinical_notes.py  # SOAP notes, supervision queue, cosign
│   │   ├── intake.py          # TraineeIntake CRUD
│   │   ├── therapists.py      # Public GET /therapists
│   │   ├── providers.py       # GET/PATCH /providers/me
│   │   ├── availability.py
│   │   ├── appointments.py    # book, cancel, reschedule, get, slots, video-join redirect
│   │   ├── feedback.py          # Client feedback (ongoing)
│   │   ├── testing_feedback.py  # UAT page feedback (testing phase)
│   │   ├── health.py            # daily_api_key_set, smtp_configured, beta_feedback_enabled, testing_feedback_db_ready
│   │   └── telegram.py
│   ├── services/
│   │   ├── scheduling.py
│   │   ├── notifications.py   # HTML email + telegram
│   │   ├── email_templates.py # branded HTML for session emails
│   │   └── video.py           # Daily.co rooms, join window, diagnostics
│   └── tasks/reminders.py
├── migrations/versions/
│   ├── 989683a912d3_initial_schema.py
│   ├── e95c4e9c45bc_phase_2_scheduling.py
│   ├── a1b2c3d4e5f6_trainee_languages.py
│   ├── b2c3d4e5f6a7_appointment_video.py
│   ├── c3d4e5f6a7b8_clinical_notes.py
│   ├── d4e5f6a7b8c9_intake_session_mode.py
│   ├── g7b8c9d0e1f2_client_feedback.py
│   ├── h8c9d0e1f2a3_provider_schedule_ack.py
│   ├── i9d0e1f2a3b4_testing_feedback.py
│   ├── j9e0f1a2b3c4_testing_feedback_guest.py
│   ├── k0e1f2a3b4c5_testing_feedback_repair.py
│   ├── l0e1f2a3b4c5d6_testing_feedback_postgres_repair.py
│   └── m0e1f2a3b4c5d6_testing_feedback_page_context.py   # head
├── migrate_client_org_links.py
├── seed_admin.py
├── seed_demo_counselor.py
├── seed_demo_supervision.py
├── run.py                     # Port 5050
└── wsgi.py                    # Production entry
```

**Key API paths:**
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/therapists` | No | Approved providers |
| GET/PATCH | `/providers/me` | JWT | Provider profile edit |
| GET/POST | `/availability/rules`, `/pricing` | JWT | Schedule + rates |
| GET/POST | `/appointments` | JWT | List / book |
| GET | `/appointments/:id` | JWT | Single appointment |
| POST | `/appointments/:id/cancel` | JWT | |
| POST | `/appointments/:id/reschedule` | JWT | Body: `starts_at`, `duration_minutes` |
| GET | `/appointments/:id/video-join` | No | Redirect to Daily when join window open |
| GET | `/appointments/providers/:id/slots` | JWT | |
| GET | `/admin/daily-check` | JWT + platform_admin | Verify Daily API key |
| POST | `/admin/daily-test-room` | JWT + platform_admin | Create test Daily room |
| POST | `/admin/backfill-video-rooms` | JWT + platform_admin | Create missing video rooms |
| POST | `/admin/test-email` | JWT + platform_admin | Send SMTP test email |
| GET | `/admin/overview`, `/users`, `/providers`, `/audit-logs`, `/organizations` | JWT + admin role | |
| POST | `/admin/therapists/:id/approve|reject` | JWT + admin | |
| POST | `/admin/trainees/:id/approve|reject` | JWT + admin | |
| POST/DELETE | `/admin/users/:id/roles` | JWT + platform_admin | Grant/revoke supervisor, platform_admin |
| GET/POST | `/clinical-notes/...` | JWT | Provider notes, supervision, cosign |
| GET | `/intake/supervision` | JWT + supervisor | Client intakes for supervisor's trainees |
| GET/POST | `/intake/...` | JWT | Trainee intake forms (client fill, trainee list) |
| POST | `/testing-feedback` | JWT optional | UAT page feedback (guests OK with name) |
| GET | `/testing-feedback/enabled` | No | Whether beta feedback is on |
| GET/PATCH | `/admin/testing-feedback` | JWT + platform_admin | UAT feedback inbox |

---

## Local development (Windows)

```powershell
cd C:\dev\tesfa-counseling\backend
pip install -r requirements.txt
flask db upgrade
python seed_admin.py              # optional: platform admin
python seed_demo_counselor.py     # demo provider + availability + pricing
```

### Start servers (from repo root)

```powershell
cd C:\dev\tesfa-counseling
.\start-backend.ps1               # terminal 1 — Flask http://127.0.0.1:5050
.\start-frontend.ps1              # terminal 2 — Next.js http://localhost:3000
```

### Demo credentials
| Role | Email | Password |
|------|-------|----------|
| Platform admin | `admin@counselconnect.local` or `admin@tesfacounseling.local` | `admin-change-me` |
| Demo counselor | `counselor@demo.local` or `counselor@demo.ethio` | `demo12345` |
| Demo client | `client2@demo.ethio` | `demo12345` |
| Demo supervisor | `supervisor@demo.local` | `demo12345` |
| Demo trainee | `trainee@demo.local` | `demo12345` |

Note: Migrated DB uses `admin@counselconnect.local`. New `seed_admin.py` defaults to `admin@tesfacounseling.local`.

### Health checks
- API: `http://127.0.0.1:5050/api/v1/health`
- Providers: `http://127.0.0.1:5050/api/v1/therapists`

---

## Environment variables

**Backend (`backend/.env` — see `.env.example`):**
```
# SQLite default: C:\dev\tesfa-counseling\tesfa_counseling.db (project root via config.py)
LOCAL_DATABASE_PATH=C:/dev/tesfa-counseling/tesfa_counseling.db
DATABASE_URL=                          # unset for local SQLite; set for Postgres in prod
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SECRET_KEY=...
JWT_SECRET_KEY=...
DAILY_API_KEY=                    # required in prod for video
SMTP_HOST=smtp.sendgrid.net         # SendGrid in prod
SMTP_PORT=587
SMTP_USER=apikey                    # literal string "apikey" for SendGrid
SMTP_PASSWORD=                      # SendGrid API key (SG....)
SMTP_FROM=noreply@tesfacounseling.com
APP_URL=https://www.tesfacounseling.com
API_PUBLIC_URL=https://tesfa-counseling.onrender.com/api/v1
BETA_FEEDBACK_ENABLED=true          # set false after UAT; on by default if unset
ADMIN_EMAIL=admin@tesfacounseling.local
ADMIN_PASSWORD=admin-change-me
```

**Frontend (`frontend/.env.local`):**
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:5050/api/v1
NEXT_PUBLIC_APP_NAME=Tesfa Counseling
NEXT_PUBLIC_BETA_FEEDBACK=true       # show Give Us Your Feedback widget
```

---

## Production deploy

**Live URLs:**
| Service | URL |
|---------|-----|
| **Primary site** | `https://www.tesfacounseling.com` |
| Frontend (Netlify) | `https://tesfa-counseling.netlify.app` |
| API (Render) | `https://tesfa-counseling.onrender.com` |

See **`DEPLOY.md`**. Summary:
1. Render: API from `render.yaml`, set `DATABASE_URL`, `CORS_ORIGINS`, `DAILY_API_KEY`, `SMTP_*`, `BETA_FEEDBACK_ENABLED`, secrets
2. Netlify: frontend; `NEXT_PUBLIC_API_URL=https://tesfa-counseling.onrender.com/api/v1`; `NEXT_PUBLIC_BETA_FEEDBACK` in `netlify.toml`
3. Run once: `python seed_admin.py`, `python migrate_client_org_links.py`
4. Migrations run on deploy (`preDeployCommand`) **and** at API start (`flask db upgrade && gunicorn` in `render.yaml`)
5. **CORS_ORIGINS** must include every frontend origin, e.g.:
   `https://www.tesfacounseling.com,https://tesfacounseling.com,https://tesfa-counseling.netlify.app`
6. After env var changes on Render, **Restart service** — saving env alone does not reload workers
7. **Netlify “Canceled”** on backend-only pushes is normal (no frontend file changes) — not a failure
8. Verify feedback DB: `GET /api/v1/health` → `testing_feedback_db_ready: true`

---

## Known pitfalls

1. **Port 5050** for Flask — not 5000/5001 (Cursor may bind those with HTTPS).
2. **Port 3000 zombie** — run `start-frontend.ps1` (kills stale node, clears `.next`).
3. **Canonical repo** — `C:\dev\tesfa-counseling` only; do not edit the old Google Drive copy.
4. **Don't delete `.next` while dev server running** — causes 500 errors.
5. **Booking requires client login** — slots API is JWT-protected.
6. **Admin access** — login as platform admin → lands on **`/dashboard`** with admin tabs (not a separate `/admin` workflow).
7. **Corrupt `.next` cache** — symptoms: `Internal Server Error`, `Cannot find module './611.js'`. Fix: stop dev server, delete `.next`, restart.
8. **Schedule "Add hours"** — fixed React async form reset bug (capture form ref before `await`).
9. **Language filter** only shows languages from **approved** providers with `languages` field populated.
10. **Video join** — needs `DAILY_API_KEY` on Render; window is 15 min before to 30 min after session; `/video-join` enforces same window
11. **SendGrid SMTP** — `SMTP_USER` must be `apikey`, not your SendGrid login email; domain must be authenticated in SendGrid
12. **Custom domain CORS** — registration/API fails with “Cannot reach the API” if `www.tesfacounseling.com` not in `CORS_ORIGINS`
13. **Booking emails** — sent at book time only; rebook or use admin test email to verify SMTP after config changes
14. **Tailwind `@apply group`** — not allowed in `globals.css`; add `group` class on the React element instead
15. **Remember to start Flask** when testing backend changes (user rule)
16. **Supervisor intakes** — use `/supervision/intakes`, not the cosign queue on `/supervision`
17. **Legacy folders** — ignore `g:\My Drive\Ethio Counceling` and `C:\dev\ethio-counseling` after confirming new setup works
18. **Two feedback systems** — client dashboard **Feedback** ≠ floating **Give Us Your Feedback** (UAT); different tables and admin tabs
19. **UAT submit errors** — check `GET /api/v1/health` for `beta_feedback_enabled` and `testing_feedback_db_ready`; restart Render after env changes
20. **Netlify “Canceled” deploy** — expected when only backend files changed; not a frontend failure
21. **Wire more page context** — book flow steps etc. need `FeedbackPageLocationSetter` if testers need finer labels
22. **No formal assigned counselor** — “your counselor” on `/schedule` = most recent provider(s) from appointments
23. **SQLite schedule_change_type** — legacy rows may store `BOOKED`/`RESCHEDULED` (names); model expects `booked`/`rescheduled` — `normalize_sqlite_schedule_change_types()` on API boot

---

## Bugs fixed (reference)

| Issue | Fix |
|-------|-----|
| Counselors stuck "Loading…" | Server-side fetch in `counselors/page.tsx` |
| Book "Request failed" | `_as_utc()` in `scheduling.py` overlaps |
| Admin Access denied confusion | Clear messaging + logout + `?next=/admin` login |
| Per-client org spam | Industry org model + `migrate_client_org_links.py` |
| Schedule add hours crash | `Cannot read properties of null (reading 'reset')` — save form ref before async |
| Pricing UI confusing | Dollars in UI, cents in API; show current rates |
| Postgres on Render | `postgres://` → `postgresql://` in config |
| Timezone display off by ~7h | Naive SQLite datetimes parsed as local; fixed with `datetime_utils`, UTC `Z` suffix, local display fields |
| Clinical note draft 500 | Naive vs aware datetime in `_session_ready_for_notes` — use `as_utc()` |
| Only subjective saved on finalize | `handleSubmit` now calls `persistDraft()` before submit |
| SQLite database locked on login | WAL + local DB path + retry in `db_utils.py` / `auth.py` |
| Admin saw cosign queue | `platform_admin` was treated as supervisor — removed from `isSupervisor()` |
| Admin saw "Find a counselor" | Platform admin fell through to client dashboard — admin embedded on `/dashboard` |
| Next.js build: `@apply group` | Moved `group` from CSS to JSX className on audience tiles |
| Stale `C:\dev` copy missing format helpers | Sync `format.ts` from Drive; clear `.next` |
| Duplicate “Find a counselor” on client dashboard | Removed second button from empty-sessions block |
| Admin can't review application before approve | Expandable View application in `AdminApprovals.tsx` |
| Trainee doesn't see supervisor | `supervisor_name` on provider profile + card on `CounselorDashboard.tsx` |
| Supervisor can't see client intake | New `/supervision/intakes` + `GET /intake/supervision` (separate from cosign queue) |
| Split Drive + C:\dev workspaces | Consolidated to `C:\dev\tesfa-counseling` only |
| Production login/admin 500 | Postgres migrations + enum `values_callable` fixes (feedback, schedule_change_type) |
| Netlify API calls hit wrong host | `apiBase.ts` — no LAN rewrite on production domains |
| No video link on dashboard | `DAILY_API_KEY` missing on Render; backfill on upcoming appointments list |
| SendGrid no emails | SMTP env vars + restart; API key not account password |
| Custom domain register fails | Add domain to `CORS_ORIGINS` on Render |
| Long Daily URL in email | Short `/video-join` link; HTML shows “Video room” text |
| Video link works before session | Join window enforced on API, dashboard, and `/video-join` |
| Testing feedback “not enabled” | `BETA_FEEDBACK_ENABLED` default true; set on Render + restart |
| Testing feedback 500 on submit | Postgres missing `testing_feedback` table — migrations + `db_bootstrap.py` on startup |
| Next.js plain unstyled HTML | Corrupt `.next` dev cache — `start-frontend.ps1` clears and restarts |
| Geʽez logo clipped (`ስፋ`) | Smaller font in `BrandLogo.tsx` badge |
| My schedule past sessions 500 | SQLite `BOOKED` vs enum `booked` — normalize on boot + data fix |

---

## User preferences

- **Always start Flask** when developing (`.\start-backend.ps1`)
- **Product brand:** Tesfa Counseling (`NEXT_PUBLIC_APP_NAME`)
- **Audience copy:** Ethiopian diaspora on homepage is intentional (pilot market); product **name** is not “Ethio Counseling”
- **Blue theme** approved (Worku-style)
- **Build correctly, not "pilot shortcuts"** — user rejected per-client orgs, wants industry patterns
- **Commits:** only when user asks
- **Minimize scope** — focused diffs, match conventions

---

## Demo scripts

### Client happy path
1. Register/login as **client**
2. **Find a counselor** → filter by language → **View availability**
3. Book slot → **Dashboard** shows session + price
4. **Reschedule** or **Cancel** from dashboard

### Counselor happy path
1. Register as counselor (languages required) → admin approves
2. **Manage schedule** — add weekly hours, set pricing ($50 for 50 min)
3. **Edit profile** — bio, specialties, languages
4. See booked sessions on dashboard

### Admin happy path
1. Login `admin@tesfacounseling.local` → **`/dashboard`** (admin tabs shown immediately)
2. **Approvals** → approve pending counselors/trainees
3. **Users** → grant **Supervisor** role to a counselor when needed
4. **Providers / Activity / Organizations** for oversight

### Supervisor happy path
1. Login as supervisor (or counselor granted supervisor role)
2. **Dashboard** → **Review cosign queue** (`/supervision`) for trainee **session notes**
3. **Dashboard** → **Client intake forms** (`/supervision/intakes`) for pre-session intake review
4. **Approvals** tab (if supervisor) → approve trainees, assign supervisor on approve

---

## Suggested next work (priority order)

1. **Custom domain SSL** — finish Netlify certificate; force HTTPS; trim `http://` from CORS when done
2. **Scheduled email reminders** — cron on Render for 24h/1h before session (CLI exists; Telegram only today)
3. **Stripe** — charge card at booking using stored `amount_cents`
4. **Multi-currency** — counselor picks currency; client sees converted display
5. **Sliding scale UI** — client selects tier at booking if counselor allows
6. **Full video UX** — embedded Daily room, waiting room
7. **`GET /therapists/:id`** — cleaner book page load
8. **org_admin** — re-enable with per-clinic scoping if client wants multi-practice

---

## Key files

| Area | Path |
|------|------|
| Theme | `frontend/src/app/globals.css` |
| API client | `frontend/src/lib/api.ts` |
| Brand env | `frontend/src/lib/brand.ts` |
| Scheduling | `backend/app/services/scheduling.py` |
| Video | `backend/app/services/video.py` |
| Email templates | `backend/app/services/email_templates.py` |
| Notifications | `backend/app/services/notifications.py` |
| i18n | `frontend/src/lib/i18n.ts` |
| Org helpers | `backend/app/utils.py` |
| Models | `backend/app/models.py` |
| Admin routes | `backend/app/routes/admin.py` |
| Clinical notes | `backend/app/routes/clinical_notes.py` |
| Intake | `backend/app/routes/intake.py` |
| Date/time | `backend/app/datetime_utils.py` |
| DB helpers | `backend/app/db_utils.py` |
| Dashboard (main hub) | `frontend/src/app/dashboard/page.tsx` |
| Admin embed | `frontend/src/components/admin/AdminDashboardPanel.tsx` |
| Role helpers | `frontend/src/lib/roles.ts` |
| Homepage audience | `frontend/src/components/WhoWeServe.tsx` |
| Supervision UI | `frontend/src/components/dashboard/SupervisionDashboard.tsx` |
| Supervisor intakes page | `frontend/src/app/supervision/intakes/page.tsx` |
| Admin approvals | `frontend/src/components/admin/AdminApprovals.tsx` |
| Provider profile API | `backend/app/routes/providers.py` |
| Frontend launcher | `start-frontend.ps1` |
| Backend launcher | `start-backend.ps1` |
| Dev database | `tesfa_counseling.db` (project root) |
| Deploy | `DEPLOY.md`, `render.yaml`, `netlify.toml` |
| Org migration | `backend/migrate_client_org_links.py` |
| UAT feedback widget | `frontend/src/components/BetaFeedbackWidget.tsx` |
| UAT feedback API | `backend/app/routes/testing_feedback.py` |
| UAT admin inbox | `frontend/src/components/admin/AdminTestingFeedback.tsx` |
| Page context for feedback | `frontend/src/lib/feedbackPageContext.tsx`, `pageLocation.ts` |
| DB bootstrap (prod) | `backend/app/db_bootstrap.py` |
| Client schedule page | `frontend/src/app/schedule/page.tsx` |
| Client sessions list | `frontend/src/components/dashboard/ClientSessionsList.tsx` |

---

## Changelog (agent sessions)

### 2026-06-17 — Initial build (Phases 0–2)
- Auth, profiles, scheduling, booking UI, blue theme, port 5050

### 2026-06-18 — Admin, deploy, org model, booking polish, video partial

**Admin**
- Full dashboard: Overview, Approvals, Providers, Users, Activity, Organizations
- Admin API: overview, users PATCH, providers list, audit logs, org PATCH
- Trainee reject endpoint; auth-aware header with logout

**Deploy**
- `DEPLOY.md`, `render.yaml` (migrations on deploy), `netlify.toml` fix
- Postgres URL normalization

**Organizations**
- Clients: no org at signup; linked to counselor practice on booking
- `migrate_client_org_links.py` removes legacy shared client org
- Registration updated; `consolidate_client_orgs.py` replaced by migrate script

**Counselors / registration**
- Language filter + specialty filter on `/counselors`
- Languages required at provider registration
- Trainee `languages` column + migration
- Provider profile edit: `/provider/profile`, `/providers/me`

**Booking**
- Reschedule flow (`?reschedule=` on book page + API)
- Email notifications stub (book/cancel/reschedule)
- Pricing UI in dollars; list current rates

**Video (Phase 3 partial)**
- Appointment `video_room_name`, `video_room_url`
- Daily.co integration in `video.py`
- Join button on dashboard with time window

**UX fixes**
- Admin login flow (`?next=/admin`), access denied messaging
- Schedule form reset bug fix
- Demo counselor languages backfill (English, Spanish, Amharic)
- `NEXT_PUBLIC_APP_NAME` for rebrand without code changes

### 2026-06-23 — Dashboard/admin merge, roles, homepage, supervision scope

**Dashboard & admin**
- Admin panels embedded in `/dashboard` via `AdminDashboardPanel.tsx`
- `/admin` redirects to `/dashboard` for users with admin access
- Removed `AdminDashboardLink` — no extra click to reach admin
- `AccountTabs.tsx` for users with multiple areas (Platform / Approvals / Counseling / Supervision)
- Platform admin no longer sees client “Find a counselor” or cosign queue on dashboard

**Roles (solo operator)**
- Removed `org_admin` from grant UI and full admin access — owner uses `platform_admin` only
- `isSupervisor()` and backend cosign checks — **supervisor role only** (not platform_admin)
- Grant roles: supervisor + platform_admin; Platform org assignment is automatic

**Homepage**
- `WhoWeServe.tsx` — interactive audience cards in `card-vibrant`
- Mission card: “Our mission” heading; trimmed redundant mission sentence
- Hero: single “Find a counselor” CTA; signup via header “Get started”

**Prior session fixes (same sprint)**
- Timezone: UTC API responses, local display on dashboard/slots
- Clinical notes: draft/finalize bugs, trainee cosign flow
- SQLite: local dev DB path, WAL, lock retry
- AdminUsers: removed Platform org explanatory copy
- CSS: audience tile animations; fixed `@apply group` build error

### 2026-06-17 — E2E fixes, rebrand, local consolidation

**UX / supervision**
- Admin approvals: expandable application details before approve/reject
- Trainee dashboard: assigned supervisor name/email
- Supervisor: `/supervision/intakes` for client intake forms (`GET /intake/supervision`)
- Client dashboard: one “Find a counselor” entry point
- Clarified cosign queue vs intake forms in supervision UI

**Rebrand**
- Counsel Connect / ethio-counseling → **Tesfa Counseling** in docs, `render.yaml`, health check, `package.json`
- Seed default: `admin@tesfacounseling.local` (legacy DB retains `admin@counselconnect.local`)

**Workspace**
- Full project consolidated to `C:\dev\tesfa-counseling` (Google Drive no longer active dev path)
- Added `start-backend.ps1`; `start-frontend.ps1` runs in-repo (no robocopy from Drive)
- SQLite at project root `tesfa_counseling.db`; migrated from `C:\dev\ethio-counseling`
- `config.py` resolves DB relative to project root with legacy path fallback

### 2026-07-02 / 2026-07-03 — Production hardening, video, email, custom domain

**Video (Daily.co)**
- Hardened room creation (exp fallback, retry without exp, fetch existing room on collision)
- Backfill video rooms on `GET /appointments?upcoming=true` and single appointment GET
- Admin daily-check, test-room, backfill-video-rooms; `test_daily.py` for Render shell
- Health: `daily_api_key_set`
- Join window enforced: API hides URL until open; `/appointments/:id/video-join` redirect with blocked HTML page
- Emails: branded HTML (`email_templates.py`); video note “opens 15 min before” (no early Daily link)

**Email (SendGrid)**
- SMTP live on Render; HTML session emails (book/cancel/reschedule/feedback)
- Admin **Send test email** in Statistics panel; health `smtp_configured`
- SendGrid domain auth on `tesfacounseling.com` via GoDaddy DNS (`em6403` verified)

**Production fixes**
- Postgres enum fixes for feedback + schedule_change_type (admin 500, booking 500)
- `apiBase.ts` production URL fix
- Provider photo authenticated preview endpoint
- CORS for `www.tesfacounseling.com` custom domain

**UX / content**
- i18n Amharic/English; homepage “Tesfa means hope” copy (dropped “in Amharic” only)
- Client feedback + admin feedback panel; schedule alerts
- Admin stats: removed pro bono / trainee rate display

**Git / deploy**
- Repo: `TesfaCounseling/Tesfa-Counseling` branch `main`; pushes auto-deploy Render + Netlify
- Collaborator push as `jaklilu`

### 2026-07-06 — Testing-phase feedback (UAT), custom domain primary

**Give Us Your Feedback (UAT)**
- Floating widget on all pages when `NEXT_PUBLIC_BETA_FEEDBACK=true` (Netlify `netlify.toml`)
- Separate from client dashboard **Feedback** form — own table `testing_feedback`, admin **Testing** tab
- Guests submit with name; logged-in users auto-identified (role captured: client, counselor, platform_admin, guest)
- **Page context** — readable location string (e.g. `Dashboard › Client › Upcoming sessions`, `Counselor › Manage schedule`)
- Context wired: dashboard `AccountTabs` / `DashboardTabs`, admin section tabs, provider pages (profile, schedule, notes, intakes)
- Widget shows **You are on** preview before send; admin inbox shows context as primary title

**Backend / production fixes**
- Migrations `i9`–`m0`; guest nullable `user_id` + `submitter_name`; `page_context` column
- `db_bootstrap.py` creates/repairs Postgres table on API boot if migrations missed
- `BETA_FEEDBACK_ENABLED` defaults **on** when env unset; health exposes `beta_feedback_enabled`, `testing_feedback_db_ready`
- `render.yaml`: `flask db upgrade && gunicorn` on start; `BETA_FEEDBACK_ENABLED=true`
- Fixed submit 500s when production DB lacked `testing_feedback` schema

**UX / branding**
- Widget label: **Give Us Your Feedback** (was “Testing feedback”)
- `BrandLogo.tsx` — full Geʽez `ተስፋ` no longer clipped
- `brand-text` CSS fallback when gradient clip unsupported
- Removed homepage “We're testing the site” banner

**Status:** UAT feedback working in production (user confirmed 2026-07-06).

**Domain**
- **`www.tesfacounseling.com`** is primary site for testers and production traffic
- `APP_URL` and `CORS_ORIGINS` should use custom domain first

**Git**
- Commits through `81d2be6` on `main`; auto-deploy Render + Netlify

### 2026-07-12 — Client schedule page, homepage/copy polish

**Client scheduling**
- `/schedule` is booking-first: Schedule a session with counselor(s) from appointment history
- New clients without history → Find a counselor CTA
- Dashboard: Find a counselor + My schedule cards; shared `ClientSessionsList`
- No assigned-counselor DB field — relationship inferred from bookings
- Fixed past-appointments 500: SQLite `schedule_change_type` name→value normalize on API boot

**Homepage / copy**
- Hero: `Tesfa (ተስፋ) — Bringing Hope and Healing Wherever You Are.`
- Mission: “virtual counseling service” (was “center”)
- Couples card blurb starts with Pre-marital Counseling
- Find counselor Amharic: ምክርኛ → አማካሪ (and related page strings)
- View availability button centered on provider cards

**Git**
- Pushed to `main` (this session)

---

*End of context — append updates below as work continues.*
