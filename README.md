# DayMark

Attendance logging for small businesses in Sri Lanka. Supervisor-first, mobile-first, low data, cheap-Android friendly. The supervisor marks workers present/absent on a daily sheet; owners and viewers see results instantly and reports can be shared over WhatsApp.

DayMark is the pilot implementation of the AttendancePilot MVP described in `pilot-project.md` / `pilot-project-plan.md` (kept at the workspace root — this app lives in `Attendance/`).

## Roles

| Role       | Can do                                                        |
| ---------- | ------------------------------------------------------------- |
| Owner      | Company, sites, workers, team members, view + edit attendance |
| Supervisor | Open the day's sheet, mark attendance, share reports          |
| Viewer     | View reports (read-only)                                      |

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) on Vercel — Docker support included
- Supabase: PostgreSQL + Auth (Google OAuth and email/password) + Row Level Security
- No service-role key in the browser; every mutation is gated by RLS policies
- GitHub Actions CI: lint → typecheck → tests → build

## The pilot plan in one view

1. **Setup** — scaffold, CI, env wiring, Docker (done in this repo)
2. **Auth + onboarding** — login (Google + email/password), owner creates a company, others wait for access
3. **Owner settings** — company name, sites, workers, team member roles
4. **Attendance screen** — one sheet per site per day (unique constraint), present/absent/unknown, optional in/out time + note, "Mark all present", debounced auto-save with a clear Saved/Saving/Not-saved status
5. **Dashboard + reports** — date/site selectors, counts, worker list, last-updated, WhatsApp/copy/share
6. **Polish + QA gate** — the checklist in `pilot-project.md` §12–14 (20 acceptance criteria, QA list, security list)

Excluded from the pilot on purpose: worker-facing app, payroll, GPS, offline sync, public signup, billing (see `pilot-project.md` §6).

## Getting started

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor**, run `supabase/migrations/0001_init.sql` (creates tables, RLS, triggers, rpc functions).
3. For demo data, create an auth user with email `demo@daymark.app` (Authentication → Users → Add user), then run `supabase/seed.sql`.
4. Enable **Google login**: Authentication → Providers → Google. Set up an OAuth client in Google Cloud Console with the redirect URL `https://<your-domain>/auth/callback` (use `http://localhost:3000/auth/callback` for local dev).
5. Email/password is enabled by default (Authorization → Providers → Email). For the pilot, disable "Confirm email" if you want instant sign-in without a mail server.

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from Project Settings → API. Never commit `.env.local`.

### 3. Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

### 4. Check scripts

| Command               | What it does                        |
| --------------------- | ----------------------------------- |
| `npm run dev`         | Local dev server (Turbopack)        |
| `npm run lint`        | ESLint                              |
| `npm run typecheck`   | TypeScript (`tsc --noEmit`)         |
| `npm run test`        | Vitest unit tests                   |
| `npm run build`       | Production build (standalone)       |
| `npm start`           | Serve the production build          |

## Docker

```bash
docker build -t daymark .
docker run --rm -p 3000:3000 --env-file .env.local daymark
# or
docker compose up --build
```

## Deploying

### Vercel (pilot stack)

1. Push the repo to GitHub, import it in Vercel.
2. Add the env vars from `.env.local` to the project (Production and Preview).
3. Set the Google OAuth redirect in Supabase/provider to your Vercel domain.
4. Deploy. Preview deployments connect to the same test Supabase project; for the real pilot, create a second Supabase project and point the production env vars at it.

### Container (any host)

`docker compose up --build` on any VM with Docker; keep the `.env.local` file next to `docker-compose.yml`.

## Manual onboarding flow (pilot)

1. First user signs up → creates the company → becomes **owner**.
2. Owner adds sites and workers in Settings.
3. The supervisor signs up, then the owner adds them by email (Team → Add a team member → role **supervisor**).
4. The supervisor opens **Mark** and records attendance; the owner/viewer watches on **Today**.

## Data model

`companies` → `company_members` (owner/supervisor/viewer) · `sites` · `workers` (optional site) · `attendance_sheets` (unique per site + date) · `attendance_entries` (unique per sheet + worker). `sheet_date` is a date in `Asia/Colombo`. All multi-company access is isolated by RLS; a logged-in user from Company A can never read Company B.

## Notes for the pilot

- English-only UI for the pilot; language scaffolding (Sinhala/Tamil) is planned later.
- Reports are plain text (WhatsApp-friendly). JPEG image reports are a follow-up.
- The sheet's "today" is computed in Colombo time (`Asia/Colombo`), so a phone set to any timezone still sees the right day.