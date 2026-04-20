# 🚌 公車快到了 — Bus Coming Alert

台北市 ／ 新北市 公車即時到站語音提醒，專為年長使用者設計的無障礙公車通知 Progressive Web App (PWA)。

**Live URL：** `https://eb-barry.github.io/Bus-coming-alert/`

---

## ✨ 主要功能

### 🔔 即時監控
- 輸入公車號碼，選擇去程或返程後**自動加入並立即開始監控**，無需額外按鈕
- 同時監控最多 **8 條**路線，可隨時累加新路線而不中斷監控
- 支援台北市與新北市所有公車路線，包含幹線公車（自動號碼轉名稱）

### 🎙️ 三模式語音播報
| 模式 | 說明 |
|------|------|
| 👨 男聲 TTS | 系統 TTS 男聲（較低音調）|
| 👩 女聲 TTS | 系統 TTS 女聲（預設）|
| 🎙️ 混合模式 | 固定詞彙使用 MP3 音檔，路線名稱與站名由 TTS 合成

- 公車號碼**逐位播報**：647 讀作「六四七」，而非「六百四十七」
- 即時到站狀況紅色 Banner 右側設有**語音開關按鈕**（白底圓形，SVG 喇叭圖示）：
  - 開啟：紅色喇叭 + 音波
  - 關閉：灰色喇叭 + 粗紅叉（stroke-width 4，清晰可辨）
  - 關閉時立即停止播報並清空佇列；重啟 App 後自動恢復開啟

### 📍 GPS 定位
- App 啟動自動靜默取得位置，Header 小圓點顯示定位狀態
- 每 30 秒追蹤位移，移動超過 50 公尺自動重新計算最近站牌

### 🚨 到站偵測與收尾流程
1. 公車到站 → 全螢幕紅色警示
2. 使用者按「知道了」→ 播放「您已上車，祝您旅程愉快」
3. 音訊**完整播完後**才顯示綠色感謝結束畫面（不被截斷）
4. **智慧上車 / 錯過偵測**：到站 30 秒後 GPS 位移 ≥ 50 公尺判定為已上車，否則判定為錯過公車，播放對應語音並自動停止該路線監控

### 📱 PWA 功能
- 加入主畫面以獨立 App 模式運行（iOS 26+ 預設 Web App 模式）
- Service Worker 離線快取（v5）
- iOS：WakeLock 螢幕常亮 + AudioContext 每 20 秒靜音 ping 背景保活
- Android：背景推播通知 + 震動提醒（iOS 不支援推播，相關 UI 自動隱藏）

### ⌨️ 大字鍵盤
- 專為長輩設計，彩色路線前綴（紅、藍、綠、棕、橘、小、幹線、F）
- 按「幹線」鍵展示 9 條無數字前身幹線公車清單，再按一次收起
- **鍵盤按鍵震動回饋**（設定頁開關）：
  - iOS 18+：`<input type="checkbox" switch>` 觸發系統 Haptic 觸覺回饋
  - Android：`navigator.vibrate()` 震動
  - iOS 17 以下：無法實現（系統限制）

---

## 幹線公車號碼對照表（台北市）

| 輸入號碼 | TDX 路線名稱 |
|:-------:|-----------|
| 15 | 和平幹線 |
| 220 | 中山幹線 |
| 232 | 南京幹線 |
| 236 | 羅斯福路幹線 |
| 263 | 仁愛幹線 |
| 287 | 內湖幹線 |
| 304 | 承德幹線 |
| 306 | 重慶幹線 |
| 550 | 忠孝幹線 |
| 620 | 北環幹線 |
| 650 | 基隆路幹線 |

幹線按鍵另提供：松江新生幹線、復興幹線、東環幹線、南環幹線、北環幹線、民生幹線、民權幹線、內湖幹線、重慶幹線

---

## API 速率管理

TDX 免費帳號：每分鐘最多 5 次呼叫（每 IP）。動態更新頻率：

| 公車距離使用者 | 更新頻率 |
|:----------:|:-------:|
| 超出提醒範圍 | 每 60 秒 |
| 進入提醒範圍 | 每 30 秒 |
| 距離 ≤ 2 站 | 每 15 秒 |

每次更新只呼叫 **1 次** `RealTimeNearStop` API（已移除 ETA 查詢以節省配額）。  
速率限制器：超過配額時自動跳過該輪次，顯示「API 頻率限制中」。

---

## 申請 TDX API 金鑰

