# Tesfa Counseling Platform

International online counseling platform connecting licensed counselors and supervised trainees with clients worldwide. Built for multi-counselor organizations, multiple languages, pro bono work, and Telegram notifications.

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js on **Netlify** |
| API | Flask on **Render** |
| Database | **Netlify Database** (Postgres) or local SQLite for dev |
| Video | Daily.co (Phase 3) |
| Notifications | Telegram + email (Phase 2) |

## Project structure

```
tesfa-counseling/
├── backend/          Flask API (deploy to Render)
├── frontend/         Next.js app (deploy to Netlify)
├── render.yaml       Render service config
└── netlify.toml      Netlify build config
```

## Local development

**Project path:** `C:\dev\tesfa-counseling` (local disk — use this folder in Cursor and for Git).

### Quick start (Windows)

```powershell
cd C:\dev\tesfa-counseling\backend
pip install -r requirements.txt
cp .env.example .env
flask db upgrade
python seed_admin.py          # optional: creates platform admin

cd ..
.\start-backend.ps1           # terminal 1 — http://127.0.0.1:5050
.\start-frontend.ps1          # terminal 2 — http://localhost:3000
```

API health check: `http://127.0.0.1:5050/api/v1/health`

> **Port note:** Avoid ports 5000–5001 locally — Cursor's agent may bind those with HTTPS.

### Manual start

```bash
cd backend && python run.py
cd frontend && npm install && npm run dev
```

## Phase 1 API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/register` | Register (client / therapist / trainee) |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/me` | Current user (JWT required) |
| GET | `/api/v1/admin/therapists/pending` | Therapist approval queue |
| POST | `/api/v1/admin/therapists/:id/approve` | Approve therapist |
| POST | `/api/v1/admin/therapists/:id/reject` | Reject therapist |
| GET | `/api/v1/admin/trainees/pending` | Trainee approval queue |
| POST | `/api/v1/telegram/webhook` | Telegram bot webhook |

### Register example

```json
POST /api/v1/auth/register
{
  "email": "client@example.com",
  "password": "securepass",
  "first_name": "Sara",
  "last_name": "Kebede",
  "role": "client"
}
```

Roles: `client`, `therapist`, `trainee`

## Deployment

### Render (API)

1. Connect repo to Render
2. Use `render.yaml` — sets root to `backend/`
3. Set env vars: `DATABASE_URL` (from Netlify Database), `CORS_ORIGINS`, `TELEGRAM_BOT_TOKEN`, etc.

### Netlify (Frontend + Database)

1. Connect repo; set base directory to `frontend`
2. Add Netlify Database: `netlify database init` or via dashboard
3. Copy `DATABASE_URL` to Render env vars
4. Set `NEXT_PUBLIC_API_URL` to your Render API URL

### Telegram webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-api.onrender.com/api/v1/telegram/webhook", "secret_token": "<SECRET>"}'
```

## What's next (Phase 2+)

- Scheduling & availability
- Telegram booking reminders
- Daily.co video sessions
- Clinical notes & supervision cosign workflow
- Pro bono pricing & Stripe payments
