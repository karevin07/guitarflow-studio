# Tailscale 裝置測試

讓同一個 Tailnet 的電腦、手機或平板連到 Docker 開發服務。伺服器需安裝 Docker、Compose 與 Tailscale，測試裝置也需登入 Tailnet 並有連線權限。

## 設定

先查伺服器的 Tailscale IP 與節點名稱：

```bash
tailscale status
tailscale ip -4
```

在 repo 根目錄建立 `.env.tailscale.local`。以下 IP 和名稱只是範例，請替換成自己的值：

```dotenv
APP_BIND_HOST=100.64.0.10
VITE_API_URL=/api
VITE_ALLOWED_HOSTS=localhost,guitarflow-dev
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,100.64.0.10,guitarflow-dev
DJANGO_CORS_ORIGINS=http://localhost:3003,http://127.0.0.1:3003,http://100.64.0.10:3003,http://guitarflow-dev:3003
```

此檔案不應提交。前端透過 `/api` 轉送到後端，裝置只需要連到前端 port。

## 啟動與驗證

```bash
docker compose --env-file .env.tailscale.local up -d --build
docker compose --env-file .env.tailscale.local ps
curl http://100.64.0.10:3003/api/global-chords/
```

在測試裝置開啟 `http://100.64.0.10:3003`，或 MagicDNS 名稱 `http://guitarflow-dev:3003`。

前端只發布在指定的 Tailscale IP；Django 與 PostgreSQL 預設只發布在伺服器的 `127.0.0.1`。這是私人開發測試配置，仍使用開發憑證。

修改 env 後重新建立容器：

```bash
docker compose --env-file .env.tailscale.local up -d --build --force-recreate
```

停止並保留資料：

```bash
docker compose --env-file .env.tailscale.local down
```

不要加 `-v`，除非確定要刪除資料庫 volume。

## SSH 通道

沒有 Tailscale 的裝置可透過 SSH 轉送前端：

```bash
ssh -N -L 3003:100.64.0.10:3003 user@server.example.com
```

開啟 <http://localhost:3003>。轉送目標使用伺服器的 Tailscale IP，因為前端沒有綁在伺服器的 loopback。

管理後台另用一條通道：

```bash
ssh -N -L 8000:127.0.0.1:8000 user@server.example.com
```

開啟 <http://localhost:8000/admin/>。按 Ctrl+C 結束通道。

## 排查

- 無法連線：確認 `tailscale ping`、Tailnet 存取規則及 Compose 的 port binding。
- Vite 顯示 blocked host：把使用的主機名稱加入 `VITE_ALLOWED_HOSTS`。
- API 失敗：確認 `VITE_API_URL=/api`，並把瀏覽器使用的 host 加入 `DJANGO_ALLOWED_HOSTS`。
- IP 改變：更新 env 後重新建立容器。

Google Drive 需要 localhost 或 HTTPS 來源，設定方式見 [Google Drive 設定](GOOGLE_DRIVE_SETUP.md)。瀏覽器測試使用 [README](../README.md) 的獨立測試環境，避免污染日常曲庫。
