# GuitarFlow Studio Architecture & Structure Diagrams

This document contains visual diagrams mapping out the project's folder layout and its system architecture.

---

## 1. Directory Structure Chart

This graph visualizes the files and directories inside the restructured workspace.

```mermaid
graph TD
    root["guitar-flow (Root)"]
    root --> compose["docker-compose.yml"]
    root --> gitignore[".gitignore"]
    root --> readme["README.md"]
    root --> meta["metadata.json"]
    
    root --> frontendDir["frontend/"]
    frontendDir --> f_docker["Dockerfile"]
    frontendDir --> f_config["vite.config.ts"]
    frontendDir --> f_pkg["package.json"]
    frontendDir --> f_src["src files (App.tsx, index.tsx, types.ts)"]
    frontendDir --> f_comp["components/ (TabMeasure, Home, ChordDiagram, etc.)"]
    frontendDir --> f_serv["services/ (api.ts)"]
    
    root --> backendDir["backend/"]
    backendDir --> b_docker["Dockerfile"]
    backendDir --> b_manage["manage.py"]
    backendDir --> b_toml["pyproject.toml"]
    backendDir --> b_db["db.sqlite3 (Persisted DB)"]
    backendDir --> b_core["core/ (Django Settings & Routing)"]
    backendDir --> b_app["guitarflow/ (ORM Models, Serializers, Views)"]
```

---

## 2. Frontend & Backend System Architecture

This chart maps out how the browser clients interact with the Docker containers and how data flows through Django REST Framework down to SQLite.

```mermaid
sequenceDiagram
    autonumber
    actor User as Guitarist / Songwriter
    participant Browser as Browser UI (React SPA)
    participant Vite as Frontend Container (Port 3003)
    participant Django as Backend Container (Port 8000)
    database SQLite as SQLite DB (db.sqlite3)
    actor AdminUser as Administrator

    %% Frontend Assets loading
    User->>Browser: Access http://localhost:3003
    Browser->>Vite: Request assets
    Vite-->>Browser: Return React App bundle (JS/HTML/CSS)
    
    %% API data lifecycle
    Browser->>Django: GET /api/songs/ (fetch song list)
    Django->>SQLite: Query GuitarSong table (Django ORM)
    SQLite-->>Django: Return song records
    Django-->>Browser: Return JSON Song list
    
    %% Save lifecycle
    User->>Browser: Edit tab / Add section / Click Save
    Browser->>Django: PUT /api/songs/{id}/ (Send updated song JSON)
    Note over Django: serializers.py updates nested<br/>Sections & CustomChords
    Django->>SQLite: Delete old and insert new related records
    SQLite-->>Django: Confirm transaction
    Django-->>Browser: Return synchronized Song JSON
    
    %% Admin Control
    AdminUser->>Django: Access http://localhost:8000/admin/
    Django->>SQLite: Load/Edit tables (inlines supported)
    SQLite-->>Django: Persist updates
    Django-->>AdminUser: Render Django Admin Panel
```
