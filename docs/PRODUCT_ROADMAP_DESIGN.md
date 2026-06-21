# GuitarFlow 產品路線設計

> 策略：**C — 混合路線**（創作 + 閱譜/練習）  
> 執行順序：**先 A（創作工具）→ 再 B（alphaTab 整合）**  
> 參考：[alphaTab](https://github.com/CoderLine/alphaTab) UI/UX 與功能設計  
> 日期：2025-06-20 · **最後更新：2026-06-20**

### 進度總覽

| 階段 | 狀態 | 完成度 |
|------|------|--------|
| Phase A（A1–A3） | ✅ 完成 | ~98% |
| Sprint B1（GP PoC） | ✅ 完成 | ~95% |
| Sprint B2（雙引擎） | ✅ 完成 | ~95% |
| Sprint B3（進階） | 🔄 進行中 | ~65% |
| Sprint C1（品質 & 合規） | ✅ 完成 | 100% |
| **Phase D（GP 風格 Edit UI）** | ✅ 完成 | ~95% |
| **Phase C2（使用者隔離）** | ✅ 完成 | ~95% |

**當前 Sprint：B3 收尾 / 生產環境 auth 強化（backlog）**

---

## 1. 產品願景

GuitarFlow Studio 最終成為 **雙模式吉他音樂 App**：

| 模式 | 用途 | 核心體驗 |
|------|------|---------|
| **Compose（創作）** | 詞曲作者快速寫 Tab | 連續樂譜編輯（Phase D）、Notation Toolbar、和弦拖放、雲端存檔 |
| **Practice（練習）** | 閱譜、跟彈、循環練習 | 連續樂譜、專業 Player、SoundFont 音色 |

兩模式共用同一首歌曲，但視圖與互動邏輯不同——類似 alphaTab 將「渲染/播放 SDK」與「外層 App UI」分離的思路，GuitarFlow 將 **編輯引擎** 與 **練習引擎** 分離，共用資料層。

---

## 2. 現況摘要（2026-06-21）

### 已有能力
- 6 弦 × 16 分音符格線編輯器（鍵盤/指板輸入）
- Section / Measure 管理（刪除、排序、Undo/Redo）
- 和弦庫（Global + Custom）、拖放、Chord Manager、和弦自動辨識
- Django REST API + PostgreSQL 持久化（`.gflow` 歌曲）
- **PlayerBar**：seek、Pause/Resume、A-B loop、BPM、Metronome、SoundFont 播放
- **Practice 視圖**：連續排版、播放游標、auto-scroll
- **`.gflow` 匯入/匯出**、MIDI / Print 匯出
- 記譜擴充：`x`、slide、`h`/`p`/`b`（渲染 + 播放）
- Autosave、快捷鍵面板、離開提示
- **Guitar Pro**：alphaTab 渲染 + **backend 持久化**（PostgreSQL + media）+ lazy load
- **B2 完成**：`PlayerBarBindings`、`useAlphaTabPlayback`、GP Practice 共用 PlayerBar、`SongShellHeader`
- **Phase A 收尾**：PlayerBar mm:ss、Practice Zoom、`ScoreLine.tsx`、`timeSignature` UI
- **B1 收尾**：GP ImportPreview 確認步驟

- **Phase C2**：Token 認證、song ownership、legacy claim、列表分頁/搜尋
- **B3 PoC**：GP→gflow 轉換、MusicXML 匯出

### 仍待完成
- B3 低優先：音訊同步（alphaTab external media）
- 生產環境 auth 強化（HTTPS、session 策略）
- D3：拍長模型 / SVG engraving（需 product decision）

### Sprint C1 — 品質 & 合規 ✅

| 項目 | 狀態 |
|------|------|
| Vitest 單元測試（playbackTime、tabNotation、gflowImport） | ✅ |
| GitHub Actions CI（backend + frontend + docker build） | ✅ |
| MPL-2.0 授權結論（docs/MPL_LICENSING.md + NOTICE.md） | ✅ |
| Bend 輸入 UX（提示 + Esc 取消 + 快捷鍵說明） | ✅ |

---

## 3. 架構演進

### 3.1 目標架構（Phase A 完成後）

```
┌─────────────────────────────────────────────────────────┐
│                      App Shell                          │
│  viewMode: home | edit | preview | practice | library   │
└────────────┬──────────────────────────────┬─────────────┘
             │                              │
    ┌────────▼────────┐            ┌────────▼────────┐
    │  Compose Engine │            │ Practice Engine │
    │  (現有 + 強化)   │            │  (Phase A 新建)  │
    │  TabMeasure     │            │  ScoreScroller  │
    │  EditScoreView  │            │  PlayerBar      │  ← Phase D: Edit 連續樂譜
    │  Fretboard      │            │  CursorSync     │
    │  ChordManager   │            │                 │
    └────────┬────────┘            └────────┬────────┘
             │                              │
             └──────────────┬───────────────┘
                            │
                   ┌────────▼────────┐
                   │   Song Model    │
                   │  (.gflow JSON)  │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  Playback Core  │
                   │  (Phase A: SF2) │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   Django API    │
                   └─────────────────┘
```

### 3.2 Phase B 擴展（alphaTab 整合後）

```
┌──────────────── Song ────────────────┐
│  source: "gflow" | "guitarpro"      │
│  gflowData?: GuitarSong              │
│  alphaTabScore?: AlphaTabScoreRef   │  ← GP/MusicXML 匯入後
└──────────────────────────────────────┘
         │                    │
   Compose Engine      alphaTab Viewer
   (編輯 .gflow)        (渲染 + 播放 GP)
```

**原則**：`.gflow` 歌曲走 Compose + Practice Engine；GP 匯入歌曲走 alphaTab Viewer，可選「簡化匯出為 .gflow」（非必要，Phase B 後期）。

---

## 4. Phase A — 創作工具強化

> 目標：把現有 MVP 打磨成可靠的創作工具，並建立 Practice 視圖與專業 Player 基礎。  
> 預估：4–6 週（3 個 Sprint）

### Sprint A1 — 穩定化（第 1–2 週）

#### A1.1 Bug 修復

| 項目 | 作法 |
|------|------|
| 播放控制列重複 | 抽出 `<PlayerBar />` 元件，移除 `App.tsx` 重複區塊 |
| Pause / Resume | 用 `AudioContext.currentTime` + `playbackOffset` ref 記錄暫停位置 |
| 轉調預覽和弦圖 | 顯示原始 shape + 轉調後名稱，而非用轉調名稱查 library |

#### A1.2 資料互通

| 項目 | 作法 |
|------|------|
| `.gflow` 匯入 | Home 加「Import」按鈕 → `FileReader` 解析 JSON → 驗證 schema → `POST /api/songs/` |
| Section 刪除 | 側欄 section 列表加刪除鈕（confirm）+ 重新排序（↑↓） |
| Section 標題編輯進 Undo | `updateSectionTitle` 改走 `pushHistory()` |

#### A1.3 驗收標準
- [x] 播放可 Pause 後從原位置繼續
- [x] .gflow 匯入後可正常編輯並 Save
- [x] Section 可刪除、排序
- [x] Preview 轉調後和弦圖正確顯示

---

### Sprint A2 — Player & Practice View（第 3–4 週）

#### A2.1 新元件：`PlayerBar`

alphaTab 風格的底部固定播放列：

```
┌──────────────────────────────────────────────────────────────┐
│  ⏮  ⏯  ⏹  │ ━━━━━●━━━━━━━━ │ 0:42/2:15 │ 🔁AB │ ♩120 │ 🔊 │
└──────────────────────────────────────────────────────────────┘
```

| 功能 | 說明 |
|------|------|
| Progress seek | 拖曳進度條跳至對應拍點 |
| 從選取格播放 | 有 selection 時，Play 從該 col 開始 |
| A-B Loop | 設定 loopStart / loopEnd（拍點索引） |
| BPM | 40–240，與 MIDI 匯出同步 |
| Metronome | 保留，每小節第一拍重音 |

**實作**：抽出 `hooks/usePlayback.ts`，管理播放狀態、時間軸、事件排程。

#### A2.2 新視圖：`practice`

路由：`viewMode: 'practice'`

| 特性 | 對照 alphaTab |
|------|--------------|
| 連續排版 | 小節卡片改為無邊框橫向流，section 間分隔線 |
| 播放游標 | 綠色豎線 + 當前拍高亮，跨小節連續 |
| Auto-scroll | 游標接近視窗邊緣時 smooth scroll |
| Zoom | 80% / 100% / 125% / 150% 四档 |
| 和弦 + 歌詞 | 保留在 tab 上方/下方 |

**元件拆分**：
- `components/PracticeView.tsx` — 容器
- `components/ScoreLine.tsx` — 連續小節渲染（重用 TabMeasure 渲染邏輯，readonly 模式）
- `components/PlayerBar.tsx` — 共用播放列

Edit / Preview / Practice 三模式共用 `PlayerBar`。

#### A2.3 音色升級

引入 **SoundFont2** 吉他音色（不依賴 alphaTab）：

| 方案 | 優點 | 缺點 |
|------|------|------|
| **soundfont-player**（推薦） | 輕量、Web Audio 原生 | 需載入 ~1–2MB SF2 |
| tone.js + Sampler | 生態成熟 | bundle 較大 |

**推薦**：`soundfont-player` + `acoustic_guitar_steel` 或自 host 的 SF2 檔。

播放邏輯改為：fret + string → MIDI note → SoundFont trigger。

#### A2.4 驗收標準
- [x] Edit / Practice 模式播放游標同步
- [x] 可 seek、A-B loop、從選取格播放
- [x] 吉他音色可辨識（SoundFont `acoustic_guitar_steel`）
- [x] Practice 模式 auto-scroll 正常
- [x] PlayerBar 顯示 mm:ss 時間（gflow 依 BPM 換算）
- [x] Practice Zoom 四档（80/100/125/150%）
- [x] `ScoreLine.tsx` 獨立元件（Practice 唯讀小節）

---

### Sprint A3 — 記譜深度 & UX 細節（第 5–6 週）

#### A3.1 記號擴充

擴展 cell 字串格式（向後相容）：

| 記號 | 格式 | 鍵盤 | 播放 |
|------|------|------|------|
| 悶弦 | `x` | `x` | 低音量/noise burst |
| 滑音上/下 | `5s` / `5/` | 保留 | Phase A 僅視覺，Phase B 加 pitch bend |
| Hammer-on | `5h7` | 選格後 `h` + 數字 | 兩音依序 |
| Pull-off | `7p5` | `p` | 兩音依序 |
| Bend | `7b9` | `b` + 數字 | 簡化 pitch slide |

**資料模型不變**（仍為 `string` cell），渲染層解析後綴。

#### A3.2 和弦辨識

`getActiveChord()` 升級：
1. 從 6 弦 fret 組合查詢 lookup table（常見開放和弦 + barre 模板）
2. 匹配則顯示名稱（如 `Am7`），否則 `Custom`
3. Chord Manager 建立時即計算並顯示建議名稱

#### A3.3 UX 細節（alphaTab 啟發）

| 項目 | 作法 |
|------|------|
| 快捷鍵面板 | `?` 開啟 modal，列出所有鍵盤操作 |
| Autosave | 編輯後 30 秒 debounce 自動 PUT（可關閉） |
| 離開提示 | `beforeunload` + 有 unsaved changes 時 confirm |
| Header 視圖切換 | `[Edit] [Preview] [Practice]` tab 式切換 |

#### A3.4 驗收標準
- [x] `x`、`h`、`p` 可輸入並正確渲染
- [x] 和弦欄位自動命名常見和弦
- [x] Autosave 正常，離開有提示
- [x] 快捷鍵面板完整
- [x] `timeSignature` 欄位與 UI（Section 編輯器 + Practice 顯示）
- [~] `b`（bend）鍵盤輸入 UX 可再優化

---

## 5. Phase B — alphaTab 整合

> 前提：Phase A 完成且 Practice View + Player 穩定。  
> 預估：4–6 週（2–3 個 Sprint）

### Sprint B1 — GP 匯入 PoC

#### B1.1 依賴與授權

- 套件：`@coderline/alphatab`（MPL-2.0）
- 確認：專案需以 MPL-2.0 相容方式使用（若專案非 MPL，需法務確認或僅 backend 轉換）

#### B1.2 匯入流程

```
User 選 .gp/.gp3/.gp4/.gp5/.gpx/.xml
    → alphaTab load file
    → 顯示在 ImportPreview（alphaTab 渲染容器）
    → User 確認 → 儲存為 "imported" 歌曲
```

**資料模型擴充（Backend）**：

```python
class GuitarSong(models.Model):
    # 現有欄位...
    source = models.CharField(max_length=20, default='gflow')  # 'gflow' | 'imported'
    import_format = models.CharField(max_length=20, null=True)  # 'gp5', 'musicxml'
    import_file = models.FileField(upload_to='imports/', null=True)  # 原始檔
    # gflow 資料仍走 sections JSON；imported 歌曲 sections 可為空
```

或 Phase B 初期：**匯入檔案仅存 frontend IndexedDB / 不上傳 backend**，降低後端改動。  
→ **已升級**：GP 檔案上傳至 Django `import_file`，跨瀏覽器/裝置由 backend 同步。

#### B1.3 新視圖：`import`

Home 加「Import Guitar Pro」→ 檔案選擇 → alphaTab 渲染 → Practice 模式播放。

#### B1.4 驗收標準
- [x] 可匯入 .gp5 檔並看到樂譜（需實檔 smoke test）
- [x] alphaTab SoundFont 播放正常
- [x] 播放游標與 alphaTab 內建 cursor 同步
- [x] IndexedDB 本機存檔（PoC，已改為 backend 持久化）
- [x] alphaTab lazy load（Vite 7 + `@coderline/alphatab-vite`）
- [x] ImportPreview 確認步驟（`ImportPreviewModal`）

---

### Sprint B2 — 雙引擎整合

#### B2.1 統一 Player 介面

```typescript
interface PlaybackEngine {
  play(from?: PlaybackPosition): void;
  pause(): void;
  stop(): void;
  seek(position: PlaybackPosition): void;
  setLoop(start: PlaybackPosition, end: PlaybackPosition): void;
}

// GflowPlaybackEngine — Phase A 的 soundfont-player 實作
// AlphaTabPlaybackEngine — 包裝 alphaTab api.playPause / cursor
```

`PlayerBar` 只依賴 `PlaybackEngine` 介面，切換歌曲來源時注入不同 engine。

#### B2.2 視圖路由

| 歌曲來源 | Edit | Preview | Practice |
|---------|------|---------|----------|
| `gflow` | ✅ 格線編輯 | ✅ 列印視圖 | ✅ 連續視圖 |
| `imported` | ❌ 唯讀提示 | ✅ alphaTab 渲染 | ✅ alphaTab + Player |

#### B2.3 Home 歌曲列表

卡片顯示來源 badge：`GFlow` / `Guitar Pro` / `MusicXML`

#### B2.4 驗收標準
- [x] `PlayerBarBindings` 介面（`types/playback.ts`）
- [x] `useAlphaTabPlayback` 包裝 alphaTab API（含 `playbackRange` A-B loop）
- [x] GP 歌曲 Practice 模式共用 PlayerBar
- [x] GP 與 gflow 共用 `SongShellHeader` App Shell
- [x] Home 來源 badge（GFlow / Guitar Pro / MusicXML）
- [x] alphaTab lazy load，不拖慢 .gflow 開啟
- [x] `SongShellHeader` 抽出（App.tsx 瘦身）
- [ ] App.tsx 進一步拆分 gflow 編輯區（可選）

---

### Sprint B3 — 進階（選做）

| 功能 | 優先 | 狀態 | 說明 |
|------|------|------|------|
| 多軌選擇 | 中 | ✅ | `TrackSelector` + `useAlphaTabTracks`，偏好存 localStorage |
| GP → .gflow 簡化轉換 | 低 | ✅ PoC | `gpToGflow.ts` + Imported 歌曲「Convert to GFlow」 |
| 與音訊檔同步 | 低 | ○ | alphaTab 支援 external media sync |
| MusicXML 匯出 | 低 | ✅ PoC | `musicXmlExport.ts` + Export 選單 |

#### B3.1 多軌選擇（已完成）

- `scoreLoaded` 後列出所有 tracks（名稱、shortName、是否 percussion）
- 點選 chip 切換顯示，`api.renderTracks()` 重绘
- **Guitar** / **All** 快捷按鈕
- 每首 GP 歌曲的選取存 `localStorage`（`guitarflow-tracks-{id}`）

#### B3.2 驗收標準

- [x] 多軌 GP 檔可切換顯示軌道
- [x] 重新開啟同一首歌曲記住軌道選取
- [x] GP → .gflow 轉換 PoC（`services/gpToGflow.ts`）
- [x] MusicXML 匯出（`services/musicXmlExport.ts`）

---

## 6. Phase D — GP 風格 Edit UI

> 目標：gflow **Compose（Edit）模式** 的視覺與互動更接近 **Guitar Pro**，擺脫「試算表格線」感。  
> 策略：**GP Shell, gflow Engine** — 先改呈現層與互動層，**不變更** 6×16 分格資料模型。  
> 優先：**連續樂譜視覺**、**上方 Notation Toolbar**；Inspector / Fretboard dock 為 D2。  
> 預估：4–6 週（2 個 Sprint：D1 + D2）

### 6.0 現況 vs 目標

| 維度 | Edit 現況 | Guitar Pro / 目標 |
|------|----------|-------------------|
| 主畫面 | 小節 **卡片** 2 欄 grid | **連續樂譜** 橫向捲動 |
| 音符呈現 | 6×16 **格線**（試算表感） | **六線譜流** + 小節 ruler |
| 技巧輸入 | 鍵盤快捷鍵為主 | **上方工具列** + 快捷鍵並存 |
| 選取 | 單格 indigo ring | **整欄**（六弦同拍）高亮 |
| Practice | 已接近 GP ✅ | Edit 與 Practice **共用 Score 元件** |

Practice 模式（`PracticeView` + `ScoreLine`）已具連續排版；Phase D 將同一套視覺語言 **回灌到 Edit**，並加上工具列與可編輯互動。

### 6.1 目標布局

```
┌─────────────────────────────────────────────────────────────┐
│  SongShellHeader  [Edit | Preview | Practice]  Save Export │
├─────────────────────────────────────────────────────────────┤
│ NotationToolbar:  x  h  p  b  s/  │ Capo │ Time │ Undo Redo│  ← D1 重點
├──────────┬──────────────────────────────────┬─────────────┤
│ Sections │  ScoreRuler:  |1      |2      |3│  Chord /    │
│ 列表     │  Chords:  Am    G      C         │  Inspector  │
│          │  e|--7h9----------------------|  │  (D2)       │
│          │  B|--7-----------------------|  │             │
│          │  … 橫向 scroll，無卡片外框 …     │             │
├──────────┴──────────────────────────────────┴─────────────┤
│  Fretboard（D2：可折疊 dock）                              │
├─────────────────────────────────────────────────────────────┤
│  PlayerBar（既有，不變）                                    │
└─────────────────────────────────────────────────────────────┘
```

### Sprint D1 — 連續樂譜 + 上方工具列（第 1–3 週）

> **本 Sprint 兩大交付物**：① 連續樂譜視覺 ② NotationToolbar。

#### D1.1 連續樂譜視覺（優先）

| 項目 | 作法 |
|------|------|
| **EditScoreView** | 新建容器，取代 Edit 區 2 欄 measure 卡片 grid |
| **重用 ScoreLine** | 擴充 `ScoreLine` / `TabMeasure`：`mode="edit" \| "readonly"`；Edit 保留 `onCellClick`、selection |
| **橫向流式排版** | Section 內小節橫向排列；section 間分隔線 + 標題（對齊 Practice） |
| **去除卡片 chrome** | 移除 measure 外框、陰影、2-col grid；改 staff 底線 + 小節 barline |
| **ScoreRuler** | 小節號、拍點 tick、`timeSignature` 顯示於樂譜上方 |
| **橫向 scroll** | 樂譜區 `overflow-x-auto`；可選 Shift+滾輪 = 橫向捲動 |
| **選取樣式** | 同一 `colIdx` 六弦整欄高亮（取代單格 ring） |
| **播放游標** | Edit 播放時與 Practice 相同 green 豎線（已有邏輯，對齊樣式即可） |

**元件拆分**：

```
components/EditScoreView.tsx    — Edit 主畫布（連續樂譜 scroll）
components/ScoreRuler.tsx       — 小節/拍 ruler
components/ScoreLine.tsx        — 擴充 edit 模式（既有）
App.tsx                         — Edit 區改渲染 <EditScoreView />
```

**資料模型**：不變（仍 `sections[].measures[].cells[string[][]]`）。

#### D1.2 上方 Notation Toolbar（優先）

Guitar Pro 風格 **固定於樂譜上方** 的記譜工具列（非底部、非右側）：

```
┌──────────────────────────────────────────────────────────┐
│  Technique:  [x] [h] [p] [b] [s] [/]  │  Undo  Redo  ?  │
└──────────────────────────────────────────────────────────┘
```

| 項目 | 作法 |
|------|------|
| **NotationToolbar.tsx** | 新建；icon + label 按鈕列 |
| **技巧按鈕** | `x`（悶弦）、`h`（hammer-on）、`p`（pull-off）、`b`（bend）、`s`/`/`（slide） |
| **互動模式** | 點 toolbar 按鈕 → 進入 pending technique（等同鍵盤 `h`/`p`/`b`…）→ 再輸入數字或點格 |
| **與鍵盤同步** | toolbar 高亮當前 pending；Esc 取消（沿用 C1 bend UX） |
| **Undo / Redo** | 工具列右側，與現有 history 掛鉤 |
| **快捷鍵 `?`** | 保留開啟 shortcuts modal |

**不納入 D1**（避免 scope 膨脹）：拍長選擇（♩♪♬）、Capo 移調 — 仍用 Section 側欄 / 既有 UI。

#### D1.3 App 結構

| 項目 | 作法 |
|------|------|
| **EditView 抽出** | `App.tsx` Edit 區（~420–630 行）→ `components/EditView.tsx` |
| **三欄保留** | 左 Section 列表、中 EditScoreView、右 Chord Tools（D2 再拆 Inspector） |
| **Fretboard** | D1 維持現有位置；D2 改 collapsible dock |

#### D1.4 驗收標準

- [ ] Edit 模式主畫面為 **橫向連續樂譜**，無 2 欄 measure 卡片 grid
- [ ] 小節上方有 **ScoreRuler**（小節號 + time signature）
- [ ] 選取為 **整欄高亮**（六弦同拍）
- [ ] 樂譜上方有 **NotationToolbar**，`x/h/p/b/s/` 可點選並與鍵盤行為一致
- [ ] Edit 與 Practice 的 tab 行視覺一致（同一 `ScoreLine` 家族）
- [ ] 播放游標在 Edit 與 Practice 樣式對齊
- [ ] 既有功能不退化：和弦拖放、指板輸入、Undo/Redo、Save

---

### Sprint D2 — Inspector & 互動深化（第 4–6 週，選做優先序）

> D2 在 D1 視覺骨架穩定後進行；可與 C2 並行。

#### D2.1 Note Inspector

| 項目 | 作法 |
|------|------|
| **NoteInspector.tsx** | 右欄上半：顯示選中格 fret、technique、可下拉修改 |
| **Chord 區** | 右欄下半保留 Chord Library；可折疊 |
| **Toolbar 雙向** | Inspector 改 technique 時同步 toolbar 狀態 |

#### D2.2 Fretboard Dock

| 項目 | 作法 |
|------|------|
| **可折疊** | 預設展開或依 viewport 折疊；GP 式 optional panel |
| **位置** | 貼底（PlayerBar 上方）或右側 split |

#### D2.3 驗收標準

- [ ] 選中音符可在 Inspector 修改 fret / technique
- [ ] Fretboard 可折疊，不遮擋連續樂譜
- [ ] `EditView` 完全取代 App.tsx 內联 Edit 區塊

---

### Sprint D3 — 進階（Backlog，需資料模型評估）

| 功能 | 說明 | 風險 |
|------|------|------|
| 拍長模型（非固定 16 col） | 接近 GP 真實 note duration | 高 — 動 playback / MIDI / API |
| SVG 六線譜 engraving | 取代 CSS grid 渲染 | 中 |
| GP 檔 alphaTab 原生編輯 | gflow Compose、GP Viewer 分離 | 授權 + 雙引擎 |

**原則**：D3 前必須有明確 product decision；**不在 D1/D2 預留過度抽象**。

### 6.2 與其他 Phase 關係

```
Practice (A2) ──reuse──▶ ScoreLine ──extend──▶ EditScoreView (D1)
useEditorState / pending technique (A3, C1) ──▶ NotationToolbar (D1)
App.tsx 拆分 ──▶ EditView (D1) ──▶ C2 使用者隔離
GP imported 歌曲 ──不變──▶ 仍走 alphaTab Viewer（非 gflow Edit）
```

| 歌曲來源 | Edit（D 完成後） | Preview | Practice |
|---------|-----------------|---------|----------|
| `gflow` | ✅ GP 風格連續樂譜 + Toolbar | ✅ | ✅ |
| `imported` | ❌ 唯讀提示 | ✅ alphaTab | ✅ alphaTab |

### 6.3 不建議一次做的事

1. **不要** D1 就改 16 分格為 rhythmic duration 模型  
2. **不要** 在 gflow Edit 嵌入 alphaTab 當編輯器  
3. **不要** 移除鍵盤快捷鍵 — Toolbar 為輔助，非取代  
4. **不要** 重做 PlayerBar / playback core — D 純 UI/UX 層

### 6.4 成功指標（Phase D）

- 新使用者 30 秒內能辨識 Edit 為「樂譜軟體」而非「表格編輯器」
- Edit ↔ Practice 切換時，同一首歌的 **視覺連續性** 無跳躍感
- 常用技巧（x、h、p、b）可 **只點工具列** 完成，無需查快捷鍵表

---

## 7. 資料模型變更（Phase A）

### 7.1 前端 `types.ts` 擴充

```typescript
// types/playback.ts
export interface PlaybackPosition {
  sectionIdx: number;
  measureIdx: number;
  colIdx: number;
}

export interface PlayerBarBindings {
  mode: 'gflow' | 'alphatab';
  // ... PlayerBar 共用 props
}

// types.ts — gflow 與 imported 分離（比單一 model 更清晰）
export interface GuitarSong { /* sections, source?: 'gflow' */ }
export interface ImportedSong { source: 'imported'; importFormat; fileName; }
export type LibrarySong = GuitarSong | ImportedSong;
```

**Phase B**：GP 二進位存 backend `import_file`（`POST /songs/import-score/`），Docker `media_data` volume 持久化。

### 7.2 後端 Phase A 無必要改動

Section 刪除/排序透過現有 PUT diff-and-patch 即可。

Phase B 再新增 `source`、`import_file` 欄位與 migration。

---

## 8. UI/UX 設計規範（alphaTab 啟發）

### 8.1 視圖層級

```
Home
 ├── Create New → Edit
 ├── Open .gflow → Edit | Preview | Practice | Chords
 └── Import GP → Song Shell（Preview | Practice + PlayerBar）

GFlow：Edit（Phase D：連續樂譜 + Toolbar）──→ Preview / Practice / Chords
GP：Preview（唯讀樂譜）/ Practice（PlayerBar + alphaTab cursor）
```

### 8.2 色彩與游標

| 元素 | Edit 模式（D1 後） | Practice 模式 |
|------|-------------------|--------------|
| 選取 | 整欄 indigo 高亮（六弦同拍） | — |
| 播放游標 | green 豎線 + bg highlight | 同上，更粗 |
| 和弦 | violet badge | 同上 |
| Section 分隔 | 標題 bar + 細線 | 細線 + 標題 |
| NotationToolbar | 樂譜上方固定列 | — |

### 8.3 PlayerBar 位置

- Edit / Practice：底部 fixed，`z-50`
- Preview：可選顯示（預設隱藏，列印時隱藏）
- 手機：`flex-wrap`，progress bar 全寬

### 8.4 Lazy Loading

Phase B 的 alphaTab（~500KB+）使用 dynamic import：

```typescript
const loadAlphaTab = () => import('@coderline/alphatab');
```

僅在 Import / 開啟 GP 歌曲時載入。

---

## 9. 測試策略

### Phase A

| 層級 | 範圍 |
|------|------|
| Backend | 現有 3 tests + import song POST validation |
| Frontend unit | `usePlayback` 時間計算、cell 記號解析 |
| Frontend integration | .gflow 匯入 round-trip、Section 刪除 save |
| Manual | 播放 seek/loop、Practice scroll、SoundFont 音色 |

### Phase B

| 層級 | 範圍 |
|------|------|
| Import | 各版本 GP 檔 smoke test（fixtures） |
| Engine swap | GflowEngine vs AlphaTabEngine 介面一致性 |

---

### Phase D

| 層級 | 範圍 |
|------|------|
| Frontend unit | `ScoreLine` edit/readonly props、toolbar pending state |
| Frontend integration | Edit 連續樂譜選取/輸入與既有 `useEditorState` 一致 |
| Visual regression | Edit ↔ Practice 同一首歌布局一致（manual） |
| Manual | Toolbar 點選 = 鍵盤快捷鍵；橫向 scroll；整欄選取 |

---

## 10. 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| SoundFont 載入慢 | 首次播放延遲 | 預載 + loading indicator |
| alphaTab bundle 大 | 首屏變慢 | lazy load，僅 GP 歌曲需要 |
| MPL-2.0 授權 | 法律風險 | Phase B 前確認；或僅 CLI 轉換不嵌入 |
| GP 匯入與 gflow 資料不一致 | 使用者困惑 | 來源 badge + 唯讀提示 |
| App.tsx 持續膨脹 | 維護困難 | Phase A1 起拆分 PlayerBar、usePlayback；**D1 抽 EditView** |
| Edit 改版 regression | 創作流程中斷 | D1 驗收清單 + 保留鍵盤路徑；分 PR 交付 |

---

## 11. 成功指標

### Phase A 完成
- 創作者可在 5 分鐘內完成「新建 → 輸入 tab → 加和弦 → 播放練習 → 存檔」全流程
- Practice 模式播放體驗可與 alphaTab demo 的 **Player 操作** 對齊（seek/loop/BPM）
- 零已知 P0 bug（播放、存檔、匯入）

### Phase B 完成
- 可匯入常見 `.gp5` 檔並播放
- .gflow 創作流程不受 GP 功能影響
- alphaTab 按需載入，不拖慢 .gflow 歌曲開啟速度

---

### Phase D 完成
- Edit 模式視覺與 Practice **同一套連續樂譜**語言
- 上方 NotationToolbar 覆蓋 80%+ 日常技巧輸入場景
- 零 P0 regression（Save、播放、和弦、匯入匯出）

---

## 12. 執行順序總覽

```
✅ Phase A
  ✅ Sprint A1  穩定化（bug、匯入、section）
  ✅ Sprint A2  PlayerBar + Practice View + SoundFont
  ✅ Sprint A3  記號、和弦辨識、UX 細節（bend UX 可再優化）

✅ Sprint B1  alphaTab PoC（GP 匯入 + 渲染 + 播放 + IndexedDB + ImportPreview）

🔄 Sprint B2  雙引擎 Player + 視圖路由（✅ 完成）
  ✅ PlayerBarBindings + useAlphaTabPlayback + playbackRange A-B
  ✅ SongShellHeader 統一 App Shell
  ✅ GP Preview/Practice + 共用 PlayerBar
  ✅ 多軌選擇（TrackSelector）

✅ Sprint C1  品質 & 合規（Vitest、CI、MPL-2.0、bend UX）

📋 Phase D   GP 風格 Edit UI（✅ D1 + D2 完成）
  ✅ Sprint D1  連續樂譜視覺 + NotationToolbar + EditScoreView
  ✅ Sprint D2  NoteInspector + Fretboard dock + EditView
  ○  Sprint D3  拍長模型 / SVG engraving（backlog）

✅ Phase C2   使用者隔離（完成）
  ✅ Token 認證 API + song.owner + queryset 隔離
  ✅ 前端 AuthModal + useAuth + apiClient
  ✅ SongShell / Home 登出
  ✅ Legacy claim（單首 + 批量）+ 列表分頁/搜尋

🔄 Sprint B3  進階（GP→gflow PoC ✅、MusicXML ✅；音訊同步 backlog）
```

---

## 13. 下一步

1. ~~Review 本文件、確認 Phase A Sprint 拆分~~ ✅
2. ~~完成 Sprint A1–A3 核心功能~~ ✅
3. ~~完成 Sprint B1 GP PoC~~ ✅
4. ~~**Sprint B2 收尾**~~ ✅
5. ~~**Sprint B3 多軌選擇**~~ ✅
6. ~~**Phase A 收尾**（mm:ss、Zoom、ScoreLine、timeSignature）~~ ✅
7. ~~**GP backend 持久化**~~ ✅
8. ~~**Sprint C1 品質 & 合規**~~ ✅
9. ~~**Phase D 規劃**（連續樂譜 + Toolbar）~~ ✅
10. ~~**Sprint D1 + D2**（EditScoreView、NotationToolbar、EditView、Inspector）~~ ✅
11. ~~**Phase C2**~~ ✅
    - ✅ Django User + `GuitarSong.owner` + Token 認證
    - ✅ 前端登入/註冊 + API 隔離
    - ✅ SongShell / Home 登出、legacy claim、列表分頁/搜尋
12. **Sprint B3 / D3**（音訊同步、拍長模型 — 低優先 backlog）
