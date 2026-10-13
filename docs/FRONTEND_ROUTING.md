# 前端路由

前端使用 React Router 的 `BrowserRouter`，從 URL 判斷要開啟哪個頁面和歌曲。編輯內容、播放位置與對話框則保存在 React state。

## 路由

| URL | 頁面 | 需要登入 |
| --- | --- | --- |
| `/` | 轉到 `/songs` | 否 |
| `/songs` | 歌曲庫；訪客可開啟登入介面 | 否 |
| `/songs/:songId/create` | 創作 | 是 |
| `/songs/:songId/practice` | 練習 | 是 |
| `/songs/:songId/arrange` | 編曲 | 是 |
| `/chords` | 和弦庫 | 否 |
| `/chords/:symbol` | 指定和弦，例如 `/chords/F%23m7` | 否 |
| 未知路徑 | 轉到 `/songs` | 否 |

## 程式分工

- `services/routes.ts`：用 `appPaths` 建立 URL、`parseAppRoute` 解析 URL。導覽時使用這些 helper，不要自行拼接。
- `App.tsx`：還原登入狀態、載入曲庫，依 URL 開啟歌曲。
- `AppRail`：切換歌曲庫、創作、練習、編曲與和弦庫。
- `SongShellHeader`：切換目前歌曲的工作頁。

直接開啟歌曲 URL 時，畫面會先等待認證與曲庫載入。若歌曲不存在或使用者沒有讀取權限，就回到 `/songs` 並顯示錯誤。

## 部署

重新整理或直接開啟 `/songs/123/practice` 等非檔案路徑時，網頁伺服器必須回傳 `index.html`。Vite 已提供 SPA fallback；使用靜態網站伺服器部署時，需要另外設定這個行為，並讓 `/api` 交由後端處理。

修改路由後執行 `make test-frontend`，相關測試位於 `services/routes.test.ts`。
