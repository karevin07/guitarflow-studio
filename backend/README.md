# GuitarFlow 後端

後端提供 Django REST API，處理帳號、歌曲、歌單與和弦資料。Docker 使用 PostgreSQL，本機則預設使用 SQLite。

在 repo 根目錄執行：

```bash
make install-backend
make migrate
make dev-backend
```

開發設定與 API 的詳細說明在 [後端開發](../docs/BACKEND_DEVELOP.md)。
