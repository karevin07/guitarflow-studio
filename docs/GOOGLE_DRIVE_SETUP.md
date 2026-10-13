# Google Drive 設定

歌曲可以上傳到自己的 Drive，之後再從 Drive 匯回曲庫。整個流程在瀏覽器裡完成，只需要 OAuth 用戶端 ID，不用 API key 或 client secret。

## Google Cloud

1. 建立或選擇 Cloud 專案，啟用 Google Drive API。
2. 設定 OAuth 同意畫面，加入 `https://www.googleapis.com/auth/drive.file`。測試模式下，將使用者加入測試名單。
3. 建立「網頁應用程式」OAuth 用戶端。
4. 在「已授權的 JavaScript 來源」填入完整 origin，例如 `http://localhost:3003` 或 `https://guitarflow.example.com`。port 要和開啟應用程式的網址一致，不需要填 redirect URI。

遠端網址需要使用 HTTPS，本機開發則可用 localhost。Tailscale 的 HTTP IP 不能當作 Google OAuth 來源。

## 應用程式設定

使用 Docker 時，把以下設定加到 repo 根目錄的本機 env 檔，例如 `.env.local`（Git 會忽略這個檔案）：

```dotenv
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

```bash
docker compose --env-file .env.local up -d --build --force-recreate frontend
```

本機開發時，把設定放在 `frontend/.env.local`，再重新啟動 Vite。沒有設定時，畫面會隱藏 Drive 按鈕。

用戶端 ID 會出現在瀏覽器中，但 client secret 不應放進前端或任何 `VITE_*` 變數。Google access token 只留在記憶體裡，不會送到 Django。

## Tailscale HTTPS

若 Tailnet 已開啟 HTTPS 憑證，可用 Tailscale Serve 轉送到前端。以下 IP 是範例：

```bash
sudo tailscale serve --bg --https=8443 http://100.64.0.10:3003
tailscale serve status
```

把 Serve 顯示的 HTTPS origin 加到 Google 的已授權來源，再把主機名稱加入 `VITE_ALLOWED_HOSTS` 和 `DJANGO_ALLOWED_HOSTS`，並更新 `DJANGO_CORS_ORIGINS`。重新建立容器後，就可以用這個 HTTPS 網址開啟應用程式。

## 使用

- 單首歌曲：歌曲頁「匯出」→「上傳到 Google Drive」。
- 整個曲庫：歌曲庫「Google Drive」→「備份整個曲庫」。每首歌會存成一個 `.gflow`，沒有變更的歌曲會略過；備份不包含歌單。
- 還原：歌曲庫「Google Drive」→「從 Drive 匯入」，選取要匯入的歌曲。

第一次上傳時會建立 `GuitarFlow` 資料夾。同一首歌再次備份時，會更新原本的檔案。從 Drive 匯入後，檔案會改綁到新建立的歌曲，之後再備份仍使用同一個檔案。

匯入清單只會列出透過 GuitarFlow 上傳的檔案。如果是自己放進 Drive 的 `.gflow`，請先下載，再從本機匯入。

## 排查

| 狀況 | 處理 |
| --- | --- |
| 沒有 Drive 按鈕 | 檢查 client ID，重新啟動 Vite 或建立前端容器 |
| `origin_mismatch` | 檢查目前 origin 是否列在 Google 設定，包含 port |
| 登入視窗無法開啟 | 允許此網站的彈出視窗 |
| 測試帳號無法存取 | 檢查 OAuth 同意畫面的測試使用者名單 |
| 找不到檔案 | 確認檔案是經 GuitarFlow 上傳 |

登入流程與權限的詳細說明可參考 [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)及 [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)。
