# Netflix Dual Subtitles 雙語字幕

A Chrome extension that automatically displays **English subtitles** at the top of the screen while you watch Netflix with any other language selected — no manual setup required.

Chrome 擴充功能，在 Netflix 觀看時自動在畫面頂端顯示**英文字幕**，同時保留您選擇的語言字幕，輕鬆實現雙語學習。

---

## Features / 功能

- **Fully automatic** — select your language in Netflix; English loads in the background within a few seconds.  
  **全自動** — 在 Netflix 選好語言字幕，英文字幕在幾秒內自動於背景載入。

- **Sliding context window** — shows up to 3 lines: the previous cue, the current cue, and the upcoming cue (within ±2 seconds). The current line is full brightness; adjacent lines are smaller and dimmed.  
  **滑動字幕視窗** — 同時顯示最多 3 組字幕：前一句、當前句、下一句（±2 秒範圍內）。當前句全亮，前後句縮小半透明。

- **Annotation filtering** — cues that consist entirely of `[sound descriptions]` (e.g. `[Music]`, `[laughs]`) are hidden by default.  
  **旁白過濾** — 全行都是 `[旁白描述]` 格式的字幕（如 `[Music]`、`[laughs]`）預設隱藏。

- **Top-of-screen placement** — English subtitle sits at the top, separate from Netflix's native subtitle at the bottom, so the two never overlap.  
  **固定頂端** — 英文字幕顯示在畫面頂端，與 Netflix 原生字幕（底部）分開，不會互相遮擋。

---

## Installation / 安裝方式

### Step 1 — Generate Icons / 步驟一：產生圖示

> Skip if `icons/` already contains the three PNG files.  
> 若 `icons/` 資料夾已有三個 PNG 圖示檔案，可跳過此步驟。

1. Open `generate-icons.html` in Chrome (drag the file into a new tab).
2. Click **Download** for each of the three icon sizes.
3. Move the downloaded files into `netflix-extension/icons/`.

---

1. 將 `generate-icons.html` 拖曳到 Chrome 新分頁開啟。
2. 點擊三個尺寸各自的 **Download** 按鈕下載。
3. 將下載的檔案移到 `netflix-extension/icons/` 資料夾。

---

### Step 2 — Load the Extension / 步驟二：載入擴充功能

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `netflix-extension` folder.
5. The extension icon appears in the Chrome toolbar.

---

1. 開啟 Chrome，前往 `chrome://extensions`。
2. 開啟右上角**開發人員模式**。
3. 點擊**載入未封裝項目**。
4. 選擇 `netflix-extension` 資料夾。
5. 工具列將出現擴充功能圖示。

---

## How to Use / 使用方法

1. Go to Netflix and start playing any title.
2. Open the subtitle picker and select your preferred language (e.g. **Traditional Chinese 繁體中文**).
3. Wait about 5 seconds — the extension fetches the English subtitle track automatically in the background.
4. Both subtitles appear simultaneously:
   - **Top of screen**: English (sliding context window, extension overlay)
   - **Bottom of screen**: Your selected language (Netflix's native player)

---

1. 前往 Netflix 開始播放任何節目。
2. 點擊字幕圖示，選擇您慣用的語言（例如**繁體中文**）。
3. 等待約 5 秒，擴充功能自動在背景抓取英文字幕。
4. 兩組字幕同時顯示：
   - **畫面頂端**：英文（滑動字幕視窗，擴充功能疊加）
   - **畫面底部**：您選擇的語言（Netflix 原生顯示）

---

## Settings / 設定

Click the extension icon in the toolbar to open the popup:

點擊工具列的擴充功能圖示開啟設定面板：

| Setting | Default | Description / 說明 |
|---|---|---|
| **Show English subtitle** | On | Turn the English overlay on or off / 開啟或關閉英文字幕疊加 |
| **Hide [annotations]** | On | Hide cues like `[Music]` or `[laughs]` / 隱藏旁白音效描述字幕 |
| **Font Size 字幕大小** | Medium 中字 | Choose 小字 (small), 中字 (medium), or 大字 (large). 中字 is twice 小字; 大字 is four times 小字 / 選擇小字、中字或大字。中字為小字兩倍，大字為小字四倍 |

The popup also shows the number of English cues loaded and a debug panel for troubleshooting.

設定面板也會顯示目前已載入的英文字幕筆數，以及供除錯用的詳細資訊面板。

---

## Troubleshooting / 常見問題

### The English subtitle doesn't appear / 英文字幕沒有出現

- Make sure you are on a **watch page** (`netflix.com/watch/...`) and the video is playing.
- After the extension loads, wait up to 5–10 seconds for the automatic fetch to complete.
- Try clicking **⟳ Re-fetch EN** in the popup to trigger a manual re-fetch.
- Confirm the title has an **English subtitle** available in Netflix's language picker — some regional content may not have one.
- For persistent issues: open Chrome DevTools (F12) → Console and look for `[DualSub]` log messages.

---

- 確認在**觀看頁面**（`netflix.com/watch/...`）且影片正在播放。
- 擴充功能載入後最多等待 5–10 秒，讓自動抓取完成。
- 可點擊設定面板中的 **⟳ Re-fetch EN** 手動觸發重新抓取。
- 確認該節目在 Netflix 字幕選單中有**英文字幕**可選，部分地區限定內容可能沒有英文字幕。
- 若問題持續：開啟 Chrome 開發者工具（F12）→ Console，搜尋 `[DualSub]` 的記錄訊息。

---

### After updating the extension, subtitles stopped working / 更新後字幕消失

When the extension is updated, already-open Netflix tabs need to be refreshed to load the new content script:

1. Go to `chrome://extensions` and reload the extension.
2. **Close the Netflix tab completely** and open a new one (a simple page refresh is not enough).

---

更新擴充功能後，已開啟的 Netflix 分頁需要重新載入才能取得新的 content script：

1. 前往 `chrome://extensions` 重新載入擴充功能。
2. **完全關閉 Netflix 分頁**後重新開啟（單純按 F5 重新整理不夠）。

---

### Compatible browsers / 相容瀏覽器

- Google Chrome ✓
- Microsoft Edge ✓
- Brave ✓
- Vivaldi ✓
- Firefox — *not supported* (different extension API)

---

## Technical Notes / 技術說明

- Built with **Chrome Manifest V3**, no external dependencies.
- `injected.js` runs in the page's **MAIN world** to intercept Netflix's `fetch` and `XMLHttpRequest` calls and capture subtitle CDN responses.
- When a subtitle URL is not directly available from the player API, the extension briefly switches the active subtitle track to English (≈2 s) to trigger Netflix's internal CDN fetch, then restores the original track.
- `content.js` runs in the **isolated world**, manages the overlay DOM, and communicates with the popup.
- Subtitle timing uses binary search against the video's `currentTime` for O(log n) lookup per 100 ms poll.
- `pointer-events: none` on the overlay ensures Netflix player controls remain fully accessible.

---

## License / 授權

Apache 2.0 — see the root `LICENSE` file.
