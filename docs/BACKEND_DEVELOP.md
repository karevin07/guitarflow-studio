# 後端 API 與設定

後端使用 Django 5、Django REST Framework 和 TokenAuthentication。資料模型整理在[專案架構](PROJECT_OVERVIEW.md#資料關係)，儲存方式與取捨則在[設計說明](DESIGN.md)。

## 開發

在 repo 根目錄執行：

```bash
make install-backend
make migrate
make dev-backend
make test-backend
```

Docker 啟動時會自動執行 migration。本機修改模型後，依序執行 `make makemigrations`、`make migrate`。

建立管理員後開啟 <http://localhost:8000/admin/>：

```bash
cd backend
.venv/bin/python manage.py createsuperuser
```

## 環境變數

Django 從程序的環境變數讀取設定，不會自動載入 `backend/.env`。使用範本時，先將變數載入 shell，再啟動後端：

```bash
cp backend/.env.example backend/.env
set -a
. backend/.env
set +a
make dev-backend
```

| 變數 | 用途 |
| --- | --- |
| `DJANGO_SECRET_KEY` | Django key；未設定時使用開發預設值 |
| `DJANGO_DEBUG` | 預設 `True` |
| `DJANGO_ALLOWED_HOSTS` | 可接受的 host，以逗號分隔 |
| `DJANGO_CORS_ORIGINS` | 允許跨來源請求的 origin，以逗號分隔 |
| `DB_ENGINE` | `postgres` 使用 PostgreSQL，預設 SQLite |
| `DB_NAME`、`DB_USER`、`DB_PASSWORD`、`DB_HOST`、`DB_PORT` | PostgreSQL 連線設定 |

設定 `DB_NAME` 也會讓後端改用 PostgreSQL。Compose 只會把 YAML 列出的變數傳進容器，包括 `DJANGO_SECRET_KEY`、`DJANGO_DEBUG`；加上 `--env-file` 並不會自動傳入所有值。

`GlobalChord` 是唯讀表，不由 Django migration 建立。Docker 首次初始化資料庫時，會透過 `postgres-init/init.sql` 建立這張表；本機 SQLite 沒有這個初始化步驟。

## API

以下路徑都以 `/api` 開頭。除了註冊、登入和全域和弦，其餘請求都需要帶上 `Authorization: Token <token>`。

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| POST | `/auth/register/`、`/auth/login/` | 註冊或登入，取得 token |
| POST | `/auth/logout/` | 撤銷目前 token |
| GET | `/auth/me/` | 目前使用者 |
| GET / POST | `/songs/` | 列表或新增；支援 `?search=` 與分頁 |
| GET / PUT / PATCH / DELETE | `/songs/{id}/` | 讀取、更新或刪除 |
| PATCH | `/songs/{id}/info/` | 更新曲庫資訊 |
| GET / POST | `/setlists/` | 歌單列表或新增 |
| GET / PUT / PATCH / DELETE | `/setlists/{id}/` | 讀取、更新或刪除歌單 |
| GET | `/global-chords/` | 公開的標準和弦列表 |

歌曲和歌單 API 只回傳登入者自己的資料；請求其他使用者的 ID 時，會得到 404。
