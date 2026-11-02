# Threads 資料擷取 Agent

透過 CLI 輸入一則 Threads 貼文網址與想取得的欄位，Agent 會輸出有來源依據的 JSON。支援正式貼文與分享網址，保留原文及順序；資料不完整或無法確認時會說明原因，不自行補造。

[GitHub 儲存庫](https://github.com/shllq/gogolook-test-261102) · **私人儲存庫，審閱者需先取得存取權限。**

## 快速開始

需要 **Node.js 22+**、npm 與 OpenAI API Key。Chromium 使用全新的匿名瀏覽環境，不依賴私人帳號、既有 Cookie 或登入狀態。

```sh
git clone https://github.com/shllq/gogolook-test-261102.git
cd gogolook-test-261102
npm ci
npx playwright install chromium
cp .env.example .env
chmod 600 .env
```

在本機編輯 `.env`，將 `OPENAI_API_KEY` 設為專用且限制權限的金鑰。`.env` 已排除於 Git 追蹤，請勿提交或分享。預設模型為 `gpt-4.1-mini`，可透過環境變數 `OPENAI_MODEL` 調整。

執行題目範例：

```sh
npm run --silent agent -- '請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：https://www.threads.com/share/GW3EPb5M8/' artifacts/my-run
```

請將整段訊息包在引號內；最後的輸出目錄可省略。只需部分欄位時，直接修改訊息，例如：`只要作者的個人檔案名稱：https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz`。

## 輸出內容

| 需求欄位 | JSON 欄位名稱 |
|---|---|
| 個人檔案顯示名稱 | `profile_name` |
| 追蹤者數量 | `follower_count` |
| 原始貼文內容 | `post_content` |
| 作者續文 | `author_continuations` |

僅回傳指定欄位，並附上來源網址、擷取時間、整次任務的 Token 用量，以及各欄位的狀態與原因。

- **stdout／`result.json`：**擷取結果或錯誤物件。[實際結果範例](examples/share/result.json)。
- **`trace.json`：**模型與工具的請求、回傳內容、用量及結束狀態，不包含模型的私有思考內容。[實際執行紀錄](examples/share/trace.json)。

執行失敗或資料全部無法取得時，以非零結束碼退出。部分取得或無法確認的結果仍以零結束碼退出：**請檢查各欄位狀態，不要只看結束碼。** 正常完成或捕捉到錯誤時會儲存紀錄，但不保證程式遭強制終止後仍能保存。紀錄會遮蔽金鑰與憑證，分享前仍應人工檢查。

## 設計方式

使用 Node.js ESM、Playwright、Zod 與官方 OpenAI SDK，不另建 Agent 框架。

1. 驗證每次只處理一個支援的網址，由模型判斷使用者指定的欄位。
2. 透過匿名 Chromium 擷取公開貼文與個人檔案，排除推薦貼文，並記錄可辨識的垂直連線父子關係。
3. 以確定性規則排除讀者回覆分支，以及已記錄但缺失或無效的父節點；其餘候選續文再依對話脈絡交由模型判斷。
4. 依來源證據 ID 組合 JSON，保留原文及觀察到的順序，並儲存去除敏感資訊的執行紀錄。

每次任務最多兩次模型呼叫，設有逾時且不自動重試。瀏覽器不繼承模型金鑰，對外連線限公開 HTTPS。此工具是本機 CLI，不是作業系統層級的沙箱；詳見[安全說明](docs/SECURITY.md)。

## 驗證與已知限制

```sh
npm test # 離線測試，不需 API Key。
RUN_LIVE_MODEL=1 node --test test/live-continuations.test.mjs # 自行選擇執行，會產生 API 費用。
```

- **54 項離線測試通過。** 三組已記錄的證據案例，各通過三次實際模型測試；完整付費測試最多呼叫模型 18 次。驗證涵蓋欄位組合、原文與順序、讀者回覆分支、錯誤處理、用量、紀錄及安全性。
- 已在 macOS arm64、Node 26.12.0 驗證全新下載相依套件與 Chromium，並執行正式／分享網址的 CLI 測試。其他作業系統與最低支援版本 Node 22 尚未驗證。
- 公開頁面可能受限、文字遭截斷或缺少文字區塊。不繞過登入限制，不額外捲動或展開內容；貼文與續文維持部分取得或無法確認的狀態，不宣稱完整擷取。
- DOM 垂直連線的辨識依賴頁面結構；未知關係仍需模型判讀，可能誤判。不依賴登入後才出現的續文序號。概略顯示的追蹤者數量不會當成精確數字。

CLI 與 JSON 交付範例請見 [examples/](examples/README.md)；成功案例、失敗發現與回歸驗證請見[擷取發現](docs/FINDINGS.md)。

## 專案結構

```text
src/                 核心流程、擷取、資料驗證、模型與安全控制
scripts/             Agent CLI，以及 acquire／probe 診斷工具
test/                離線與付費模型測試，fixtures/ 為測試資料
examples/            可執行範例、結果 JSON、執行紀錄與共用擷取證據
docs/                需求對照、資料契約、安全說明與擷取發現
  assets/            發現紀錄引用的截圖
  development/       初始計畫、歷史進度與工作紀錄
init_assignment.md   原始題目，保留不變
```

## AI 使用與參考資料

開發過程使用 AI 協助實作、測試、文件撰寫與實際結果分析。確定性測試驗證程式流程；模型測試僅涵蓋特定案例，不代表整體準確率保證。

[原始題目](init_assignment.md) · [需求對照](docs/ASSIGNMENT_STATUS.md) · [資料契約](docs/CONTRACTS.md) · [工作紀錄](docs/development/WORK_LOG.md)
