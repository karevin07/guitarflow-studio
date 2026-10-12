# 後端開發

後端使用 Django 5、Django REST Framework 與 TokenAuthentication。

## 本機啟動

在 repo 根目錄執行：

```bash
make install-backend
make migrate
make dev-backend
make test-backend
```

建立管理員：

```bash
cd backend
.venv/bin/python manage.py createsuperuser
```

管理後台為 <http://localhost:8000/admin/>。Docker 啟動時會自動執行 migration；本機修改模型後使用 `make makemigrations` 與 `make migrate`。

## 環境設定

`core/settings.py` 讀取程序環境變數，不會自動載入 `backend/.env`。如果從範本建立此檔案，需先將變數載入 shell，再啟動 Django：

```bash
cp backend/.env.example backend/.env
set -a
. backend/.env
set +a
make dev-backend
```

| 變數 | 用途 |
| --- | --- |
| `DJANGO_SECRET_KEY` | Django key；預設值僅供開發 |
| `DJANGO_DEBUG` | 預設 `True`，正式環境設為 `False` |
| `DJANGO_ALLOWED_HOSTS` | 可接受的 host，以逗號分隔 |
| `DJANGO_CORS_ORIGINS` | 跨來源請求允許的 origin，以逗號分隔 |
| `DB_ENGINE` | 設為 `postgres` 使用 PostgreSQL |
| `DB_NAME`、`DB_USER`、`DB_PASSWORD`、`DB_HOST`、`DB_PORT` | PostgreSQL 連線設定 |

未設定 PostgreSQL 時使用 `backend/db.sqlite3`。設定 `DB_NAME` 也會切換到 PostgreSQL。

Compose 只轉送 YAML 中列出的變數；`--env-file` 不會自動將所有變數注入容器。`DJANGO_SECRET_KEY` 與 `DJANGO_DEBUG` 會轉送給後端，沒有設定時使用開發預設值。

## 模型

| 模型 | 內容 |
| --- | --- |
| `GuitarSong` | 擁有者、歌曲資訊、BPM、指法配置、音域與播放順序 |
| `TabSection` | 段落順序、capo、拍號、伴奏 pattern，以及 JSON 格式的音符、和弦和歌詞 |
| `CustomChord` | 單首歌曲使用的自訂指法 |
| `Setlist` | 使用者的歌單與歌曲排列 |
| `GlobalChord` | 唯讀的標準和弦表 |

`GlobalChord` 使用 `managed = False`，由 `postgres-init/init.sql` 在 PostgreSQL 首次初始化時建立。Django migration 不會建立這張表；SQLite 開發環境需自行處理。

序列化器將 Python 的 snake_case 欄位對應到前端的 camelCase。歌曲更新會保留既有段落與自訂和弦的 ID，新增新項目並刪除省略的項目。

## API

所有路徑以 `/api` 開頭。

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| POST | `/auth/register/`、`/auth/login/` | 註冊或登入，取得 token |
| POST | `/auth/logout/` | 撤銷目前 token |
| GET | `/auth/me/` | 目前使用者 |
| GET / POST | `/songs/` | 歌曲列表或新增；支援 `?search=` 與分頁 |
| GET / PUT / PATCH / DELETE | `/songs/{id}/` | 讀取、更新或刪除歌曲 |
| PATCH | `/songs/{id}/info/` | 更新歌曲資訊 |
| GET / POST | `/setlists/` | 歌單列表或新增 |
| GET / PUT / PATCH / DELETE | `/setlists/{id}/` | 讀取、更新或刪除歌單 |
| GET | `/global-chords/` | 公開的標準和弦列表 |

除註冊、登入與全域和弦外，請求需帶 `Authorization: Token <token>`。

歌曲與歌單 API 只回傳登入者自己的資料；其他使用者的 ID 會得到 404。設計原因見[設計說明](DESIGN.md)。
