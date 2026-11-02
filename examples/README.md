# CLI 與 JSON 範例

從專案根目錄執行；需先完成 [README 的環境設定](../README.md#快速開始)。

```sh
npm run --silent agent -- '請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：https://www.threads.com/share/GW3EPb5M8/' artifacts/my-share-run
```

| 檔案 | 用途 |
|---|---|
| [share/result.json](share/result.json) | 實際模型與瀏覽器執行結果，包含四個指定欄位、來源、時間、狀態與 Token 用量。 |
| [share/trace.json](share/trace.json) | 同次任務的兩次模型呼叫、貼文／個人檔案工具呼叫與完成狀態，不含模型私有思考內容。 |
| [multipart/evidence.json](multipart/evidence.json) | 匿名擷取的四則貼文證據，供多段續文回歸測試共用；不是 Agent 結果或完整性保證。 |

`share/` 範例於 2026-11-02 使用 `gpt-4.1-mini` 擷取，結果為 `partial`，共 872 Tokens。包含 Whoscall、當時觀察到的 15,108 位追蹤者、原始貼文與一則續文；不代表目前數值或完整續文。

分享前已再次套用敏感資訊遮蔽，並移除解析後網址的 `xmt` 追蹤參數。公開原文、時間、用量與模型判斷未修改。新的執行結果會寫入指定目錄，stdout 同時輸出結果 JSON。

## 完整回歸測試

從專案根目錄執行：

```sh
npm test # 離線測試；不需金鑰，不連線至模型或 Threads。
RUN_LIVE_MODEL=1 RUN_LIVE_CLI=1 npm test # 完整回歸；需金鑰與 Chromium，會產生 API 費用。
```

2026-11-02 驗證結果：**58 項離線測試、4 組模型回歸（各 3 次）、6 個 CLI 案例全部通過**。離線模式預設略過 10 項連網／付費測試。

| 驗證層 | 涵蓋案例 |
|---|---|
| 已記錄證據＋實際模型 | 讀者問答、置頂留言、垂直連線證明的讀者回覆分支／缺失父節點、多段續文（無序號）；每組重跑三次。 |
| 實際 CLI＋匿名瀏覽器＋模型 | 原始分享網址：回傳 Whoscall、原文與一則續文。 |
| 同上 | `@kasumitoiu/post/DP1T59_E9_6`：保留四則續文，排除後續置頂留言及讀者回覆。 |
| 同上 | `@rojiace/post/DfMburZGDEA`：有效貼文；`DfMburZGDEb`：所有欄位 `unavailable`／`null`，結束碼為 1。 |
| 同上 | Whoscall 僅要求名稱、藍藍去哪兒未要求續文：只回傳指定欄位，不呼叫續文分類。 |

CLI 回歸也檢查 stdout 與 `result.json` 一致、原文與續文取自同次擷取證據，以及模型／工具呼叫次數。結果與紀錄存於忽略追蹤的 `artifacts/eval-cli-*/`；模型回歸存於 `artifacts/eval-continuations-*/`。實作見 [CLI 回歸](../test/live-cli.test.mjs)、[模型回歸](../test/live-continuations.test.mjs)，證據來源見[測試資料說明](../test/fixtures/README.md)。

### CLI 回歸用量與審閱證據

以下為 2026-11-02 的六個 CLI 案例，模型皆為 `gpt-4.1-mini`；用量包含欄位選擇與有執行的續文分類，**不含上述四組固定證據模型回歸**。

| 案例 | 輸入 Tokens | 輸出 Tokens | 合計 | 結果／完整紀錄 |
|---|---:|---:|---:|---|
| 原始分享網址 | 835 | 89 | 924 | [result](live-cli/share/result.json)／[trace](live-cli/share/trace.json) |
| 置頂留言與四則續文 | 3,413 | 118 | 3,531 | [result](live-cli/pinned/result.json)／[trace](live-cli/pinned/trace.json) |
| 有效貼文 `DfMburZGDEA` | 1,492 | 54 | 1,546 | [result](live-cli/valid-post/result.json)／[trace](live-cli/valid-post/trace.json) |
| 無法取得 `DfMburZGDEb` | 117 | 19 | 136 | [result](live-cli/invalid-post/result.json)／[trace](live-cli/invalid-post/trace.json) |
| 僅要求作者名稱 | 105 | 7 | 112 | [result](live-cli/name-only/result.json)／[trace](live-cli/name-only/trace.json) |
| 未要求續文的多段貼文 | 117 | 14 | 131 | [result](live-cli/content-only/result.json)／[trace](live-cli/content-only/trace.json) |
| **合計（9 次模型呼叫）** | **6,079** | **301** | **6,380** | 不代表未來固定用量或費用。 |

可直接開啟以上 JSON 審閱，無需金鑰或重新執行。`trace` 內的工具回傳包含當次貼文／個人檔案證據，模型事件附各次用量；離線測試會核對 Schema、來源文字與用量加總。這批快照經既有遮蔽函式再次處理，並移除分享網址的 `xmt` 追蹤參數；公開原文、時間、模型選擇與用量保留不變。它們與前述歷史 `share/` 範例是不同次執行，不應混合計算。

這些結果只代表當次可見內容，不保證完整擷取或未來網站可用性。CLI 測試固定檢查目前的作者名稱與續文 ID，頁面或內容變更時可能失敗；追蹤者數量只比對同次證據，不固定數值。已記錄證據的模型測試不驗證目前網頁結構。

瀏覽器結構、登入前後差異、錯誤案例與回歸驗證，請見[擷取發現與驗證紀錄](../docs/FINDINGS.md)。各項需求的目前狀態請見[需求對照](../docs/ASSIGNMENT_STATUS.md)。
