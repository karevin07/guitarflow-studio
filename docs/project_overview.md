# GuitarFlow Studio Project Overview

GuitarFlow Studio is a professional-grade web-based guitar tablature editor built with React, Django REST Framework, SQLite, and Docker.

---

## 1. Directory Structure

The project has been refactored to separate frontend and backend layers:

```
guitar-flow/
├── docker-compose.yml     # Docker Compose orchestration configurations
├── .gitignore             # Git exclusion lists (now ignoring python artifacts & db.sqlite3)
├── README.md              # Project documentation
├── metadata.json          # Project descriptor
├── frontend/              # React frontend (Vite)
│   ├── App.tsx            # React application layout & API calls integration
│   ├── index.html         # HTML entry point
│   ├── index.tsx          # React mount entry point
│   ├── package.json       # Node package manager configurations
│   ├── tsconfig.json      # TypeScript options
│   ├── vite.config.ts     # Vite configurations (host bound to 0.0.0.0, port 3000)
│   ├── Dockerfile         # Node.js slim container builder
│   ├── components/        # UI components (Home, TabMeasure, ChordDiagram, etc.)
│   └── services/          # Services (api.ts: Django REST client)
└── backend/               # Django backend
    ├── manage.py          # Django execution utility
    ├── pyproject.toml     # uv package configuration
    ├── uv.lock            # uv lock file
    ├── db.sqlite3         # SQLite database file (host persisted)
    ├── Dockerfile         # Python slim builder with uv package resolver
    ├── core/              # Django settings & root router config
    └── guitarflow/        # Core models, REST views, and serializers
```

---

## 2. Port & Volume Mapping

### Service Configuration

| Service | Container Port | Host Port | Mounted Volumes |
| :--- | :--- | :--- | :--- |
| **`frontend`** | `3000` | `3003` | `./frontend:/app`, `/app/node_modules` |
| **`backend`** | `8000` | `8000` | `./backend:/app` |

* **Host PERSISTENCE**: Since `./backend` is mounted, the SQLite file `backend/db.sqlite3` lives on the host and preserves your song library data across container builds/destructions.
* **LIVE RELOAD**: Bind mounts are configured for both services, meaning changes in the source code will hot-reload immediately.

---

## 3. Docker Compose Management

### Commands

* **Start Services (Background)**:
  ```bash
  docker compose up --build -d
  ```
* **Stop Services**:
  ```bash
  docker compose down
  ```
* **View Run logs**:
  ```bash
  docker compose logs -f
  ```
* **Check Status**:
  ```bash
  docker compose ps
  ```
