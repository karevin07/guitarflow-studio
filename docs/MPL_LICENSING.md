# MPL-2.0 授權說明（alphaTab）

> 日期：2026-06-21  
> 狀態：**內部結論 — 可繼續使用，需保留 NOTICE**

---

## 1. 背景

GuitarFlow Studio 在 **Guitar Pro / MusicXML 匯入與閱譜** 功能使用：

| 套件 | 授權 | 用途 |
|------|------|------|
| `@coderline/alphatab` | **MPL-2.0** | GP 渲染、播放、cursor |
| `@coderline/alphatab-vite` | **MPL-2.0** | Vite 7 worker 整合 |

其餘核心功能（`.gflow` 編輯、SoundFont 播放、Django API）**不依賴** alphaTab。

---

## 2. 結論（Sprint C1）

| 問題 | 結論 |
|------|------|
| 能否在 side project 使用？ | **可以**，MPL-2.0 允許與其他授權的程式結合發布 |
| 是否需要開源整個 GuitarFlow？ | **否**。MPL-2.0 僅「傳染」*修改過的* MPL 檔案，不要求整個 App 改為 MPL |
| 我們做了哪些修改？ | 目前 **未修改** alphaTab 原始碼，僅透過 npm 依賴 + lazy import 使用 |
| 需要什麼合規動作？ | 保留 alphaTab **版權與 MPL-2.0 授權文字**（見 `frontend/NOTICE.md`） |

**風險等級：低** — 典型「依賴 MPL library、未 fork 修改」場景。

---

## 3. 若未來修改 alphaTab 原始碼

以下情況需以 **MPL-2.0** 公開修改檔案：

- 直接 patch `node_modules/@coderline/alphatab`
- Fork alphaTab 並改動後內嵌

建議：優先透過 alphaTab **公開 API**（`AlphaTabApi`、settings）擴充，避免 fork。

---

## 4. 替代方案（若需完全避開 MPL）

| 方案 | 代價 |
|------|------|
| 僅 backend CLI 轉 GP → MusicXML/gflow，前端不嵌入 alphaTab | 失去即時 GP 渲染/播放 |
| 改用其他 GPL/Commercial 授權引擎 | 授權費或更嚴格傳染 |

目前 **不建議** 替換；alphaTab 與產品路線高度契合。

---

## 5. 合規 Checklist

- [x] 確認 `@coderline/alphatab` 為 MPL-2.0
- [x] 確認未修改 alphaTab 原始碼
- [x] 新增 `frontend/NOTICE.md` 列出第三方授權
- [x] README 加入 Third-Party Licenses 連結
- [ ] 對外正式發布前：請法务/授權顧問 final review（若商業化）

---

## 6. 參考

- [Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/)
- [alphaTab GitHub](https://github.com/CoderLine/alphaTab)
- [MPL FAQ（是否感染整個程式）](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)

---

*本文檔為工程團隊內部技術備忘，不構成法律意見。*
