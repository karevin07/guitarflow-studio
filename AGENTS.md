# AGENTS.md

Guidance for coding agents working in this repository.

## Project

GuitarFlow Studio: a web app for writing and practising guitar songs.

- `frontend/` — React + TypeScript + Vite. Editor, playback, music theory and chord-voicing logic all run in the browser.
- `backend/` — Django + Django REST Framework with token auth. Stores songs, sections, custom chords and setlists; every query is scoped to the signed-in owner.
- Design decisions and trade-offs: `docs/DESIGN.md`. API and settings: `docs/BACKEND_DEVELOP.md`.

User-facing text and the docs are Traditional Chinese (zh-TW); keep new copy in the same voice. Code comments are English.

## Commands

`make help` lists every target. The usual ones:

```bash
make docker          # full stack on http://localhost:3003 (dev servers, bind-mounted)
make test            # Django tests + Vitest
make format-frontend # tsc --noEmit
make build           # frontend production build
```

Browser tests run against an isolated Compose project so they never touch the everyday database; the commands are in `README.md`. CI (`.github/workflows/ci.yml`) runs backend tests, frontend tests, type check, build and the Playwright suite on pushes and PRs to `main`.

## Two repositories

This repo is private. `karevin07/guitarflow-studio` is a public mirror with the same Git history.

| remote | repo | use |
| --- | --- | --- |
| `origin` | private | everyday work |
| `public` | `guitarflow-studio` | published copy |

Everything committed here can end up public, so:

- Never commit private details: real IP addresses, host or tailnet names, personal email, cloud project numbers, OAuth client IDs or secrets. Machine settings go in the ignored `.env.*.local`, notes in the ignored `docs/notes/`. Use example values in docs (`100.64.0.10`, `guitarflow-dev`).
- Commit with the GitHub noreply address (set in this repo's local git config), not a personal one.
- Do not add session links (such as a `Claude-Session:` line) to commit messages. A `Co-Authored-By:` trailer is fine.
- Pushes to `public` go through a pre-push check (`make install-hooks`, `scripts/check-public-push.sh`; private patterns live in the untracked `.git/info/public-push-deny`). Never bypass it with `--no-verify`; fix the commit instead.

## Releasing

Push to `public` or release only when the user asks.

1. Write `docs/releases/<version>.md` (it becomes the GitHub Release notes; use absolute URLs pinned to the tag), commit it and push `main` to `origin`.
2. `make release VERSION=v0.2.0 DRY_RUN=1` to run the checks without changing anything.
3. `make release VERSION=v0.2.0` pushes `main` to `public`, tags, pushes the tag to both remotes and creates the Release with `gh`.

Full procedure, including what to do when the check blocks a push: `docs/RELEASING.md`.

## Things that need the user's say-so

- Rewriting history or force-pushing either remote.
- Changing either repository's settings or visibility.
- Data migrations that delete rows; check what exists in the running database first.
