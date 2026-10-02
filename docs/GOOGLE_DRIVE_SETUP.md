# Google Drive 上傳／匯入 .gflow 設定

GuitarFlow 可以把歌曲的 `.gflow` 上傳到使用者自己的 Google Drive，也能從 Drive 挑選 `.gflow` 匯入。整個流程在瀏覽器完成，後端不經手 Google 憑證。

- 權限只要 `https://www.googleapis.com/auth/drive.file`：GuitarFlow 只看得到自己建立的檔案，以及使用者在 Google Picker 裡選的檔案。這是非敏感權限，不需要 Google 安全審查。
- 存取權杖只放在記憶體，效期約一小時，過期後點按鈕會再取一次（已同意過就不會再跳同意畫面）。
- 第一次上傳會在「我的雲端硬碟」建立 `GuitarFlow` 資料夾；同一首歌再次上傳會覆蓋原檔案，舊內容留在 Drive 的版本紀錄。
- 三個環境變數沒設齊時，畫面上不會出現 Drive 相關按鈕。

## 1. Google Cloud 設定

可沿用 novel-vault 的 Cloud 專案（同意畫面與測試使用者已設定好），但 novel-vault 用的是「電腦版應用程式」用戶端，網頁需要另外建立一個「網頁應用程式」用戶端。

1. **API 和服務 → 程式庫**：啟用 **Google Drive API** 與 **Google Picker API**。
2. **OAuth 同意畫面**：
   - 範圍加入 `.../auth/drive.file`。
   - 發布狀態維持「測試」時，要把會使用的 Google 帳號加入測試使用者（上限 100 位）。
3. **憑證 → 建立憑證 → OAuth 用戶端 ID**：
   - 類型選「網頁應用程式」。
   - 「已授權的 JavaScript 來源」填入使用者開啟 GuitarFlow 的網址，例如 `https://guitarflow-dev.example-tailnet.ts.net:8443` 和 `http://localhost:3003`。不需要填重新導向 URI。
   - 用戶端 ID 填入 `VITE_GOOGLE_CLIENT_ID`。
4. **憑證 → 建立憑證 → API 金鑰**：
   - 建議在「API 限制」只勾 Google Picker API，在「網站限制」填入上面的來源。
   - 金鑰填入 `VITE_GOOGLE_API_KEY`。
5. **IAM 與管理 → 設定**：把「專案編號」（純數字，不是專案 ID）填入 `VITE_GOOGLE_APP_ID`。Picker 要靠它把使用者選的檔案授權給 GuitarFlow。

## 2. HTTPS 網址

Google 只接受 HTTPS 或 `localhost` 作為 JavaScript 來源，不接受 IP，所以 `http://100.64.0.10:3003` 和 `http://guitarflow-dev:3003` 都不能用。透過 Tailscale 可以這樣取得 HTTPS 網址：

1. 在 Tailscale 管理介面的 DNS 頁面啟用 **HTTPS Certificates**。
2. 用 `tailscale serve` 把 HTTPS 轉到前端（這台機器的 443 以外，`:3000` 已被其他服務使用，這裡用 8443）：

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
VITE_GOOGLE_API_KEY=AIza...
VITE_GOOGLE_APP_ID=1234567890
```

Vite 只在啟動時讀取這些值，修改後要重建前端容器：

```bash
docker compose --env-file .env.tailscale.local up -d --build --force-recreate frontend
```

API 金鑰和用戶端 ID 本來就會出現在瀏覽器裡，不算機密，但仍建議依上面第 4 步限制金鑰的用途和來源。

## 4. 使用方式

- **上傳**：在歌曲頁點「匯出」→「上傳到 Google Drive」。手機的練習頁在「⋯」選單裡。
- **匯入**：在歌曲庫點「從 Drive 匯入」，可一次選多個檔案。只選一首時，匯入後會直接打開它。

## 疑難排解

| 狀況 | 原因與處理 |
|------|-----------|
| 看不到 Drive 按鈕 | 三個 `VITE_GOOGLE_*` 沒設齊，或前端容器沒重建。 |
| 登入視窗出現 `redirect_uri_mismatch` 或 `origin_mismatch` | 目前的網址（含 port）沒有列在「已授權的 JavaScript 來源」。 |
| 「無法開啟 Google 登入視窗」 | 瀏覽器擋了彈出視窗，請允許這個網站開啟彈出視窗。 |
| 帳號顯示「應用程式未經驗證」或拒絕存取 | 同意畫面仍在「測試」狀態，而這個帳號不在測試使用者名單中。 |
| Picker 選了檔案卻顯示 403／404 | `VITE_GOOGLE_APP_ID` 不是專案編號，Picker 沒能把檔案授權給 GuitarFlow。 |