1. 前往 [tdx.transportdata.tw](https://tdx.transportdata.tw) 免費申請
2. 建立應用程式，取得 **Client ID** 與 **Client Secret**
3. 在 App 設定（⚙️）中輸入；金鑰以遮罩顯示（`abcd••••••••wxyz`），儲存於裝置本地，不上傳任何伺服器

---

## 混合語音 MP3 音檔

混合模式（設定頁空白欄位輸入 `1212` 啟用）需在 repo 中放入以下音檔。  
**檔名即為錄製文字**，放入 `audio/male/` 資料夾：

```
audio/
  male/
    目前已經到達.mp3
    距離您的站牌還有.mp3
    站請準備上車.mp3
    已經到達.mp3
    請立刻準備上車.mp3
    您已經上車祝您旅程愉快.mp3
    已經過站請等待下一班車.mp3
```

> MP3 音量透過 Web Audio API GainNode 放大至 **200%**，確保音量與 TTS 一致。  
> GainNode 在預載時建立（`connectMp3Gain` 只執行一次），避免音量不穩定。

---

## 檔案結構

```
Bus-coming-alert/
  index.html              # 主程式（所有功能合一）
  manifest.json           # PWA 設定
  sw.js                   # Service Worker (Cache v5)
  apple-touch-icon.png    # iOS 主畫面圖示 180×180 ← 最重要
  icon-144.png
  icon-152.png
  icon-167.png            # iPad
  icon-180.png
  icon-192.png            # Android / manifest
  icon-512.png            # PWA 啟動畫面
  audio/
    male/                 # MP3 混合語音音檔
  README.md
```

---

## 部署步驟

1. 上傳所有檔案至 GitHub repo 根目錄
2. Settings → Pages → Source：`main` branch 根目錄
3. 約 2 分鐘後生效

### iOS 圖示不更新解決方法
1. Safari 設定 → 清除歷史記錄與網站資料
2. 刪除主畫面舊捷徑
3. 重新開啟網址，分享 → 加入主畫面

> **重要**：iOS `apple-touch-icon` 只接受真實檔案路徑，不支援 base64 data URL。

---

## 設定功能一覽

| 設定項目 | 說明 |
|---------|------|
| TDX Client ID / Secret | API 金鑰，遮罩顯示，點擊輸入框顯示完整值 |
| 提前幾站開始提醒 | 2–7 站，預設 5 站 |
| 語音播報聲音 | 男聲 / 女聲 TTS；設定頁空白欄輸入 `1212` 啟用混合模式 |
| 字體大小 | 標準 / 大字 / 特大 |
| 鍵盤震動回饋 | 開關；iOS 18+ Haptic / Android 震動 |
| 站牌資料快取 | 7 天本地快取，可手動強制更新 |
| 背景通知測試 | Android 限定，3 秒延遲測試推播 |
| 語音測試 | 播放範例語音（同時解鎖 iOS 音訊）|

---

## 瀏覽器支援

| 功能 | iOS Safari | Android Chrome | 桌面 Chrome/Edge |
|------|:---------:|:--------------:|:---------------:|
| 基本監控與 GPS | ✅ | ✅ | ✅ |
| TTS 語音播報 | ✅ | ✅ | ✅ |
| 螢幕常亮 WakeLock | ✅ | ✅ | ✅ |
| 背景推播通知 | ❌ | ✅ | ✅ |
| 背景震動 | ❌ | ✅ | ❌ |
| 鍵盤 Haptic 回饋 | ✅ iOS 18+ | ✅ | ❌ |
| MP3 混合語音 | ✅ | ✅ | ✅ |
| 背景 JS 保活 | ⚠️ 部分 | ✅ | ✅ |

> **iOS 背景限制**：JS 與 API 呼叫在背景時會被系統凍結。建議等車時保持螢幕開啟。

---

## 技術架構

| 技術 | 用途 |
|-----|------|
| HTML + CSS + Vanilla JS | 純前端，無框架依賴 |
| TDX 運輸資料流通服務 | OAuth 2.0 Client Credentials，公車即時位置 |
| Web Speech API | TTS 語音合成，男/女聲音調切換 |
| Web Audio API | AudioContext 背景保活 + GainNode 200% 音量 |
| Geolocation API | `watchPosition` GPS 持續追蹤 |
| Service Worker | 離線快取 + Android 推播 |
| WakeLock API | 螢幕常亮 |
| Vibration API / iOS Haptic | 鍵盤觸覺回饋（平台自動切換）|
| localStorage | API 金鑰遮罩儲存、偏好設定、7 天站牌快取 |

---

## 版本記錄

| 版本 | 主要更新 |
|:---:|---------|
| **v5** | 自訂 App 圖示（1024×1024）、修正 iOS `apple-touch-icon` 不支援 base64、SW 快取升級、喇叭按鈕改為白底 SVG 設計（靜音時粗紅叉 stroke-width 4）|
| **v4** | 語音喇叭開關 SVG 按鈕、數字逐位 TTS（六四七）、鍵盤震動回饋（iOS 18+ checkbox haptic / Android vibrate）、API 金鑰遮罩顯示 |
| **v3** | 混合 MP3+TTS 語音架構、GainNode 一次性連接穩定 200% 音量、digitToZh 路線號碼讀法 |
| **v2** | 三模式語音設定、AudioContext 背景保活、iOS 通知自動停用、選方向後自動監控 |
| **v1** | 初始版本：TDX 串接、GPS 定位、去程/返程卡片、常用路線收藏、幹線公車鍵盤 |
