# 審閱與驗證指南

本頁是交付入口：**先看已保存的結果，再跑不需金鑰的測試；只有想驗證目前網站時才需要付費。**

原始碼：[公開 GitHub 儲存庫](https://github.com/shllq/threads-acquisition-agent-261102)。若使用 ZIP，解壓後進入 `threads-acquisition-agent/`；所有指令皆從專案根目錄執行，不需安裝 Pi 或開發技能。

## 1. 不安裝、不付費：先核對六個案例

以下皆為已執行的公開資料快照，不是即時 API，也不是完整擷取保證。

| 案例 | 應核對的結果 | 同次紀錄 |
|---|---|---|
| [題目分享網址](examples/live-cli/share/result.json) | 四個指定欄位；作者 Whoscall；一則續文 `Dd0_RHRH6h9`；整體 `partial`。 | [trace](examples/live-cli/share/trace.json) |
| [置頂留言排除](examples/live-cli/pinned/result.json) | 保留四則續文，不把後續作者置頂留言當成續文。 | [trace](examples/live-cli/pinned/trace.json) |
| [有效貼文](examples/live-cli/valid-post/result.json) | 保留來源原文；未確認續文時為 `uncertain`，不是宣告「沒有續文」。 | [trace](examples/live-cli/valid-post/trace.json) |
| [無法取得的貼文](examples/live-cli/invalid-post/result.json) | 欄位皆為 `unavailable`／`null`，附原因，不補造內容。 | [trace](examples/live-cli/invalid-post/trace.json) |
| [只要作者名稱](examples/live-cli/name-only/result.json) | 只輸出 `profile_name`；一次模型呼叫，不做續文分類。 | [trace](examples/live-cli/name-only/trace.json) |
| [未要求續文](examples/live-cli/content-only/result.json) | 只有名稱、追蹤者與原文，不多輸出續文。 | [trace](examples/live-cli/content-only/trace.json) |

**抽查方法：**將 `result.data` 的文字與 `trace.events` 中 `acquirePost` 的證據比對；檢查續文 ID／順序、每次 `model_call.usage` 的加總，以及最後的 `run_end`。六例當次共 9 次模型呼叫、6,380 Tokens；完整用量表見 [examples/](examples/README.md#cli-回歸用量與審閱證據)。不要與較早的 `examples/share/` 快照混算。

## 2. 不需金鑰：自動驗證交付證據

需要 Node.js 22+ 與 npm。首次安裝相依套件需要網路；以下測試本身不連線至 Threads 或 OpenAI，也不需 Chromium。

```sh
npm ci
node --test test/examples.test.mjs
```

**預期：2 項通過、0 失敗。** 會自動檢查已發布 JSON 的 Schema、指定欄位、來源原文、續文 ID、紀錄去敏感及 Token 加總，不必人工讀完所有 JSON。

## 3. 不需金鑰：完整離線驗證與安全檢查

```sh
npx playwright install chromium
npm test
node --test test/security.test.mjs
```

瀏覽器安裝需要網路；測試使用本機 fixtures／伺服器及假金鑰，不存取實際網站。**執行前確認沒有設定 `RUN_LIVE_MODEL=1` 或 `RUN_LIVE_CLI=1`，避免啟動付費測試。**

目前預期：完整測試 **58 項通過、10 項選擇性案例略過、0 失敗**；獨立安全測試 **10 項通過**，已包含在前述 58 項中，不能重複加總。不要把預設略過的測試當成已在你的環境驗證。

安全測試核對 SDK 端點與憑證位置、Chromium 環境、內網封鎖、DNS 固定 IP 連線及 Trace 去敏感。`model_call` 留在 Node.js SDK，Chromium 程序不繼承金鑰，匿名 `BrowserContext` 不繼承私人登入；詳見[資料流與安全邊界](docs/SECURITY.md#模型呼叫與瀏覽器隔離)。

原始題目保持不變；macOS 可另外執行：

```sh
shasum -a 256 -c init_assignment.sha256
```

預期顯示 `init_assignment.md: OK`。Linux 若無 `shasum`，可改用 `sha256sum -c init_assignment.sha256`。

## 4. 選擇性：實際跑一次 CLI（會付費）

先依 [README](README.md#快速開始) 設定專用、限制權限的 API Key；不要將真金鑰貼進訊息或指令。

```sh
npm run --silent agent -- '請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：https://www.threads.com/share/GW3EPb5M8/' artifacts/reviewer-live
```

核對 stdout 與 `artifacts/reviewer-live/result.json` 一致，並查看同目錄 `trace.json`。每次任務最多兩次模型呼叫；公開內容與用量可能不同於快照。即使結束碼為零，仍須檢查欄位狀態；`run_end: completed` 也不等於資料完整。

若需全部連網／付費回歸，在 macOS／Linux shell 執行：

```sh
RUN_LIVE_MODEL=1 RUN_LIVE_CLI=1 npm test
```

包含四組固定證據各跑三次，以及六個實際 CLI 案例，最多 36 次模型呼叫；會產生 API 費用，可能因網站或模型結果變動而失敗。固定證據測試不驗證目前網站 DOM；CLI 測試才會瀏覽當前網頁。

## 5. 題目需求與檢查入口

| 要驗證的需求 | 最直接的證據／程式 |
|---|---|
| 四欄位及指定組合、單一正式／分享網址 | [欄位與網址測試](test/contracts.test.mjs)、上方六例。 |
| 保留原文／順序，排除讀者回覆、推薦與置頂留言 | [成果自動核對](test/examples.test.mjs)、[瀏覽器結構測試](test/acquisition.test.mjs)、[真實失敗與改善](docs/FINDINGS.md)。 |
| 依脈絡判斷續文，不只看作者相同 | [Agent 約束](src/agent.mjs)、[四組模型回歸](test/live-continuations.test.mjs)。 |
| 來源、時間、整次用量與不完整原因 | 任一 `result.json`、[資料契約](docs/CONTRACTS.md)。 |
| 呼叫／回傳／結束狀態、憑證去敏感 | 同次 `trace.json`、[安全測試](test/security.test.mjs)。 |
| 獨立匿名瀏覽器，不依賴私人登入 | [瀏覽器啟動](src/browser.mjs)、[Context 建立](scripts/agent-threads.mjs)、[安全說明](docs/SECURITY.md)。 |
| 設計、環境、限制及 AI 使用方式 | [README](README.md)、[逐項需求對照](docs/ASSIGNMENT_STATUS.md)。 |

## 封裝驗證紀錄

已在 macOS arm64／Node 26.12.0 將 Git 快照匯出為 ZIP、解壓至全新暫存目錄並執行 `npm ci`：成果測試 2 項、完整離線測試 58 項、安全專項 10 項皆通過，題目校驗碼正確。瀏覽器測試使用本機已安裝的 Chromium，未在此次封裝驗證重新下載；10 項付費／連網案例未重跑。匯出內容與 Git 追蹤檔案逐一比對，不含真實 `.env`、`notes.md` 或本機產物。

## 判讀限制與封裝範圍

- 已驗證環境為 macOS arm64、Node 26.12.0；其他系統與最低版本 Node 22 未實測。特定案例通過不是整體模型準確率保證。
- 不捲動、不展開、不突破登入限制；截斷文字與未知關係保留 `partial`／`uncertain`，不宣稱全部續文已取得。
- 使用者訊息及判斷所需的公開證據會傳給 OpenAI；這不是完全離線的產品，也不是作業系統沙箱。
- 交付 ZIP 由 Git 已提交內容匯出，包含原始碼、鎖定檔、原始題目、測試與公開 JSON 證據；不含 `.git/`、真實 `.env`、`node_modules/`、`notes.md` 或本機 artifacts。Git 歷史可至公開儲存庫審閱；ZIP 解壓後仍需安裝相依套件與 Chromium。
