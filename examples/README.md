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

瀏覽器結構、登入前後差異、錯誤案例與回歸驗證，請見[擷取發現與驗證紀錄](../docs/FINDINGS.md)。各項需求的目前狀態請見[需求對照](../docs/ASSIGNMENT_STATUS.md)。
