# VIA Project

Read-only multi-repo code chat. Users ask questions about locally cloned GitHub repos via the Cursor SDK (`mode: "plan"` + write-denying hooks). Histories live in MongoDB; clones sync to `main` on demand and nightly.

## Stack

- **App:** Express + TypeScript serves the API and the React UI in one process
- **UI:** React + Vite (VIA Site Manager / OPF console theme)
- **DB:** MongoDB
- **AI:** `@cursor/sdk` local agents
- **GitHub:** `gh` CLI using `GH_TOKEN` / `GITHUB_TOKEN` (no direct `git` for sync)

## Prerequisites

- Node.js **22.13+**
- MongoDB (or `docker compose up -d`)
- [GitHub CLI](https://cli.github.com/) (`gh`) authenticated
- Cursor API key ([Dashboard → Integrations](https://cursor.com/dashboard/integrations))

## Setup

```bash
cp .env.example .env
# edit .env: CURSOR_API_KEY, GH_TOKEN, JWT_SECRET, admin credentials

docker compose up -d   # Mongo
npm install
npm run dev
```

- App (UI + API): http://localhost:4000

Default login comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

The repo catalog is fixed in `config/repos.json` (11 stewopf repos). There is no UI or API to add/delete repos — only sync to `main`.

Production:

```bash
npm run build
npm start
```

`npm start` requires both `client/dist` and `server/dist` from the build step.

## Diligence features

- **Playbooks** (`/playbooks`) — architecture, security, data flow, ops, vendor lock-in, key-person
- **Export memo** — markdown download + print/PDF HTML from any chat
- **Cross-repo map** (`/map`) — curated VIA service relationships
- **Evidence trail** — file citations extracted and shown under assistant answers
- **Audit** (`/audit`) — actions with repo SHA snapshots
- **Okta SSO** — set `OKTA_ORG_URL` + `OKTA_CLIENT_ID` (see `.env.example`); password login remains available

1. Every agent run uses `mode: "plan"`.
2. Prompts are wrapped with an Ask/read-only preamble.
3. Service hooks under `server/cursor-hooks/` deny Write/Edit/Delete and mutating shell (installed into `CURSOR_HOME`).
4. Local sandbox enabled (`sandboxOptions.enabled: true`).

## Repo sync

- UI: **Repos → Update to main / Update all**
- Cron: `CRON_SYNC` (default `0 2 * * *`)
- Strategy (gh CLI only): `gh repo clone` for first sync; `gh repo sync --source <owner/repo> --branch main --force` thereafter; SHA via `gh api`


## Okta

Optional SSO: set `OKTA_ORG_URL` + `OKTA_CLIENT_ID` (and related vars in `.env.example`). Redirect URIs should use the same origin as the app (`http://localhost:4000` in local dev).
