# 使用 Tailscale 測試 Docker 服務

本文件說明如何從同一個 Tailscale 網路（Tailnet）中的電腦、平板或手機，連線到這台機器上執行的 GuitarFlow Docker 服務。

## 目前測試位址

伺服器節點名稱為 `guitarflow-dev`，目前的 Tailscale IPv4 為 `100.64.0.10`。

| 服務 | IP | Port | 連線網址 |
|---|---:|---:|---|
| GuitarFlow UI | `100.64.0.10` | `3003` | `http://100.64.0.10:3003` |
| API（經前端轉送） | `100.64.0.10` | `3003` | `http://100.64.0.10:3003/api/` |
| API 健康檢查 | `100.64.0.10` | `3003` | `http://100.64.0.10:3003/api/global-chords/` |
| Django（含 `/admin`） | `127.0.0.1` | `8000` | 僅限伺服器本機，不對 Tailnet 開放 |
| PostgreSQL | `127.0.0.1` | `5432` | 僅限伺服器本機，不對 Tailnet 開放 |

若 Tailnet 已啟用 MagicDNS，也可以使用節點名稱：

- UI：`http://guitarflow-dev:3003`
- API：`http://guitarflow-dev:3003/api/`

> 目前服務使用 HTTP，沒有啟用 HTTPS。Tailscale 負責裝置間的加密傳輸與私有網路存取。

## 連線架構

```text
同一個 Tailnet 中的裝置
        │
        │ Tailscale encrypted network
        ▼
guitarflow-dev (100.64.0.10)
        ├── :3003 → Frontend container ──/api──▶ Django container
        ├── 127.0.0.1:8000 → Django container（僅本機）
        └── 127.0.0.1:5432 → PostgreSQL container（僅本機）
```

## 前置需求

伺服器與測試裝置都需要：

1. 安裝 Tailscale。
2. 登入相同的 Tailnet。
3. 在 Tailscale 管理介面中允許兩台裝置互相連線。

伺服器另外需要 Docker 與 Docker Compose。

## 1. 確認伺服器的 Tailscale 狀態

```bash
tailscale status
tailscale ip -4
```

預期會看到：

```text
100.64.0.10  guitarflow-dev
```

如果 `tailscaled` 沒有執行：

```bash
sudo systemctl start tailscaled
sudo systemctl enable tailscaled
```

## 2. 建立本機 Docker 環境設定

在專案根目錄建立 `.env.tailscale.local`：

```dotenv
APP_BIND_HOST=100.64.0.10
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,100.64.0.10,guitarflow-dev
DJANGO_CORS_ORIGINS=http://localhost:3003,http://127.0.0.1:3003,http://100.64.0.10:3003,http://guitarflow-dev:3003
VITE_API_URL=/api
VITE_ALLOWED_HOSTS=localhost,guitarflow-dev
```

`VITE_API_URL=/api` 讓瀏覽器把 API 請求送到開啟頁面的同一個位址，由 Vite 轉給 backend 容器。因此用 Tailscale、SSH tunnel 或本機開啟都能正常使用，只需要能連到 frontend 的 `3003`。

此檔案符合 `.gitignore` 的 `*.local` 規則，不應提交到 Git。

如果 `tailscale ip -4` 顯示不同 IP，請將範例中的 `100.64.0.10` 全部替換成目前的 IP。

## 3. 啟動 Docker 服務

從專案根目錄執行：

```bash
docker compose --env-file .env.tailscale.local up -d --build
```

檢查狀態：

```bash
docker compose --env-file .env.tailscale.local ps
```

預期的 port bindings：

```text
frontend  100.64.0.10:3003->3000/tcp
backend   127.0.0.1:8000->8000/tcp
db        127.0.0.1:5432->5432/tcp
```

若修改了 `.env.tailscale.local`，請重新建立容器以套用設定：

```bash
docker compose --env-file .env.tailscale.local up -d --build --force-recreate
```

## 4. 從其他裝置連線

先在測試裝置確認 Tailscale 能連到伺服器：

```bash
tailscale ping 100.64.0.10
```

接著用瀏覽器開啟：

```text
http://100.64.0.10:3003
```

手機和平板只需連上 Tailscale，不需要與伺服器位於相同的 Wi-Fi。

## 5. 驗證 UI 與 API

在伺服器或其他 Tailnet 裝置執行：

