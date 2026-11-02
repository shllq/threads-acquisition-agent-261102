# Threads 資料擷取 Agent

**輸入一段訊息，提供一則 Threads 網址與所需欄位，輸出有來源依據的 JSON。** 支援正式貼文與分享網址，每次處理一個網址；保留原文與順序，不做摘要，不補造無法取得的資料。

本專案依 [原始題目](init_assignment.md) 實作；逐項驗證範圍與剩餘限制見 [需求對照](docs/ASSIGNMENT_STATUS.md)。

[GitHub 原始碼](https://github.com/shllq/threads-acquisition-agent-261102) · [執行範例與證據](examples/README.md) · [安全說明](docs/SECURITY.md)

## 先看交付成果

不需金鑰即可審閱：[CLI 指令與六個案例](examples/README.md)、[JSON 結果](examples/live-cli/share/result.json)、[同次執行紀錄](examples/live-cli/share/trace.json)。紀錄包含模型／工具呼叫、回傳、Token 用量與結束狀態；工具回傳保留當次擷取證據，不包含模型私有思考內容。

## 快速開始

需要 **Node.js 22+**、npm、Chromium 與 OpenAI API Key。

```sh
git clone https://github.com/shllq/threads-acquisition-agent-261102.git
cd threads-acquisition-agent-261102
npm ci
npx playwright install chromium
cp .env.example .env
chmod 600 .env
```

在本機編輯 `.env`，填入專用且限制權限的 `OPENAI_API_KEY`。預設模型為 `gpt-4.1-mini`，可透過環境變數 `OPENAI_MODEL` 調整。`.env` 雖已排除於 Git 追蹤，仍是明文檔案，請勿提交或分享；`chmod` 適用 macOS／Linux，其他系統請設定等效權限。

執行題目範例：

```sh
npm run --silent agent -- '請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：https://www.threads.com/share/GW3EPb5M8/' artifacts/my-run
```

整段訊息請包在引號內，最後的輸出目錄可省略。只需部分欄位時，直接修改訊息：

```sh
npm run --silent agent -- '只要作者的個人檔案名稱：https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz'
```

擷取使用**獨立、全新匿名的 Chromium 瀏覽環境**，不依賴私人帳號、既有 Cookie 或登入狀態，也不突破平台存取限制。

## 輸出與續文判定

只回傳訊息指定的欄位組合：

| 題目需求 | JSON 欄位 |
|---|---|
| 個人檔案顯示名稱（非帳號代稱） | `profile_name` |
| 追蹤者數量（區分精確／概略值） | `follower_count` |
| 原始貼文內容 | `post_content` |
| 作者續文（保留原文與觀察順序） | `author_continuations` |

**作者續文**是同一則貼文下，作者為原文讀者持續追加的內容；不包含其他人的留言、作者回覆特定讀者的對話或推薦貼文。同作者、相同主題或位置相鄰都不足以證明是續文，須結合頁面結構與對話脈絡判斷。

- **stdout／`result.json`**：結果或錯誤物件。結果附輸入／解析後網址、擷取時間與整次任務的 Token 用量；供應商未提供用量時標示未知，不假填為零。
- **`trace.json`**：模型與工具的請求、回傳、用量及結束狀態，遮蔽已知金鑰與憑證。
- **欄位狀態**：`ok`、`partial`、`uncertain`、`unavailable`；無法取得、不完整或無法確認時附原因，不宣稱完整結果。

**不要只看結束碼：**部分取得或無法確認仍以零退出；執行失敗或資料全部無法取得時，以非零退出。正常完成或捕捉到錯誤時會保存紀錄，不保證強制終止或檔案系統故障後留存；分享前仍需人工檢查。

完整格式與狀態規則見 [資料契約](docs/CONTRACTS.md)。

## 設計方式

採用 **Node.js ESM、Playwright、Zod 與官方 OpenAI SDK**，不另建 Agent 框架。每次任務最多兩次模型呼叫，設有逾時、不自動重試。

1. **驗證輸入、選取欄位**：程式驗證單一支援網址，模型理解訊息中的欄位需求。
2. **觀察公開頁面**：匿名瀏覽器擷取貼文與所需個人檔案資料，排除推薦內容，記錄可辨識的父子連線。
3. **辨別作者續文**：程式先排除已知讀者回覆分支及缺失／無效父節點，其餘候選由模型依對話脈絡選取 ID。
4. **驗證並組裝輸出**：只接受允許的 ID，從證據取回原文與順序，輸出 JSON 及去敏感執行紀錄；不由模型改寫貼文。

金鑰留在 Node.js SDK，Chromium 不繼承模型憑證，新 Context 不繼承私人登入。**使用者訊息與續文判斷所需的公開證據仍會傳至 OpenAI**；這不是資料完全留在本機的工具，也不是作業系統沙箱。細節見 [資料流與安全邊界](docs/SECURITY.md#模型呼叫與瀏覽器隔離)。

## 驗證與已知限制

```sh
npm test # 離線測試：不需 API Key，不連線至模型或 Threads。
RUN_LIVE_MODEL=1 RUN_LIVE_CLI=1 npm test # 完整回歸：需金鑰與 Chromium，會產生 API 費用。
```

2026-11-02 驗證：**58 項離線測試通過、4 組固定證據模型回歸各跑 3 次、6 個 CLI 端到端案例全部通過**；一般測試預設略過 10 項連網／付費案例。涵蓋欄位組合、原文與順序、讀者回覆／置頂留言排除、無效貼文、錯誤紀錄與安全控制。

**CLI Token 用量：**六個案例使用 `gpt-4.1-mini`，9 次模型呼叫共 **6,380 Tokens**（輸入 6,079／輸出 301）；不含另外四組固定證據模型回歸。這是當次實測，不是固定額度或費用保證。各案例用量與已保存的結果／紀錄見 [審閱證據](examples/README.md#cli-回歸用量與審閱證據)，無需重新付費執行。

- **完整性有限**：不額外捲動或展開，公開文字可能截斷、缺失；貼文與續文維持部分取得或無法確認，不宣稱完整擷取。
- **判斷可能出錯**：DOM 結構及未知回覆關係仍可能造成誤判；特定案例回歸不等於整體準確率保證，也不保證未來版面不變。
- **即時資料會變動**：概略追蹤者數不當成精確值；CLI 案例固定檢查作者名稱與續文 ID，內容變更可能使測試失敗。無效貼文目前可能回報通用網址驗證錯誤，而非專門的不存在診斷。
- **環境驗證有限**：已在 macOS arm64、Node 26.12.0 驗證全新安裝與 CLI；其他作業系統及最低支援版本 Node 22 尚未驗證。

詳細案例與來源見 [回歸測試資料](test/fixtures/README.md#edge-cases-collected-from-notesmd)；頁面觀察、失敗發現及截圖見 [擷取發現](docs/FINDINGS.md)。

## 專案導覽

| 路徑 | 內容 |
|---|---|
| [`src/`](src/)／[`scripts/`](scripts/) | 核心流程、模型／瀏覽器／安全控制，以及 Agent CLI、acquire／probe 診斷工具。 |
| [`test/`](test/)／[`examples/`](examples/README.md) | 離線與付費測試、測試資料、可執行範例及 JSON 證據。 |
| [`docs/`](docs/ASSIGNMENT_STATUS.md) | 需求對照、資料契約、安全說明與擷取發現；歷史計畫及紀錄位於 `docs/development/`。 |

## AI 使用與參考資料

使用 **[Pi（pi.dev）](https://pi.dev)** 作為開發用 AI coding agent，協助實作、測試、除錯、文件與結果分析；**執行 Threads CLI 不需安裝 Pi 或載入技能**。

- **`skill/ub-mode`（`/skill:ub-mode`）**：先做得動、再做對、遵循實務；最小修改、可行時先寫失敗測試、驗證行為並記錄操作。[技能原文](.pi/skills/ub-mode/SKILL.md)。
- **`skill/ponytail`（`/skill:ponytail`）**：重用既有程式、減少不必要複雜度，完成最小但完整的修改並揭露風險。[技能來源](https://github.com/DietrichGebert/ponytail)／[專案設定](.pi/settings.json)。
- **安全檢查**：涵蓋金鑰處理、SDK 端點、瀏覽器程序／登入隔離、內網存取限制與 Trace 去敏感。見 [安全說明](docs/SECURITY.md)及 [測試原始碼](test/security.test.mjs)，可獨立執行 `node --test test/security.test.mjs`。

安全測試使用假金鑰、模擬 SDK 傳輸與真實 Chromium，不讀取實際 `.env` 或呼叫付費 API。技能是工作指引，不是安全保證；測試不等於完整滲透測試，Prompt 也不保證免疫提示注入。`ub-mode` 提及的 crapper／dryer／mutator 未安裝，未宣稱完成其檢查。

[原始題目](init_assignment.md) · [逐項需求對照](docs/ASSIGNMENT_STATUS.md) · [資料契約](docs/CONTRACTS.md) · [工作紀錄](docs/development/WORK_LOG.md)
