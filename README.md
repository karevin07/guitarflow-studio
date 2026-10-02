
# GuitarFlow Studio

GuitarFlow Studio 是一個網頁版吉他創作與練習工具。主要入口為創作、練習與和弦庫；歌曲可儲存在個人帳號中，也可匯入 Guitar Pro 或 MusicXML 樂譜供閱譜與播放。

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
- **和弦庫**：搜尋標準與自訂和弦，查看開放、高低把位及替代指法。
- **和弦辨識**：依輸入音符列出候選名稱，由使用者確認後寫入譜面，不改動原本指法。
- **指法規劃**：練習頁可為整首歌自動挑選指法並儲存，也可個別鎖定指法。

### 👁️ Preview, Playback & Export (預覽、播放與匯出)
- **Practice Mode**: Read-only score, playback, auto-scroll and chord guidance for practice.
- **Transposition**: Instantly transpose the entire song (notes and chord names) up or down.
- **Playback**: Play back tablature with BPM control, loop, metronome, and volume.
- **Export**: Export songs as `.gflow` files or MIDI.
- **Import**: Preview and persist Guitar Pro / MusicXML scores using alphaTab.
- **Account Save**: Songs belong to the signed-in user and persist to the backend (PostgreSQL in Docker, SQLite for local-only dev).

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

The frontend calls the relative path `/api`, and the Vite dev server proxies it to Django (`API_PROXY_TARGET`, default `http://localhost:8000`), so no `frontend/.env` is needed locally. Set `VITE_API_URL` only to call a backend directly.

Run database migrations after first install:

```bash
make migrate
```

---

## Getting Started (開始使用)

1. **登入或註冊**，從歌曲庫建立歌曲，或匯入現有樂譜。
2. **創作**：
   - Use your mouse or keyboard to select a cell.
   - Type numbers to add notes.
   - Drag chords from the sidebar to the top of the measure.
3. **練習**：切換到練習頁播放、循環段落，或用「自動配置」規劃和弦指法。
4. **和弦庫**：查找不同把位的按法；回到歌曲後按 Save 儲存變更。

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

### Browser E2E tests

Use the isolated test Compose project. Its frontend, API and database bind to `127.0.0.1:3303`, `127.0.0.1:18000` and `127.0.0.1:15432`, so it does not take over the normal Docker service or Tailscale endpoint.

```bash
docker compose --env-file .env.e2e.example -p guitarflow-e2e up -d --build --wait
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
cd ..
docker compose --env-file .env.e2e.example -p guitarflow-e2e down -v --remove-orphans
```

The last command deletes only the isolated `guitarflow-e2e` containers and test database volume. CI runs the same browser suite. It covers account creation and save/reopen, chord-candidate confirmation, practice voicing planning and playback, MusicXML preview/import, Guitar Pro 7 binary import/reopen/playback, and a 390px-wide mobile chord-sheet flow. The GP7 fixture is generated from this repository's original MusicXML example; see [fixture provenance and regeneration](frontend/e2e/fixtures/README.md). Other Guitar Pro versions still need separate compatibility samples.

See [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) for architecture details, [docs/BACKEND_DEVELOP.md](docs/BACKEND_DEVELOP.md) for backend development notes, [docs/TAILSCALE_DOCKER_TESTING.md](docs/TAILSCALE_DOCKER_TESTING.md) for private-network device testing with Tailscale, and [docs/GOOGLE_DRIVE_SETUP.md](docs/GOOGLE_DRIVE_SETUP.md) for uploading and importing `.gflow` files with Google Drive.

---

## Third-Party Licenses (第三方授權)

Guitar Pro import uses [@coderline/alphatab](https://github.com/CoderLine/alphaTab) (MPL-2.0), lazy-loaded separately from the `.gflow` editor.

| Document | Description |
|----------|-------------|
| [frontend/NOTICE.md](frontend/NOTICE.md) | Third-party component list |
| [docs/MPL_LICENSING.md](docs/MPL_LICENSING.md) | MPL-2.0 analysis and compliance checklist |

---

*Built with passion for guitarists.*
