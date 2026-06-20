# GuitarFlow Studio Architecture & Structure Diagrams

This document contains visual diagrams mapping out the project's folder layout and its system architecture.

---

## 1. Directory Structure Chart

This graph visualizes the files and directories inside the workspace.

```mermaid
graph TD
    root["guitar-flow (Root)"]
    root --> compose["docker-compose.yml"]
    root --> makefile["Makefile"]
    root --> pginit["postgres-init/init.sql"]
    root --> readme["README.md"]
    root --> meta["metadata.json"]

    root --> frontendDir["frontend/"]
    frontendDir --> f_docker["Dockerfile"]
    frontendDir --> f_config["vite.config.ts"]
    frontendDir --> f_pkg["package.json"]
    frontendDir --> f_env[".env (VITE_API_URL)"]
    frontendDir --> f_src["App.tsx, index.tsx, types.ts"]
    frontendDir --> f_comp["components/ (TabMeasure, Fretboard, Home, etc.)"]
    frontendDir --> f_hooks["hooks/ (useEditorState, useSongLibrary)"]
    frontendDir --> f_serv["services/ (api.ts, midiHelper.ts)"]

    root --> backendDir["backend/"]
    backendDir --> b_docker["Dockerfile"]
    backendDir --> b_manage["manage.py"]
    backendDir --> b_toml["pyproject.toml"]
    backendDir --> b_core["core/ (Django Settings & Routing)"]
    backendDir --> b_app["guitarflow/ (Models, Serializers, Views, Tests)"]
```

---

## 2. System Architecture

This chart maps how the browser interacts with Docker containers and how data flows through Django REST Framework to PostgreSQL.

```mermaid
sequenceDiagram
    autonumber
    actor User as Guitarist / Songwriter
    participant Browser as Browser UI (React SPA)
    participant Vite as Frontend Container (Port 3003)
    participant Django as Backend Container (Port 8000)
    participant Postgres as PostgreSQL (Port 5432)
    actor AdminUser as Administrator

    %% Frontend Assets loading
    User->>Browser: Access http://localhost:3003
    Browser->>Vite: Request assets
    Vite-->>Browser: Return React App bundle (JS/HTML/CSS)

    %% API data lifecycle
    Browser->>Django: GET /api/songs/ (fetch song list)
    Django->>Postgres: Query GuitarSong + related tables (Django ORM)
    Postgres-->>Django: Return song records
    Django-->>Browser: Return JSON song list

    %% Global chords
    Browser->>Django: GET /api/global-chords/
    Django->>Postgres: Query guitarflow_globalchord table
    Postgres-->>Django: Return chord library
    Django-->>Browser: Return JSON chord list

    %% Save lifecycle
    User->>Browser: Edit tab / Add section / Click Save
    Browser->>Django: PUT /api/songs/{id}/ (Send updated song JSON)
    Note over Django: serializers.py diff-and-patches<br/>Sections & CustomChords
    Django->>Postgres: Update / insert / delete related records
    Postgres-->>Django: Confirm transaction
    Django-->>Browser: Return synchronized song JSON

    %% Admin Control
    AdminUser->>Django: Access http://localhost:8000/admin/
    Django->>Postgres: Load / edit tables
    Postgres-->>Django: Persist updates
    Django-->>AdminUser: Render Django Admin Panel
```

---

## 3. Docker Service Topology

```mermaid
graph LR
    subgraph Host
        FE["frontend :3003"]
        BE["backend :8000"]
        DB["postgres :5432"]
    end

    User((User)) --> FE
    FE -->|HTTP /api/*| BE
    BE -->|SQL| DB
    DB -->|init.sql seed| GC["global chords table"]
```

| Service | Image | Depends On | Health Check |
| :--- | :--- | :--- | :--- |
| `db` | postgres:15-alpine | — | `pg_isready` |
| `backend` | guitar-flow-backend | `db` (healthy) | `GET /api/songs/` |
| `frontend` | guitar-flow-frontend | `backend` (healthy) | — |
