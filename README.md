# GuitarFlow Studio

網頁版吉他創作與練習工具。編輯六線譜與歌詞、規劃和弦指法，並在個人曲庫中儲存歌曲。

## 功能

- 創作：六線譜編輯、段落管理、和弦辨識、Undo/Redo 與自動儲存。
- 練習：播放、節拍器、A–B 循環、轉調、capo 與和弦指法配置。
- 編曲：依調性產生單音 solo 建議。
- 曲庫：搜尋、標籤、收藏、歌單與歌曲播放順序。
- 檔案：匯入 `.gflow` 或貼上和弦譜；匯出 `.gflow`、MIDI 和 MusicXML。
- Google Drive：備份與還原歌曲，需另外設定 OAuth 用戶端 ID。

目前不支援 Guitar Pro 或 MusicXML 匯入。

## 啟動

### Docker

需要 Docker 與 Docker Compose。在 repo 根目錄執行：

```bash
make docker
```

開啟 <http://localhost:3003>。Django 管理後台位於 <http://localhost:8000/admin/>。

```bash
make docker-logs     # 查看日誌
make docker-down     # 停止服務，保留資料庫 volume
```

這是開發配置：使用 Vite、Django 開發伺服器與預設資料庫密碼，不適合直接對外提供服務。

### 本機開發

需要 Python 3.10+、[uv](https://docs.astral.sh/uv/) 與 Node.js 20.19+；Node.js 22 請使用 22.12+。

```bash
make install
make migrate
make dev-backend     # 終端機 1：http://localhost:8000
make dev-frontend    # 終端機 2：http://localhost:3000
```

前端預設透過同一個來源的 `/api` 呼叫後端。Vite 轉送到 `http://localhost:8000`，Docker 中則轉送到 `http://backend:8000`，不需另建 `frontend/.env`。

如需自訂設定：

- `API_PROXY_TARGET`：Vite 轉送目標。
- `VITE_API_URL`：直接呼叫其他後端，取代預設的 `/api`。
- Django 設定請見 [後端開發](docs/BACKEND_DEVELOP.md)。

## 使用

1. 註冊或登入，在歌曲庫建立歌曲、匯入 `.gflow`，或貼上和弦譜。
2. 在創作頁輸入音符、歌詞與和弦，依需要新增段落。
3. 切換到練習頁播放歌曲、循環段落，或配置和弦指法。
4. 儲存歌曲；需要移轉時匯出 `.gflow`，或使用 Google Drive 備份。

鍵盤操作可在創作頁的快捷鍵面板查看。Google Drive 備份不包含歌單。

## 開發與測試

前端使用 React、TypeScript 和 Vite；後端使用 Django 與 Django REST Framework。Docker 使用 PostgreSQL，本機預設使用 SQLite。

```bash
make help
make test            # 後端與前端單元測試
make format-frontend # TypeScript 型別檢查
make build           # 前端建置
```

瀏覽器測試使用獨立資料庫，避免寫入日常使用的曲庫：

```bash
docker compose --env-file .env.e2e.example -p guitarflow-e2e up -d --build --wait
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
cd ..
docker compose --env-file .env.e2e.example -p guitarflow-e2e down -v --remove-orphans
```

最後一行會刪除測試專案的資料庫 volume。CI 也執行這組測試。

## 文件

- [專案架構](docs/PROJECT_OVERVIEW.md)與[資料流程圖](docs/ARCHITECTURE_CHARTS.md)
- [後端開發與 API](docs/BACKEND_DEVELOP.md)
- [前端路由](docs/FRONTEND_ROUTING.md)
- [Google Drive 設定](docs/GOOGLE_DRIVE_SETUP.md)
- [Tailscale 裝置測試](docs/TAILSCALE_DOCKER_TESTING.md)
- [產品方向](docs/PRODUCT_ROADMAP_DESIGN.md)與[介面設計](docs/STITCH_UI_HANDOFF.md)

## 授權

第三方元件列於 [NOTICE](frontend/NOTICE.md)。本專案尚未指定授權條款。
