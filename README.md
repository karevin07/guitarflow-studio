
# GuitarFlow Studio

GuitarFlow Studio is a professional-grade, web-based guitar tablature editor designed for songwriters and musicians. It provides a seamless interface for creating, editing, managing, and visualizing guitar music.

GuitarFlow Studio 是一個專業級的網頁版吉他譜編輯器，專為詞曲創作者和音樂家設計。它提供了一個流暢的介面，用於創作、編輯、管理和視覺化吉他音樂。

## Features (功能)

### 🎸 Professional Tab Editor (專業樂譜編輯器)
- **Intuitive Grid**: 6-string tablature grid with 16th note resolution per measure.
- **Keyboard Navigation**:
  - `Arrow Keys`: Navigate strings and beats freely.
  - `0-24`: Smart numeric input for frets (automatically handles rapid double-digit entry like '12').
  - `Tab`: Jump to the next beat point.
  - `Enter`: Jump to the next measure.
  - `Backspace`: Delete notes.
- **Smart Measures**: Add, delete, or copy measures. Organize songs into sections (Intro, Verse, Chorus).
- **Lyrics Integration**: Add lyrics directly beneath the tablature.
- **Interactive Fretboard**: Visual fretboard with audio playback via Web Audio API.

### 🎼 Chord Management (和弦管理)
- **Visual Library**: Drag-and-drop chord library with standard and custom chords.
- **Global Chord Library**: Pre-seeded standard chords served from the backend API.
- **Chord Detector**: Automatically detects and names chords based on the notes entered in the tab.
- **Custom Chords**: Create your own chord shapes with a visual designer and save them per song.

### 👁️ Preview, Playback & Export (預覽、播放與匯出)
- **Clean Mode**: View your song in a read-only, clean format optimized for practice.
- **Transposition**: Instantly transpose the entire song (notes and chord names) up or down.
- **Playback**: Play back tablature with BPM control, loop, metronome, and volume.
- **Export**: Export songs as `.gflow` files or MIDI.
- **Cloud Save**: Songs are persisted to the backend (PostgreSQL in Docker, SQLite for local-only dev).

---

## Quick Start (快速開始)

### Option A: Docker (Recommended)

Requires Docker and Docker Compose.

```bash
make docker          # or: docker compose up -d --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:3003 |
| Backend API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |

Stop services:

```bash
make docker-down     # or: docker compose down
```

### Option B: Local Development

Requires Python 3.10+, [uv](https://docs.astral.sh/uv/), and Node.js 18+.

```bash
make install         # install backend + frontend dependencies

# Terminal 1 — backend (SQLite by default)
make dev-backend     # http://localhost:8000

# Terminal 2 — frontend
make dev-frontend    # http://localhost:5173
```

For local frontend, set `VITE_API_URL=http://localhost:8000/api` in `frontend/.env`.

Run database migrations after first install:

```bash
make migrate
```

---

## Getting Started (開始使用)

1. **Create a Song**: Click "Create New" on the home screen.
2. **Edit**:
   - Use your mouse or keyboard to select a cell.
   - Type numbers to add notes.
   - Drag chords from the sidebar to the top of the measure.
3. **Sections**: Add new sections using the sidebar (e.g., "Chorus") to keep your song organized.
4. **Save**: Click Save to persist your song to the backend API.

---

## Tech Stack (技術棧)

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| UI | Tailwind CSS (via CDN), Lucide React |
| Backend | Django 5, Django REST Framework |
| Database | PostgreSQL 15 (Docker) / SQLite (local dev) |
| Package Management | uv (Python), npm (Node) |
| Deployment | Docker Compose |

---

## Development Commands

Run `make help` to see all available targets.

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies |
| `make dev-backend` | Start Django dev server |
| `make dev-frontend` | Start Vite dev server |
| `make migrate` | Run Django migrations |
| `make test` | Run backend + frontend tests |
| `make build` | Build frontend production bundle |
| `make docker` | Start full stack with Docker Compose |

See [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) for architecture details and [docs/BACKEND_DEVELOP.md](docs/BACKEND_DEVELOP.md) for backend development notes.

---

## Third-Party Licenses (第三方授權)

Guitar Pro import uses [@coderline/alphatab](https://github.com/CoderLine/alphaTab) (MPL-2.0), lazy-loaded separately from the `.gflow` editor.

| Document | Description |
|----------|-------------|
| [frontend/NOTICE.md](frontend/NOTICE.md) | Third-party component list |
| [docs/MPL_LICENSING.md](docs/MPL_LICENSING.md) | MPL-2.0 analysis and compliance checklist |

---

*Built with passion for guitarists.*