```bash
curl -I http://100.64.0.10:3003/
curl http://100.64.0.10:3003/api/global-chords/
```

第一個請求應回傳 HTTP `200`，第二個請求應回傳 JSON 和弦資料。

查看容器健康狀態與日誌：

```bash
docker compose --env-file .env.tailscale.local ps
docker compose --env-file .env.tailscale.local logs --tail=100 frontend backend
```

## 停止服務

```bash
docker compose --env-file .env.tailscale.local down
```

Docker volume 中的 PostgreSQL 與媒體資料會保留。若只是暫時停止，也可以使用：

```bash
docker compose --env-file .env.tailscale.local stop
```

## 安全邊界

- Frontend 與 Backend 只綁定指定的 Tailscale IP，不會綁定所有網路介面。
- PostgreSQL 只綁定 `127.0.0.1:5432`，Tailnet 裝置無法直接連線資料庫。
- 只有通過 Tailnet ACL 的裝置能連線 Tailscale IP。
- `.env.tailscale.local` 是機器專屬設定，不應提交。
- 這是開發測試配置，不建議直接作為公開網際網路部署方式。

## Troubleshooting

### `tailscale status` 顯示 tailscaled 未執行

```bash
sudo systemctl restart tailscaled
tailscale status
```

### 瀏覽器無法開啟 `100.64.0.10:3003`

依序確認：

1. 測試裝置已連上相同 Tailnet。
2. `tailscale ping 100.64.0.10` 成功。
3. `docker compose ... ps` 顯示 frontend 正在執行。
4. frontend port 綁定的是 Tailscale IP，而不是只有 `127.0.0.1`。
5. Tailnet ACL 沒有封鎖 TCP `3003`。

### UI 可以開啟，但 API 請求失敗

確認 `.env.tailscale.local`：

- `VITE_API_URL=/api`（由 Vite 轉給 backend；舊設定 `http://<TAILSCALE_IP>:8000/api` 只在 Tailscale 內可用）
- `DJANGO_ALLOWED_HOSTS` 包含 Tailscale IP 和節點名稱
- `DJANGO_CORS_ORIGINS` 包含 UI 的完整 origin，例如 `http://100.64.0.10:3003`

修改後使用 `--force-recreate` 重新建立容器。

### 使用節點名稱時出現 Vite blocked host

確認：

```dotenv
VITE_ALLOWED_HOSTS=localhost,guitarflow-dev
```

也可以直接改用 Tailscale IP 連線。

### Tailscale IP 已改變

重新取得 IP：

```bash
tailscale ip -4
```

更新 `.env.tailscale.local` 中所有舊 IP，然後重新建立容器。

## 用 SSH tunnel 臨時查看

沒有 Tailscale 的機器，也可以透過 SSH 轉送 frontend 的 port 來查看。因為 API 由 Vite 轉送，只需要轉一個 port：

```bash
ssh -N -L 3003:100.64.0.10:3003 ubuntu@<伺服器 IP 或主機名稱>
```

接著在該機器的瀏覽器開啟 <http://localhost:3003>。

- 轉送目標要寫 Tailscale IP，因為容器綁在 `APP_BIND_HOST`，不是伺服器的 `localhost`。
- 本機的 `3003` 若已被佔用，可改成其他 port，例如 `-L 8080:100.64.0.10:3003`，再開 <http://localhost:8080>。
- `-N` 只建立通道，不開遠端 shell；按 `Ctrl+C` 結束。
- `VITE_ALLOWED_HOSTS` 與 `DJANGO_ALLOWED_HOSTS` 需包含 `localhost`（上面的範例已包含）。

## 從其他機器使用 Django 管理後台

Django（`8000`，含 `/admin`）只綁在伺服器的 `127.0.0.1`，不對 Tailnet 或外部開放。需要從其他機器使用時，開一條 SSH 通道：

```bash
ssh -N -L 8000:127.0.0.1:8000 ubuntu@<伺服器 IP 或主機名稱>
```

再開啟 <http://localhost:8000/admin/>。若要讓 Django 對 Tailnet 開放，可在 `.env.tailscale.local` 設定 `APP_BACKEND_BIND_HOST=100.64.0.10`（不建議長期開啟）。

在伺服器上對 live stack 跑 E2E 時，測試資料直接寫入本機的 Django：

```bash
E2E_BASE_URL=http://100.64.0.10:3003 E2E_API_URL=http://127.0.0.1:8000/api npm run test:e2e
```
