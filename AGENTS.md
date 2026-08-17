<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DayMark — project conventions

Attendance logging app. Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS, Realtime). See `README.md` (setup, features) and `CONTRIBUTING.md` (branch strategy, commit rules).

## Commands

- `npm run dev` — dev server on :3000 (Turbopack)
- `npm run lint` / `npm run typecheck` / `npm run test` / `npm run build` — must all pass before finishing a task
- Supabase CLI binary lives at `~/.npm-global/bin/supabase` (not on PATH). `db push` needs `--password` from `.env.local` (`projectpassword=...`) plus `</dev/null` to avoid hanging on a prompt.

## Architecture

- **Server components by default**; data is fetched server-side with the request-scoped client (`lib/supabase/server.ts`, memoized with React `cache` — one client per request). Auth context comes from `requireContext()` in `lib/auth.ts` (single cached `getUser` + one joined membership query).
- **Mutations** are server actions in `app/actions/` (`sites.ts`, `workers.ts`, `members.ts`, `auth.ts`). Every successful mutation MUST call `revalidatePath(...)` — Next 16 does NOT re-render the page otherwise, which silently breaks "updates without refresh".
- **Realtime:** `components/realtime-refresher.tsx` subscribes to `postgres_changes` and calls `router.refresh()`; RLS filters events. Tables must be in the `supabase_realtime` publication (see `0003_realtime.sql`). Filter by `company_id` only where the column exists (`attendance_entries` has none — rely on RLS).
- **Attendance autosave** lives in `components/attendance/sheet-client.tsx`: 900ms debounce → upsert → "Saved/Saving/Not saved" chip; flushes on unmount and on `pagehide` via a `keepalive: true` PostgREST POST. Don't break this contract.
- **Destructive actions** go through `components/confirm-dialog.tsx` — never a one-click delete.
- Forms use `ActionForm` (`useActionState`); `resetKey` re-mounts the form after success.

## Styling & theme

- Tailwind v4 with tokens from `app/globals.css` (`:root` / `.dark` + `@theme inline`). Use tokens (`ink`, `ink-soft`, `muted`, `surface`, `surface-soft`, `border`, `border-strong`, `present`, `absent`, `present-ink/soft`…, `primary`, `warning`, `info`, `inverse-text`) — never raw hex or Tailwind palette colors in components.
- Dark mode is class-based (`.dark` on `<html>`): every surface/interactive element needs a `dark:` variant. Inverted buttons use `text-inverse-text` (NOT `text-white` / `text-ink` — `--inverse-text` is dark in dark mode).
- Forbidden in components (enforced by `tests/css-parity.test.ts`): `amber-*` utilities, raw `bg-white` in light-mode surfaces, `:root`/`.dark` token drift.
- Theme state: `lib/theme.ts` external store consumed via `useSyncExternalStore` (React 19 lint bans setState-in-effect). Theme toggle in `components/theme-toggle.tsx`.

## React 19 lint rules (strict)

- No `setState` in effects (`react-hooks/set-state-in-effect`).
- No ref mutations inside effects (`react-hooks/immutability`) — write refs only in event handlers/functions, mirror the existing patterns (`rowsRef`/`dirtyRef` in sheet-client).
- `useCallback` for anything used in effect deps (e.g. `flush`, `buildPayload` in sheet-client).

## Database

- Migrations in `supabase/migrations/` are append-only — never edit applied files; add `0004_...sql` and `db push`.
- RLS on every table; member management runs through security-definer RPCs (`add_company_member`, `update_company_member`, `remove_company_member`). The anon role only gets SELECT grants — writes flow through the authenticated role's RLS.
- "Today" is `Asia/Colombo` (`lib/date.ts`); `sheet_date` is a date in that zone.

## Tests

- Vitest, `node` environment, `tests/*.test.ts`. DOM-dependent tests stub `document`/`localStorage` (see `tests/theme.test.ts`). No jsdom/testing-library — don't add component-render tests.
- Keep `tests/css-parity.test.ts` and `tests/theme.test.ts` green when touching styles or theme.

## Branches

- `main` = stable, deploy-ready; `dev` = development integration. Work on `dev` (or branches off it), never commit to `main` directly. See `CONTRIBUTING.md`.