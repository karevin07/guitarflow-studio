# Backend Development Guide: Django REST Framework + PostgreSQL

This document describes the current backend implementation for GuitarFlow Studio.

本文檔說明 GuitarFlow Studio 目前的後端實作方式。

---

## 1. Technology Stack (技術棧)

| Component | Technology | Description |
|-----------|------------|-------------|
| **Language** | Python 3.10+ | Managed via [uv](https://docs.astral.sh/uv/) |
| **Web Framework** | Django 5 | Admin panel, ORM, migrations |
| **API Layer** | Django REST Framework | RESTful CRUD for songs and global chords |
| **Database (Docker)** | PostgreSQL 15 | Primary storage in Docker Compose |
| **Database (local dev)** | SQLite | Fallback when `DB_ENGINE` is not `postgres` |
| **CORS** | django-cors-headers | Allows frontend on ports 3003 and 5173 |

---

## 2. Project Structure (專案結構)

```text
backend/
├── manage.py
├── pyproject.toml          # uv dependencies
├── .env.example            # Environment variable template
├── core/
│   ├── settings.py         # DB, CORS, installed apps
│   ├── urls.py             # Root URL routing
│   ├── wsgi.py
│   └── asgi.py
└── guitarflow/
    ├── models.py           # GuitarSong, TabSection, CustomChord, GlobalChord
    ├── serializers.py      # camelCase ↔ snake_case mapping
    ├── views.py            # ViewSets
    ├── urls.py             # /api/songs/, /api/global-chords/
    ├── admin.py
    ├── tests.py            # API integration tests
    └── migrations/
```

---

## 3. Data Models (資料模型)

### GuitarSong
- `title`, `created_at`, `last_modified`, `transpose_offset`
- Has many `TabSection` and `CustomChord` (cascade delete)

### TabSection
- Nested under a song; ordered by `order` field
- `measures`, `chords`, `lyrics` stored as JSONField (matches frontend 3D/2D arrays)

### CustomChord
- Per-song custom chord shapes (`name`, `frets` JSON array)

### GlobalChord
- Pre-seeded standard chords (C, G, Am, etc.)
- `managed = False` — table created by `postgres-init/init.sql`, not Django migrations
- Read-only via `/api/global-chords/`

### Frontend ↔ Backend naming

Serializers use camelCase aliases to match the React frontend:

| Frontend (TypeScript) | Backend (Python) |
| :--- | :--- |
| `lastModified` | `last_modified` |
| `transposeOffset` | `transpose_offset` |
| `customChords` | `custom_chords` |

---

## 4. API Endpoints (API 端點)

All routes are prefixed with `/api/`.

| Method | Path | ViewSet | Description |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/songs/` | `GuitarSongViewSet` | List / create songs |
| `GET/PUT/DELETE` | `/songs/{id}/` | `GuitarSongViewSet` | Retrieve / update / delete |
| `GET` | `/global-chords/` | `GlobalChordViewSet` | List standard chords (read-only) |

### Update strategy

Song updates use **diff-and-patch**: existing sections/chords are updated in place (PKs preserved), omitted sections are deleted, and new ones are created. See `guitarflow/tests.py` for test coverage.

---

## 5. Database Configuration (資料庫設定)

Configured in `core/settings.py`:

```python
# PostgreSQL when DB_ENGINE=postgres or DB_NAME is set
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'guitarflow'),
        ...
    }
}

# SQLite fallback for local dev without Docker
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

### Migrations

```bash
make migrate           # apply migrations
make makemigrations    # create new migration files
```

Global chord data is seeded via `postgres-init/init.sql` when the PostgreSQL container starts for the first time.

---

## 6. Development Commands (開發指令)

```bash
# Install dependencies
cd backend && uv sync

# Run dev server
make dev-backend       # http://localhost:8000

# Run tests
make test-backend      # 3 API tests in guitarflow/tests.py

# Django admin
cd backend && .venv/bin/python manage.py createsuperuser
# Then visit http://localhost:8000/admin/
```

---

## 7. Frontend Integration (前端整合)

The frontend communicates via `frontend/services/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
```

Song library state is managed by `hooks/useSongLibrary.ts`, which calls the REST API for CRUD operations. Theme preference is still stored in `localStorage` (`guitarflow-theme`).

---

## 8. Docker Deployment (Docker 部署)

The backend Dockerfile uses uv to install dependencies. In `docker-compose.yml`:

- Backend waits for PostgreSQL health check before starting
- Runs `python manage.py migrate` on startup
- Health check hits `GET /api/songs/`

Environment variables are set in `docker-compose.yml` (see `backend/.env.example` for reference).
