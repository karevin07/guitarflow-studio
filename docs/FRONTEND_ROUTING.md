# 前端路由

前端使用 React Router 的 `BrowserRouter`。URL 決定頁面與歌曲；編輯內容、播放位置和對話框留在 React state。

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

- `services/routes.ts`：`appPaths` 建立 URL，`parseAppRoute` 解析 URL。導覽時使用 helper，避免自行拼接。
- `App.tsx`：還原登入狀態、載入曲庫，依 URL 開啟歌曲。
- `AppRail`：切換歌曲庫、創作、練習、編曲與和弦庫。
- `SongShellHeader`：切換目前歌曲的工作頁。

直接開啟歌曲 URL 時，需先等待認證與曲庫載入。歌曲不存在或無權讀取時，回到 `/songs` 並顯示錯誤。

## 部署

網頁伺服器需將 `/songs/123/practice` 等非檔案路徑回傳為 `index.html`，才能重新整理或直接開啟頁面。Vite 已提供 SPA fallback；正式部署需在靜態網站伺服器另行設定，並將 `/api` 留給後端。

修改路由後執行 `make test-frontend`，相關測試位於 `services/routes.test.ts`。
