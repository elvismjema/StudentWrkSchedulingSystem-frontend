# Contributing — SEV Project Frontend

## First-time setup

After cloning, run the hook installer once:

```sh
sh scripts/setup-hooks.sh
```

This activates the enforcement hooks in `.githooks/`. Without this step, the hooks do nothing and the rules below are honor-system only.

The hooks enforce two things locally:
- **Commit-msg hook**: rejects any commit containing AI attribution (`Co-Authored-By: Claude`, `Generated with ChatGPT`, etc. — see `AGENTS.md` for the full list)
- **Pre-push hook**: blocks direct pushes to `dev` and `main`

See `AGENTS.md` for the full AI-agent contribution policy.

## Commit Conventions

Use conventional commit format:

```
type(scope): short description
```

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`, `build`, `ci`

Scopes (optional): `mobile`, `desktop`, `deploy`, `auth`, `clock`, `schedule`, `trade`, `pwa`

Examples:
```
feat(mobile): add pull-to-refresh on dashboard
fix(deploy): add missing env var to CI workflow
refactor(schedule): extract shift card into component
```

**No AI tool attributions in commits.** No `Co-Authored-By` lines referencing AI assistants, copilots, or code generators. Commits should reflect the human author only. The `commit-msg` hook in `.githooks/` will reject any commit that violates this — see `AGENTS.md` for the full policy and the list of blocked tools.

## Branch Strategy

- `dev` — single source of truth for active development
- `main` — stable releases
- Feature branches: `feat/short-description`
- Fix branches: `fix/short-description`

Always branch from `dev`, merge back into `dev`.

## Environment Variables

`.env` is gitignored. Each environment needs these set manually:

| Variable | Purpose | Required |
|---|---|---|
| `VITE_MOBILE_SHELL_ENABLED` | Activates mobile shell layout | Yes |
| `VITE_APP_CLIENT_ID` | Google OAuth client ID | Yes |
| `VITE_APP_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `VITE_APP_REFRESH_TOKEN` | Google OAuth refresh token | Yes |

Production env vars are written by GitHub Actions (`.github/workflows/vue-deploy.yml`). If you add a new `VITE_*` variable, update the workflow too.

## Mobile Development

Mobile layout activates when `VITE_MOBILE_SHELL_ENABLED=true` AND the device screen is mobile-width (detected via Vuetify `useDisplay()`). Override with query param `?mobileShell=1` or `?mobileShell=0`.

Key files:
- `src/views/StudentShell.vue` — mobile/desktop layout switcher
- `src/views/StudentMobile.vue` — mobile shell (nav, top bar, transitions)
- `src/config/studentMobileNavigation.js` — tab definitions (single source of truth)
- Views with mobile templates: `StudentDashboard.vue`, `StudentSchedule.vue`
