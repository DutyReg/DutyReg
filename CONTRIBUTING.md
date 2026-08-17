# Contributing to DayMark

Thanks for contributing. This project is GPL-3.0 licensed — by contributing you agree to the license terms in `LICENSE`.

## Branch strategy

| Branch | Purpose |
| ------ | ------- |
| `main` | **Stable.** Only finalized, verified updates land here. Code on `main` is deploy-ready. |
| `dev`  | **Development.** All development work is integrated here first. |

Rules:

1. **Never commit to `main` directly.** Development happens on `dev` (or short-lived feature branches off `dev`).
2. Feature branches: `dev/feature-name` or `fix/description` — branched from `dev`, merged back into `dev` once done.
3. **Merging to stable:** `dev` is merged to `main` only when the work is finalized — all checks pass, the manual QA pass is done, and the change set is intentional (no half-finished work).
4. Hotfixes to a released bug may be committed on `main` only in an emergency, and must immediately be merged back into `dev`.

## Getting started

```bash
https://github.com/ravijaanthony/Attendance.git
cd Attendance
git checkout dev
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev                  # http://localhost:3000
```

See `README.md` → Getting started for the full Supabase setup (project, migrations, providers).

## Checks before every PR

Run all of these locally — CI runs the same commands:

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm run test        # Vitest unit tests
npm run build       # production build
```

CI also requires the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` repository secrets.

## Commit messages

Short, imperative, lowercase-prefixed lines, matching the existing history:

- `feat: add realtime refresh to settings`
- `fix: flush pending attendance on navigation`
- `update: optimise loading speed`
- `chore: bump dependencies`

One logical change per commit. Don't commit `.env.local`, build output, or unrelated changes.

## Database migrations

- Migrations live in `supabase/migrations/` and are **append-only**: never edit an already-applied migration (remote databases are already at that state).
- Add a new numbered file (`0004_<name>.sql`) for any schema, RLS, function, or realtime publication change, and apply it with:
  ```bash
  supabase db push --password "$YOUR_DB_PASSWORD"
  ```
- Every new table must enable RLS and ship its policies in the same migration. Realtime changes must go into the `supabase_realtime` publication (`alter publication ... add table`).

## Code conventions

- **Server components by default**; pages fetch data server-side. Mutations go through server actions in `app/actions/` and must call `revalidatePath(...)` on success so the page updates without a manual refresh.
- **Destructive actions** (delete site/worker/member) must use `components/confirm-dialog.tsx` — never a one-click delete.
- **Client components** live in `components/`; heavy client logic (attendance sheet) stays in self-contained client components.
- **Styling:** Tailwind v4 with theme tokens from `app/globals.css` (`@theme`). No raw hex values, no `amber-*` utilities, no raw `bg-white` in light-mode surfaces — the `tests/css-parity.test.ts` regression tests enforce this. Dark mode is class-based (`.dark` + `dark:` variants); use the existing tokens (`ink`, `surface`, `present`, `absent`, `primary`, `inverse-text`, …).
- **No comments unless they explain a non-obvious decision.**
- React 19 lint rules are strict: no `setState` in effects, no ref mutations inside effects (the repo's patterns — e.g. `useSyncExternalStore` for theme, handler-written refs for the attendance autosave — exist to satisfy them). Follow existing patterns instead of working around them.
- Timezone: "today" is always `Asia/Colombo` (`lib/date.ts`).

## Tests

- Vitest, `node` environment, `tests/*.test.ts` — no DOM by default; the existing tests stub `document`/`localStorage` where needed.
- Keep the css-parity and theme tests green when touching styles or the theme.
- Run `npm run test` before pushing.

## Questions?

Open an issue or ask in the PR. Keep PRs small and focused on one change.
