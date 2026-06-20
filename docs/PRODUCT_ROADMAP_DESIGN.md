# GuitarFlow 產品路線設計

> 策略：**C — 混合路線**（創作 + 閱譜/練習）  
> 執行順序：**先 A（創作工具）→ 再 B（alphaTab 整合）**  
> 參考：[alphaTab](https://github.com/CoderLine/alphaTab) UI/UX 與功能設計  
> 日期：2025-06-20

---

## 1. 產品願景

GuitarFlow Studio 最終成為 **雙模式吉他音樂 App**：

| 模式 | 用途 | 核心體驗 |
|------|------|---------|
| **Compose（創作）** | 詞曲作者快速寫 Tab | 格線輸入、和弦拖放、雲端存檔 |
| **Practice（練習）** | 閱譜、跟彈、循環練習 | 連續樂譜、專業 Player、SoundFont 音色 |

兩模式共用同一首歌曲，但視圖與互動邏輯不同——類似 alphaTab 將「渲染/播放 SDK」與「外層 App UI」分離的思路，GuitarFlow 將 **編輯引擎** 與 **練習引擎** 分離，共用資料層。

---

## 2. 現況摘要

### 已有能力
- 6 弦 × 16 分音符格線編輯器（鍵盤/指板輸入）
- Section / Measure 管理、Undo/Redo
- 和弦庫（Global + Custom）、拖放、Chord Manager
- Django REST API + PostgreSQL 持久化
- 基礎 Web Audio 播放、轉調、Preview、.gflow / MIDI / Print 匯出

### 關鍵缺口
- 播放體驗不完整（無 seek、Pause 重頭、控制列重複）
- 無 .gflow 匯入、無 Section 刪除 UI
- 記譜深度不足（僅 slide，無 bend/h/p/x 等）
- 無 Practice 連續視圖
- 無 Guitar Pro / MusicXML 支援
- 無使用者隔離

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
    │  Fretboard      │            │  PlayerBar      │
    │  ChordManager   │            │  CursorSync     │
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
- [ ] 播放可 Pause 後從原位置繼續
- [ ] .gflow 匯入後可正常編輯並 Save
- [ ] Section 可刪除、排序
- [ ] Preview 轉調後和弦圖正確顯示

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
- [ ] Edit / Practice 模式播放游標同步
- [ ] 可 seek、A-B loop、從選取格播放
- [ ] 吉他音色可辨識（非合成器三角波）
- [ ] Practice 模式 auto-scroll 正常

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
- [ ] `x`、`h`、`p` 可輸入並正確渲染
- [ ] 和弦欄位自動命名常見和弦
- [ ] Autosave 正常，離開有提示
- [ ] 快捷鍵面板完整

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

#### B1.3 新視圖：`import`

Home 加「Import Guitar Pro」→ 檔案選擇 → alphaTab 渲染 → Practice 模式播放。

#### B1.4 驗收標準
- [ ] 可匯入 .gp5 檔並看到樂譜
- [ ] alphaTab SoundFont 播放正常
- [ ] 播放游標與 alphaTab 內建 cursor 同步

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
- [ ] 同一 PlayerBar 可播放 .gflow 與 GP 歌曲
- [ ] GP 歌曲在 Practice 模式體驗接近 alphaTab demo
- [ ] .gflow 歌曲不受 alphaTab 依賴影響（bundle 可 lazy load alphaTab）

---

### Sprint B3 — 進階（選做）

| 功能 | 優先 | 說明 |
|------|------|------|
| GP → .gflow 簡化轉換 | 低 | 提取主旋律 tab 到 gflow sections，失敗則 fallback |
| 多軌選擇 | 中 | alphaTab track selector UI |
| 與音訊檔同步 | 低 | alphaTab 支援 external media sync |
| MusicXML 匯出 | 低 | 長期目標 |

---

## 6. 資料模型變更（Phase A）

### 6.1 前端 `types.ts` 擴充

```typescript
export interface TabSection {
  id: string;
  title: string;
  capo: number;
  timeSignature?: [number, number];  // 預設 [4, 4]，Phase A3
  measures: string[][][];
  chords: (string | null)[][];
  lyrics: (string | null)[][];
}

export interface PlaybackPosition {
  sectionIdx: number;
  measureIdx: number;
  colIdx: number;
}

export interface GuitarSong {
  // 現有欄位...
  source?: 'gflow' | 'imported';  // Phase B
}
```

### 6.2 後端 Phase A 無必要改動

Section 刪除/排序透過現有 PUT diff-and-patch 即可。

Phase B 再新增 `source`、`import_file` 欄位與 migration。

---

## 7. UI/UX 設計規範（alphaTab 啟發）

### 7.1 視圖層級

```
Home
 ├── Create New → Edit
 ├── Open Song → Edit | Practice（記住上次視圖）
 └── Import GP → ImportPreview → Practice（Phase B）

Edit ──→ Preview（列印）
  │
  └──→ Practice（練習）
```

### 7.2 色彩與游標

| 元素 | Edit 模式 | Practice 模式 |
|------|----------|--------------|
| 選取格 | indigo ring | — |
| 播放游標 | green 豎線 + bg highlight | 同上，更粗 |
| 和弦 | violet badge | 同上 |
| Section 分隔 | 標題 bar | 細線 + 標題 |

### 7.3 PlayerBar 位置

- Edit / Practice：底部 fixed，`z-50`
- Preview：可選顯示（預設隱藏，列印時隱藏）
- 手機：`flex-wrap`，progress bar 全寬

### 7.4 Lazy Loading

Phase B 的 alphaTab（~500KB+）使用 dynamic import：

```typescript
const loadAlphaTab = () => import('@coderline/alphatab');
```

僅在 Import / 開啟 GP 歌曲時載入。

---

## 8. 測試策略

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

## 9. 風險與緩解

| 風險 | 影響 | 緩解 |
|------|------|------|
| SoundFont 載入慢 | 首次播放延遲 | 預載 + loading indicator |
| alphaTab bundle 大 | 首屏變慢 | lazy load，僅 GP 歌曲需要 |
| MPL-2.0 授權 | 法律風險 | Phase B 前確認；或僅 CLI 轉換不嵌入 |
| GP 匯入與 gflow 資料不一致 | 使用者困惑 | 來源 badge + 唯讀提示 |
| App.tsx 持續膨脹 | 維護困難 | Phase A1 起拆分 PlayerBar、usePlayback |

---

## 10. 成功指標

### Phase A 完成
- 創作者可在 5 分鐘內完成「新建 → 輸入 tab → 加和弦 → 播放練習 → 存檔」全流程
- Practice 模式播放體驗可與 alphaTab demo 的 **Player 操作** 對齊（seek/loop/BPM）
- 零已知 P0 bug（播放、存檔、匯入）

### Phase B 完成
- 可匯入常見 `.gp5` 檔並播放
- .gflow 創作流程不受 GP 功能影響
- alphaTab 按需載入，不拖慢 .gflow 歌曲開啟速度

---

## 11. 執行順序總覽

```
Phase A
  Sprint A1  穩定化（bug、匯入、section）
  Sprint A2  PlayerBar + Practice View + SoundFont
  Sprint A3  記號、和弦辨識、UX 細節

Phase B
  Sprint B1  alphaTab PoC（GP 匯入 + 渲染 + 播放）
  Sprint B2  雙引擎 Player + 視圖路由
  Sprint B3  進階（多軌、轉換，選做）
```

---

## 12. 下一步

1. **請 review 本文件**，確認 Phase A Sprint 拆分與優先順序。
2. 確認後，產出 **Sprint A1 實作計畫**（具體檔案、task 順序、預估工時）。
3. 開始 A1.1：抽出 `PlayerBar` + 修播放 bug。
