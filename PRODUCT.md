# DutyReg — product context

Status: pilot MVP under active build.

## What it is

Supervisor-first attendance logging for small businesses in Sri Lanka. A supervisor with a cheap Android phone records worker attendance daily; the owner/viewer sees it in real time; reports are shared over WhatsApp. It is a digital backup for the paper signing sheet, not a payroll system.

## Users

- **Owner** — manages company, sites, workers, team; can edit and view attendance.
- **Supervisor** — records attendance on a per-site daily sheet; shares reports.
- **Viewer** — read-only reports.

## Constraints (pilot)

No worker app, no paid server, no complex payroll, low data, mobile-first, English-only UI, deployable on Vercel free tier with Supabase free tier, manual onboarding, RLS-backed isolation between companies.

## Success measures

One real supervisor uses it ≥ 5 working days; no critical data loss; viewer finds records useful; ≥ 1 WhatsApp report shared; supervisor rates it ≥ paper; business willing to pay after the pilot.

## Assumptions recorded at build time

- One company per user for the pilot (the first sign-up creates a company); multi-company membership is future work.
- "Today" is computed in Asia/Colombo regardless of device timezone.
- Report sharing is plain text; JPEG image reports deferred.
- Sinhala/Tamil UI deferred; the data layer stores names as text so Unicode names work today.

## Design direction (brief-derived)

Operate-mode utility: light-by-default theme (outdoor use), single amber accent on neutral zinc, status colors only for Present/Absent/Not marked, Geist sans, one consistent rounded-corner scale (pill buttons, 12px cards, 8px inputs), 44px+ touch targets, zero decorative animation, tabular numerals on counts, authored 1.75px stroke icon set.

## Stack

Next.js 16 (App Router, Turbopack) · Tailwind v4 · Supabase (Postgres, Auth, RLS) · Docker · GitHub Actions CI · Vercel.

## Key flows

1. Sign up → create company (owner) → add sites/workers → invite supervisor by email.
2. Supervisor → Mark → per-site sheet (unique per site + day) → toggle present/absent → auto-save → share to WhatsApp.
3. Dashboard → date/site filters → counts + list + last updated → copy/share report.

## Security model

All data reads/writes run through RLS, keyed on membership; sensitive mutations (member add/role/remove, company create) run as security-definer rpc functions with owner checks inside the database. No service-role key exists in browser code.