# GuitarFlow Studio Project Overview

GuitarFlow Studio is a professional-grade web-based guitar tablature editor built with React, Django REST Framework, PostgreSQL, and Docker.

---

## 1. Directory Structure

The project separates frontend and backend layers:

```
guitar-flow/
├── docker-compose.yml     # Docker Compose orchestration (db + backend + frontend)
├── Makefile               # Project automation (install, dev, test, docker)
├── postgres-init/         # PostgreSQL init scripts (global chord seed data)
│   └── init.sql
├── README.md
├── metadata.json
├── frontend/              # React frontend (Vite)
│   ├── App.tsx            # Main app layout, editor & playback
│   ├── index.html
│   ├── index.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts     # Dev server on port 3000 (5173 when run locally)
│   ├── Dockerfile
│   ├── .env               # VITE_API_URL for backend API
│   ├── components/        # UI (Home, TabMeasure, ChordDiagram, Fretboard, etc.)
│   ├── hooks/             # useEditorState, useSongLibrary, useKeyboardShortcuts
│   └── services/          # api.ts (REST client), midiHelper.ts
└── backend/               # Django backend
    ├── manage.py
    ├── pyproject.toml     # uv package configuration
    ├── uv.lock
    ├── .env.example       # Environment variable template
    ├── Dockerfile
    ├── core/              # Django settings & root URL config
    └── guitarflow/        # Models, serializers, views, tests
```

---

## 2. Port & Volume Mapping

### Service Configuration

| Service | Container Port | Host Port | Mounted Volumes |
| :--- | :--- | :--- | :--- |
| **`db`** | `5432` | `5432` | `postgres_data` (named volume), `./postgres-init` |
| **`backend`** | `8000` | `8000` | `./backend:/app` |
| **`frontend`** | `3000` | `3003` | `./frontend:/app`, `/app/node_modules` |

### Data Persistence

- **Docker (production-like)**: Song data is stored in PostgreSQL via the `postgres_data` Docker volume. Global chords are seeded from `postgres-init/init.sql` on first startup.
- **Local dev (no Docker)**: Backend falls back to SQLite (`backend/db.sqlite3`) when `DB_ENGINE` is not set to `postgres`.
- **Live reload**: Bind mounts on frontend and backend enable hot reload during development.

---

## 3. API Endpoints

Base URL: `http://localhost:8000/api/`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/songs/` | List all songs |
| `POST` | `/songs/` | Create a song |
| `GET` | `/songs/{id}/` | Get a song |
| `PUT` | `/songs/{id}/` | Update a song (diff-and-patch on sections/chords) |
| `DELETE` | `/songs/{id}/` | Delete a song |
| `GET` | `/global-chords/` | List pre-seeded standard chords |

---

## 4. Docker Compose Management

### Commands

```bash
# Start services (background)
make docker
# or: docker compose up -d --build

# Stop services
make docker-down
# or: docker compose down

# View logs
make docker-logs
# or: docker compose logs -f

# Check status
docker compose ps
```

### Environment Variables (Backend)

Copy `backend/.env.example` to `backend/.env` for local overrides. In Docker, variables are set in `docker-compose.yml`:

| Variable | Default (Docker) | Description |
| :--- | :--- | :--- |
| `DB_ENGINE` | `postgres` | Database engine |
| `DB_NAME` | `guitarflow` | PostgreSQL database name |
| `DB_HOST` | `db` | PostgreSQL host |
| `DJANGO_CORS_ORIGINS` | — | Comma-separated allowed origins |

---

## 5. Local Development (without Docker)

```bash
make install
make migrate
make dev-backend    # Terminal 1 — http://localhost:8000
make dev-frontend   # Terminal 2 — http://localhost:5173
make test           # Run backend API tests
```

Frontend API URL is configured via `frontend/.env`:

```
VITE_API_URL=http://localhost:8000/api
```
