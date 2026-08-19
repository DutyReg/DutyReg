# DutyReg

<p align="center">
  <img src="public/icons/webicon.png" alt="DutyReg logo" width="96" height="96" />
</p>

Duty registry for small businesses in Sri Lanka. Supervisor-first, mobile-first, low data, cheap-Android friendly. The supervisor marks workers present/absent on a daily sheet; owners and viewers see results instantly and reports can be shared over WhatsApp.

DutyReg is the pilot implementation of the AttendancePilot MVP described in `pilot-project.md` / `pilot-project-plan.md` (kept at the workspace root — this app lives in `Attendance/`).

## Features

- **Mark attendance** — one sheet per site per day; present / absent / not-marked, optional in/out time and note, "Mark all present". Debounced **auto-save** (Saved / Saving / Not saved status chip) that also flushes on navigation and page unload, so edits are never lost.
- **Real-time updates** — settings changes and attendance edits appear without a manual refresh: server actions revalidate the page in the same roundtrip, and Supabase Realtime keeps other open tabs/devices in sync.
- **Delete with confirmation** — sites, workers, and team members are removed through a confirmation dialog; attendance history is deleted with the site/worker.
- **Theme toggle** — light/dark mode, class-based, remembers your choice (light-by-default for outdoor use).
- **Reports** — plain-text daily report per site, shareable via WhatsApp, copy, or the native share sheet.
- **Roles** — owner, supervisor, viewer (see below).

## Roles

| Role       | Can do                                                        |
| ---------- | ------------------------------------------------------------- |
| Owner      | Company, sites, workers, team members, view + edit attendance |
| Supervisor | Open the day's sheet, mark attendance, share reports          |
| Viewer     | View reports (read-only)                                      |

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) on Vercel — Docker support included
- Supabase: PostgreSQL + Auth (Google OAuth and email/password) + Row Level Security + Realtime
- No service-role key in the browser; every mutation is gated by RLS policies (and security-definer RPCs for member management)
- GitHub Actions CI: lint → typecheck → tests → build (on PRs and pushes to `dev`/`main`)

## Branches

| Branch | Purpose                                                        |
| ------ | -------------------------------------------------------------- |
| `main` | **Stable.** Only stable, verified updates land here.           |
| `dev`  | **Development.** All work-in-progress merges here first; `dev` is merged to `main` once finalized. |

See `CONTRIBUTING.md` for the workflow.

## Getting started

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Install the Supabase CLI and link the project:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
3. Apply the migrations (creates tables, RLS, grants, triggers, RPC functions, and the realtime publication):
   ```bash
   supabase db push --password "$YOUR_DB_PASSWORD"
   ```
4. For demo data, create an auth user with email `demo@dutyreg.app` (Authentication → Users → Add user), then run `supabase/seed.sql` against the database.
5. Enable **Google login**: Authentication → Providers → Google. Set up an OAuth client in Google Cloud Console with the redirect URL `https://<your-domain>/auth/callback` (use `http://localhost:3000/auth/callback` for local dev).
6. Email/password is enabled by default (Authorization → Providers → Email). For the pilot, disable "Confirm email" if you want instant sign-in without a mail server.

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
docker build -t dutyreg .
docker run --rm -p 3000:3000 --env-file .env.local dutyreg
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
4. The supervisor opens **Mark** and records attendance; the owner/viewer watches on **Today** — live.

## Data model

`companies` → `company_members` (owner/supervisor/viewer) · `sites` · `workers` (optional site) · `attendance_sheets` (unique per site + date) · `attendance_entries` (unique per sheet + worker). `sheet_date` is a date in `Asia/Colombo`. All multi-company access is isolated by RLS; a logged-in user from Company A can never read Company B. Deleting a site or worker cascades to their attendance records.

## Notes for the pilot

- English-only UI for the pilot; language scaffolding (Sinhala/Tamil) is planned later.
- Reports are plain text (WhatsApp-friendly). JPEG image reports are a follow-up.
- The sheet's "today" is computed in Colombo time (`Asia/Colombo`), so a phone set to any timezone still sees the right day.
- Licensed under GPL-3.0 — see `LICENSE`.