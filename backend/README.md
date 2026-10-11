# GuitarFlow 後端

Django REST API，負責帳號、歌曲、歌單與和弦資料。Docker 使用 PostgreSQL；本機預設使用 SQLite。

在 repo 根目錄執行：

```bash
make install-backend
make migrate
make dev-backend
```

開發與 API 說明見 [後端開發](../docs/BACKEND_DEVELOP.md)。
