# 資料流程

## 開發服務

```mermaid
flowchart LR
    Browser[瀏覽器] -->|頁面與 /api| Vite[Vite 前端]
    Vite -->|/api proxy| Django[Django REST API]
    Django --> DB[(PostgreSQL / SQLite)]
    Browser -->|OAuth 與 .gflow| Drive[Google Drive]
```

Docker 的前端入口為 `localhost:3003`。API 與 PostgreSQL 的主機 port 預設只綁在 loopback；前端透過容器網路連到 Django。

## 儲存歌曲

```mermaid
sequenceDiagram
    participant Browser as React
    participant Vite
    participant API as Django
    participant DB as 資料庫
    Browser->>Vite: PUT /api/songs/{id}/ + token
    Vite->>API: 轉送請求
    API->>API: 驗證認證、擁有者與內容
    API->>DB: 更新歌曲、段落與自訂和弦
    DB-->>API: 儲存結果
    API-->>Vite: 歌曲 JSON
    Vite-->>Browser: 歌曲 JSON
```

| 服務 | 啟動條件 | 健康檢查 |
| --- | --- | --- |
| PostgreSQL | 無 | `pg_isready` |
| Django | 資料庫健康 | `GET /api/global-chords/` |
| Vite | Django 健康 | Compose 未設定 |

程式目錄與儲存方式見[專案架構](PROJECT_OVERVIEW.md)。
