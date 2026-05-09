# Netflix Dual Subtitles 雙語字幕

A Chrome extension that simultaneously displays **English subtitles** alongside the language you selected on Netflix — no matter which language you choose as your primary subtitle.

Chrome 擴充功能，在 Netflix 觀看時自動同步顯示**英文字幕**與您選擇的語言字幕，讓雙語學習更輕鬆。

---

## What It Does / 功能說明

| | English | 中文 |
|---|---|---|
| Primary line | Your selected language (e.g. Traditional Chinese) | 您選擇的語言（如繁體中文） |
| Secondary line | **Always English** | **固定顯示英文** |
| Position | Switchable: above or below primary | 可切換：英文在上或在下 |

The extension intercepts Netflix's subtitle data directly from the player, so no manual setup is required — simply select your preferred subtitle language in Netflix and the English subtitle loads automatically.

本外掛直接攔截 Netflix 播放器的字幕資料，無需手動操作。只要在 Netflix 選擇您慣用的語言字幕，英文字幕即自動載入。

---

## Installation / 安裝方式

### Step 1 — Generate Icons / 步驟一：產生圖示

> Skip if you already have icons in the `icons/` folder.
> 如果 `icons/` 資料夾已有圖示檔案，可跳過此步驟。

1. Open the file `generate-icons.html` in Chrome (drag it into a new tab).
2. Click **Download** for each of the three icon sizes.
3. Move the downloaded files into the `netflix-extension/icons/` folder, replacing any existing files.

---

1. 用 Chrome 開啟 `generate-icons.html`（直接拖曳到新分頁）。
2. 點擊三個圖示尺寸各自的 **Download** 按鈕下載。
3. 將下載的檔案移到 `netflix-extension/icons/` 資料夾，覆蓋原有檔案。

---

### Step 2 — Load the Extension / 步驟二：載入擴充功能

1. Open Chrome and go to: `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `netflix-extension` folder.
5. The extension icon (red/white split) will appear in your Chrome toolbar.

---

1. 開啟 Chrome，前往：`chrome://extensions`
2. 開啟右上角的**開發人員模式**。
3. 點擊**載入未封裝項目**。
4. 選擇 `netflix-extension` 資料夾。
5. 工具列將出現擴充功能圖示。

---

## How to Use / 使用方法

1. Go to **Netflix** and start playing any title.
2. Open Netflix's subtitle picker (the speech bubble icon in the player controls).
3. Select your preferred subtitle language — **Traditional Chinese** (繁體中文) is recommended.
4. The extension automatically fetches the **English subtitle track** in the background.
5. Both subtitles appear simultaneously:
   - **Line 1**: Your selected language (from Netflix's native player)
   - **Line 2**: English (from the extension overlay, below by default)

---

1. 前往 **Netflix** 開始播放任何節目。
2. 點擊播放器控制列中的字幕圖示（對話框圖案）。
3. 選擇您慣用的語言字幕，建議選擇**繁體中文**。
4. 擴充功能會在背景自動抓取**英文字幕**。
5. 兩行字幕同時顯示：
   - **第一行**：您選擇的語言（Netflix 原生顯示）
   - **第二行**：英文（擴充功能疊加層，預設在下方）

---

## Settings / 設定

Click the extension icon in the toolbar to open the popup:

點擊工具列的擴充功能圖示開啟設定面板：

| Setting | Description | 說明 |
|---|---|---|
| **Show English subtitle** toggle | Turn the English overlay on or off | 開啟或關閉英文字幕疊加 |
| **Position: Above** | English appears above the primary subtitle | 英文字幕顯示在主字幕上方 |
| **Position: Below** *(default)* | English appears below the primary subtitle | 英文字幕顯示在主字幕下方（預設） |

The popup also shows how many English cues are currently loaded.

設定面板也會顯示目前已載入的英文字幕筆數。

---

## Troubleshooting / 常見問題

### The English subtitle doesn't appear / 英文字幕沒有出現

- Make sure you are on a **watch page** (`netflix.com/watch/...`) and the video is playing.
- Check that the title has **English subtitles** available in Netflix's language picker. Some regional content may not have an English subtitle track.
- Open Chrome DevTools (F12) → Console, and look for `[DualSub]` log messages to diagnose.

---

- 確認您在**觀看頁面**（`netflix.com/watch/...`）且影片正在播放。
- 確認該節目在 Netflix 字幕選單中有**英文字幕**選項。部分地區限定內容可能沒有英文字幕。
- 開啟 Chrome 開發者工具（F12）→ Console，搜尋 `[DualSub]` 的記錄訊息進行診斷。

---

### The subtitle is out of sync / 字幕時間不同步

Netflix subtitle timing is embedded in the subtitle file and is matched against the video's actual playback time. If subtitles drift, try:
- Pausing and resuming the video.
- Seeking (scrubbing) the video a few seconds.

---

Netflix 字幕時間軸直接來自字幕檔案，並與影片播放時間對應。若字幕不同步，請嘗試：
- 暫停後繼續播放。
- 快轉或倒退幾秒。

---

### The extension icon shows an error / 擴充功能圖示顯示錯誤

Make sure the `icons/` folder contains all three PNG files (`icon16.png`, `icon48.png`, `icon128.png`). Open `generate-icons.html` and download them if missing.

請確認 `icons/` 資料夾內有三個 PNG 檔案（`icon16.png`、`icon48.png`、`icon128.png`）。若缺少，請開啟 `generate-icons.html` 下載。

---

### Works on Chromium-based browsers / 相容瀏覽器

- Google Chrome ✓
- Microsoft Edge ✓
- Brave ✓
- Vivaldi ✓
- Firefox — *not supported* (uses a different extension API)

---

## Technical Notes / 技術說明

- Built with **Chrome Manifest V3**.
- No external dependencies — pure vanilla JavaScript.
- Uses `document_start` injection to intercept Netflix's player manifest before subtitle URLs are requested.
- English subtitles are fetched automatically from the manifest's `timedtexttracks` array.
- A `MutationObserver`-free polling approach (`setInterval` at 100 ms) is used for subtitle timing synchronization, avoiding performance issues on Netflix's React-heavy UI.
- `pointer-events: none` on the overlay ensures Netflix player controls remain fully accessible.

---

## License / 授權

Apache 2.0 — see the root `LICENSE` file.
