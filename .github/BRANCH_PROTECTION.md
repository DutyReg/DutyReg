# Branch Protection Settings

These settings must be applied in the GitHub repository (Settings → Branches) to enforce the ladder `new-branch → dev → stable → main` at the repository level. The `.github/workflows/enforce-branch-ladder.yml` CI job provides the code-level enforcement; these settings provide the repository-level enforcement.

## `dev`

- **Branch protection rules**: Enabled
- **Require a pull request before merging**: Yes
  - Require approvals: 1
- **Require status checks to pass before merging**: Yes
  - Required checks: `Quality, Security, and Build` (from `ci.yml`), `Enforce Branch Ladder`
- **Restrict which branches can push to this branch**: No (any feature/fix/chore branch can merge here via PR)
- **Allow force pushes**: No
- **Allow deletions**: No

## `stable`

- **Branch protection rules**: Enabled
- **Require a pull request before merging**: Yes
  - Require approvals: 1
- **Require status checks to pass before merging**: Yes
  - Required checks: `Quality, Security, and Build`, `Enforce Branch Ladder`
- **Restrict pushes that create files larger than 100 MB**: Yes
- **Restrict which branches can push to this branch**: Yes — only `dev` (and `main` for back-merge if needed, but ladder prevents that)
- **Allow force pushes**: No
- **Allow deletions**: No

## `main`

- **Branch protection rules**: Enabled
- **Require a pull request before merging**: Yes
  - Require approvals: 1
- **Require status checks to pass before merging**: Yes
  - Required checks: `Quality, Security, and Build`, `Enforce Branch Ladder`
- **Restrict pushes that create files larger than 100 MB**: Yes
- **Restrict which branches can push to this branch**: Yes — only `stable` (plus `hotfix` exception handled by label check in CI)
- **Allow force pushes**: No
- **Allow deletions**: No

## Enforcement summary

| From | To | Allowed? | Mechanism |
|---|---|---|---|
| Any feature/fix/chore | `dev` | Yes | Open PR |
| `dev` | `stable` | Yes | PR + status checks |
| `stable` | `main` | Yes | PR + status checks |
| Any | `stable` (not `dev`) | **Blocked** | CI (`enforce-branch-ladder.yml`) + GitHub branch restriction |
| Any | `main` (not `stable`, not `hotfix`) | **Blocked** | CI (`enforce-branch-ladder.yml`) + GitHub branch restriction |
| Any | `dev` / `stable` / `main` (direct push) | **Blocked** | GitHub branch protection (no direct pushes) |

## Hotfix exception

Per `CONTRIBUTING.md`: emergency PRs labeled `hotfix` may go straight to `main`. After merging, a follow-up PR (`hotfix-branch` → `dev`) must be opened immediately.
