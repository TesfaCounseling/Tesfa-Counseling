# Tesfa Counseling — Production Deployment

Deploy the **Next.js frontend** on Netlify and the **Flask API** on Render with a managed Postgres database.

---

## Overview

| Service | Platform | URL pattern |
|---------|----------|-------------|
| Frontend | Netlify | `https://your-site.netlify.app` |
| API | Render | `https://tesfa-counseling-api.onrender.com` |
| Database | Render Postgres (or external) | Set as `DATABASE_URL` on Render |

---

## 1. Database (Render Postgres)

1. In [Render Dashboard](https://dashboard.render.com), create a **PostgreSQL** instance.
2. Copy the **Internal Database URL** (use internal URL from the API service for lower latency).
3. Render may provide `postgres://` — the app auto-converts this to `postgresql://`.

---

## 2. API (Render)

### Option A — Blueprint (`render.yaml`)

1. Connect your Git repo to Render.
2. Create a **Blueprint** from the repo root (includes `render.yaml`).
3. Set sync=false env vars in the Render dashboard after deploy:

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://...` | Yes |
| `CORS_ORIGINS` | `https://your-site.netlify.app` | Yes |
| `SECRET_KEY` | auto-generated | Yes |
| `JWT_SECRET_KEY` | auto-generated | Yes |
| `TELEGRAM_BOT_TOKEN` | optional | No |
| `TELEGRAM_WEBHOOK_SECRET` | optional | No |

`FLASK_APP=wsgi:app` and `preDeployCommand: flask db upgrade` are configured in `render.yaml` so migrations run on each deploy.

### Option B — Manual web service

- **Root directory:** `backend`
- **Build:** `pip install -r requirements.txt`
- **Pre-deploy:** `flask db upgrade` (set `FLASK_APP=wsgi:app`)
- **Start:** `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- **Health check path:** `/api/v1/health`

### Seed platform admin (one time)

In Render **Shell** for the API service:

```bash
python seed_admin.py
```

Defaults: `admin@tesfacounseling.local` / `admin-change-me` — override with `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars before running.

Optional demo counselor:

```bash
python seed_demo_counselor.py
```

Consolidate client org links and remove legacy shared client org (run once after deploy or upgrade):

```bash
python migrate_client_org_links.py
```

### Verify API

```bash
curl https://YOUR-API.onrender.com/api/v1/health
# {"service":"tesfa-counseling-api","status":"ok"}
```

---

## 3. Frontend (Netlify)

1. Connect the Git repo to [Netlify](https://app.netlify.com).
2. Netlify reads `netlify.toml` at repo root:
   - Base directory: `frontend`
   - Build: `npm run build`
   - Plugin: `@netlify/plugin-nextjs` (handles Next.js output — no manual publish path)

3. Set **environment variable**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com/api/v1` |

4. Deploy. After deploy, update Render `CORS_ORIGINS` to include your exact Netlify URL (and custom domain if added).

---

## 4. Post-deploy checklist

- [ ] API health check returns OK
- [ ] Frontend loads and shows counselors (after seeding demo data)
- [ ] Login/register works (CORS + API URL correct)
- [ ] Admin login → Dashboard → **Review provider applications** → `/admin`
- [ ] Book flow: client can request a session
- [ ] Run `python migrate_client_org_links.py` (links clients to counselor orgs from bookings, removes legacy shared client org)
- [ ] Change default admin password

---

## 5. Local vs production env

**Frontend** (`frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:5050/api/v1
```

**Backend** (`backend/.env` — see `.env.example`):

```
DATABASE_URL=sqlite:///tesfa_counseling.db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SECRET_KEY=dev-secret-change-me
JWT_SECRET_KEY=dev-jwt-secret-change-me
```

---

## 6. Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS errors in browser | Add exact Netlify origin to `CORS_ORIGINS` on Render (no trailing slash) |
| 502 / API sleep (free tier) | First request wakes service; consider paid plan for always-on |
| Migrations failed on deploy | Check Render deploy logs; run `flask db upgrade` manually in Shell |
| Frontend “Cannot reach API” | Verify `NEXT_PUBLIC_API_URL` and redeploy Netlify after changing it |
| Admin page “Access denied” | Run `seed_admin.py`; log in as platform admin |

---

## 7. Custom domain (optional)

1. Add domain in Netlify → note HTTPS URL.
2. Add same URL to Render `CORS_ORIGINS`.
3. Optionally add API subdomain on Render (e.g. `api.tesfacounseling.com`).
