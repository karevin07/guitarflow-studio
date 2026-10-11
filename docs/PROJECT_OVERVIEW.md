# 專案架構

GuitarFlow 的 React 前端負責編輯、音樂理論與播放；Django API 負責帳號與資料儲存。

## 目錄

| 路徑 | 用途 |
| --- | --- |
| `frontend/App.tsx` | 路由、歌曲載入與頁面整合 |
| `frontend/components/` | 創作、練習、編曲與曲庫介面 |
| `frontend/hooks/` | 編輯狀態、播放、認證與儲存 |
| `frontend/services/` | API、匯入匯出、Drive 與歌曲處理 |
| `frontend/music-theory/` | 音高、和弦、音階與調性分析 |
| `frontend/guitar/` | 指板位置與指法產生、評分 |
| `backend/core/` | Django 設定與根路由 |
| `backend/guitarflow/` | 模型、序列化、API、migration 與測試 |
| `postgres-init/init.sql` | PostgreSQL 首次啟動的和弦資料 |
| `frontend/e2e/` | Playwright 瀏覽器測試 |

## 資料與儲存

歌曲包含段落、六線譜、歌詞、和弦、指法配置與播放順序。前端以 `.gflow` JSON 匯入匯出；後端將歌曲、段落與自訂和弦分開儲存。

歌曲與歌單屬於登入者。早期資料中沒有擁有者的歌曲仍可由登入者讀取及認領，見[後端開發](BACKEND_DEVELOP.md)。

- Docker：PostgreSQL 資料保存在 `postgres_data` volume。
- 本機：未設定 PostgreSQL 時，使用 `backend/db.sqlite3`。
- Google Drive：瀏覽器直接上傳與下載 `.gflow`，後端不保存 Google 存取權杖。
- 本機偏好：主題、部分練習偏好與登入 token 使用瀏覽器儲存。

## 開發服務

| 服務 | Docker 主機位址 | 本機開發位址 |
| --- | --- | --- |
| 前端 | `127.0.0.1:3003` | `localhost:3000` |
| Django | `127.0.0.1:8000` | `localhost:8000` |
| PostgreSQL | `127.0.0.1:5432` | 預設改用 SQLite |

前端透過 Vite 的 `/api` proxy 呼叫 Django。Docker 的轉送目標為 `backend:8000`；本機為 `localhost:8000`。Docker bind mount 支援修改程式後重新載入。

Vite 本機開發會監聽所有介面；上表的 localhost 是瀏覽器入口，不代表僅允許本機連線。Docker 發布的 port 預設綁定 loopback。

## 限制

目前 Compose 啟動的是開發伺服器，使用開發 key、預設資料庫密碼與 debug 模式。公開網站部署需要另外處理 HTTPS、正式伺服器、憑證、認證與備份。

全域和弦表由 PostgreSQL 初始化 SQL 建立；SQLite 沒有相同的自動初始化流程。需要完整和弦 API 時使用 Docker。

啟動與測試指令見 [README](../README.md)，路由見[前端路由](FRONTEND_ROUTING.md)。
