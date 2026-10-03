# Google Drive 上傳／匯入 .gflow 設定

GuitarFlow 可以把歌曲的 `.gflow` 上傳到使用者自己的 Google Drive，之後在任何裝置上再從 Drive 匯回來。整個流程在瀏覽器完成，只需要一個 OAuth 用戶端 ID；不用 API 金鑰，後端也不經手 Google 憑證。

- 權限只要 `https://www.googleapis.com/auth/drive.file`，屬於非敏感權限，不需要 Google 安全審查。GuitarFlow 只看得到自己上傳的檔案，所以匯入清單只會列出從 GuitarFlow 上傳過的樂譜。自己手動放進 Drive 的 `.gflow` 不會出現在清單裡，這類檔案請用「匯入 .gflow」從本機選檔。
- 存取權杖只放在記憶體，效期約一小時，過期後點按鈕會再取一次（已同意過就不會再跳同意畫面）。
- 第一次上傳會在「我的雲端硬碟」建立 `GuitarFlow` 資料夾；同一首歌再次上傳會覆蓋原檔案，舊內容留在 Drive 的版本紀錄。
- 沒設定 `VITE_GOOGLE_CLIENT_ID` 時，畫面上不會出現 Drive 相關按鈕。

## 1. Google Cloud 設定

可沿用 novel-vault 的 Cloud 專案（同意畫面與測試使用者已設定好），但 novel-vault 用的是「電腦版應用程式」用戶端，網頁需要另外建立一個「網頁應用程式」用戶端。

1. **API 和服務 → 程式庫**：啟用 **Google Drive API**。
2. **OAuth 同意畫面**：
   - 範圍加入 `.../auth/drive.file`。
   - 發布狀態維持「測試」時，要把會使用的 Google 帳號加入測試使用者（上限 100 位）。
3. **憑證 → 建立憑證 → OAuth 用戶端 ID**：
   - 類型選「網頁應用程式」。
   - 「已授權的 JavaScript 來源」填入使用者開啟 GuitarFlow 的網址，例如 `https://guitarflow-dev.example-tailnet.ts.net:8443` 和 `http://localhost:3003`。不需要填重新導向 URI。
   - 用戶端 ID 填入 `VITE_GOOGLE_CLIENT_ID`。
   - 同一頁會顯示的用戶端密鑰（`GOCSPX-...`）用不到，**不要**放進任何設定檔。

## 2. HTTPS 網址

Google 只接受 HTTPS 或 `localhost` 作為 JavaScript 來源，不接受 IP，所以 `http://100.64.0.10:3003` 和 `http://guitarflow-dev:3003` 都不能用。透過 Tailscale 可以這樣取得 HTTPS 網址：

1. 在 Tailscale 管理介面的 DNS 頁面啟用 **HTTPS Certificates**。
2. 用 `tailscale serve` 把 HTTPS 轉到前端（這台機器的 `:3000` 已被其他服務使用，這裡用 8443）：

   ```bash
   sudo tailscale serve --bg --https=8443 http://100.64.0.10:3003
   tailscale serve status
   ```

3. 在 `.env.tailscale.local` 加上新網址：

   ```bash
   VITE_ALLOWED_HOSTS=localhost,guitarflow-dev,guitarflow-dev.example-tailnet.ts.net
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,100.64.0.10,guitarflow-dev,guitarflow-dev.example-tailnet.ts.net
   DJANGO_CORS_ORIGINS=...,https://guitarflow-dev.example-tailnet.ts.net:8443
   ```

## 3. 環境變數

加到 `.env.tailscale.local`（或其他 `--env-file`）：

```bash
VITE_GOOGLE_CLIENT_ID=1234567890-xxxx.apps.googleusercontent.com
```

Vite 只在啟動時讀取這個值，修改後要重建前端容器：

```bash
docker compose --env-file .env.tailscale.local up -d --build --force-recreate frontend
```

用戶端 ID 本來就會出現在瀏覽器裡，不算機密；能使用的網址由第 1 步的「已授權的 JavaScript 來源」決定。

## 4. 使用方式

- **上傳單首**：在歌曲頁點「匯出」→「上傳到 Google Drive」。手機的練習頁在「⋯」選單裡。
- **備份整個曲庫**：在歌曲庫點「Google Drive」→「備份整個曲庫」。每首 GuitarFlow 樂譜存成一個 `.gflow`；Drive 上的檔案比歌曲最後修改時間還新的會略過，所以重複備份只會上傳有變更的歌。歌單不在備份範圍內。
- **匯入／還原**：在歌曲庫點「Google Drive」→「從 Drive 匯入」，清單會列出從 GuitarFlow 上傳過的樂譜（最近更新的在前），已經在曲庫裡的會標示「已在曲庫」，「選取未在曲庫的」可以一次選齊。只選一首時，匯入後會直接打開它。

### 每個檔案怎麼對應到歌曲

每個上傳的檔案都記著它屬於哪首歌（歌曲 ID 加上建立時間）。只用 ID 不夠：每台電腦的資料庫都從 1 開始編號，換電腦後同一個 ID 會是另一首歌。

- 同一首歌再次上傳或備份，會覆蓋同一個檔案。
- 從 Drive 匯入時，檔案會改綁到新建立的那首歌，所以在新電腦還原後再備份，會覆蓋原檔案而不會多出一份。原本那台電腦之後如果再備份同一首歌，會另外存一個新檔案。
- 第一版只用 ID 標記的檔案，在下次上傳或備份時會自動改成新的標記。

## 疑難排解

| 狀況 | 原因與處理 |
|------|-----------|
| 看不到 Drive 按鈕 | 沒設定 `VITE_GOOGLE_CLIENT_ID`，或前端容器沒重建。 |
| 登入視窗出現 `origin_mismatch` | 目前的網址（含 port）沒有列在「已授權的 JavaScript 來源」。 |
| 「無法開啟 Google 登入視窗」 | 瀏覽器擋了彈出視窗，請允許這個網站開啟彈出視窗。 |
| 帳號顯示「應用程式未經驗證」或拒絕存取 | 同意畫面仍在「測試」狀態，而這個帳號不在測試使用者名單中。 |
| 匯入清單裡找不到某個檔案 | 只有從 GuitarFlow 上傳的檔案會列出；手動放進 Drive 的檔案請下載後用「匯入 .gflow」。 |
