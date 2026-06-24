# Tesfa Counseling — Production Deployment

Deploy the **Next.js frontend** on Netlify, **Postgres on Netlify Database**, and the **Flask API** on Render.

---

## Overview

| Service | Platform | URL pattern |
|---------|----------|-------------|
| Frontend | Netlify | `https://tesfa-counseling.netlify.app` |
| API | Render | `https://tesfa-counseling.onrender.com` |
| Database | **Netlify Database** (Postgres) | `DATABASE_URL` on **Render** only |

The frontend never connects to the database directly. Render’s Flask API uses `DATABASE_URL`.

---

## 1. Database (Netlify Database → Render)

### Create the database (Netlify UI)

1. Open your site: [Netlify](https://app.netlify.com) → **Tesfa-Counseling**
2. Left sidebar → **Database**
3. Click **Create a database manually** (or use **Add database**)
4. Wait until the production branch shows **Active**

### Copy the connection string for Render

1. Still on **Database** → section **Branches**
2. Open the **production** branch
3. Click **Copy connection string** (include credentials / show password if prompted)

The URL looks like:

```
postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

`postgres://` also works — the Flask app auto-converts to `postgresql://`.

### Set on Render (not Netlify)

1. [Render Dashboard](https://dashboard.render.com) → **Tesfa-Counseling** web service
2. **Environment** → add or edit:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Paste the Netlify Database connection string |

3. **Save** → **Manual Deploy** (or wait for auto-deploy)

Migrations run on each deploy via `preDeployCommand: flask db upgrade` in `render.yaml`.

### Optional: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify link
netlify database status --show-credentials
```

Use the **production** branch credentials for Render `DATABASE_URL`.

---

## 2. API (Render)

### Option A — Blueprint (`render.yaml`)

1. Connect your Git repo to Render.
2. Create a **Blueprint** from the repo root (includes `render.yaml`).
3. Set sync=false env vars in the Render dashboard after deploy:

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | Netlify Database connection string | Yes |
| `CORS_ORIGINS` | `https://tesfa-counseling.netlify.app` | Yes |
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

3. Set **environment variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://tesfa-counseling.onrender.com/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | `Tesfa Counseling` |

4. Deploy. On Render, set `CORS_ORIGINS` to `https://tesfa-counseling.netlify.app` (no trailing slash).

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
| `TypeError: Union.__getitem__` / Python 3.14 | Set Render env `PYTHON_VERSION=3.12.7` (SQLAlchemy is not compatible with 3.14 yet) |
| Frontend “Cannot reach API” | Verify `NEXT_PUBLIC_API_URL` and redeploy Netlify after changing it |
| Admin page “Access denied” | Run `seed_admin.py`; log in as platform admin |

---

## 7. Custom domain (optional)

1. Add domain in Netlify → note HTTPS URL.
2. Add same URL to Render `CORS_ORIGINS`.
3. Optionally add API subdomain on Render (e.g. `api.tesfacounseling.com`).
