# Acquisition findings and verification

Observed on 2026-11-02 with `gpt-4.1-mini`, fresh anonymous Chromium and the guarded browser launcher. These are public snapshots, not guaranteed current values or complete conversations. Commands and code paths below are relative to the repository root.

See [CLI examples and JSON deliverables](../examples/README.md) for the runnable command, result and trace. See [assignment status](ASSIGNMENT_STATUS.md) for current acceptance gaps.

## 安全檢查：分開模型憑證與瀏覽器內容

**安全重點不是讓模型「答應不洩密」，而是不要把 API Key 交給瀏覽器，也不讓模型直接控制瀏覽器。**

- `model_call` 由 Node.js 的官方 SDK 發送，使用固定 OpenAI HTTPS 端點；金鑰只作為 SDK 驗證身分之用，不加入模型訊息、網頁腳本或工具參數。
- Chromium 是獨立程序，啟動環境只保留允許的作業系統變數；新建的匿名 `BrowserContext` 另隔離 Cookie／登入狀態。**程序環境隔離金鑰，Context 隔離登入，不能混為一談。**
- 兩側只透過程式交換任務資料：工具回傳公開證據；模型選擇欄位／合格 ID；程式驗證並組裝原文。模型沒有 Playwright 控制物件、shell 或任意工具執行權。
- 檢查方式不是只看設定：模擬 SDK 傳輸檢查端點、驗證標頭與本文；真實 Chromium 搭配假金鑰檢查程序環境，並實測內網導航／子資源／重新導向遭阻擋；另驗證 Trace 去敏感。

可重跑 `node --test test/security.test.mjs`，共 10 項安全測試，不需真金鑰或付費 API。資料仍會跨邊界：使用者訊息及續文判斷所需的公開貼文會傳給 OpenAI；這不是完整資料隔離或作業系統沙箱，也不保證免疫提示注入。

詳見[繁體中文安全說明、資料流與驗證表](SECURITY.md)。

## Checks performed

| Case | Observed result |
|---|---|
| Share URL, all fields | Selected `Dd0_RHRH6h9`; excluded reader reply `Dd8sq8MH9pJ`; partial, 872 tokens. |
| Canonical `https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz`, all fields | Selected `De6YqepH6ke`; source text/order preserved; partial, 821 tokens. |
| Same canonical URL, profile name only | Only `profile_name` returned (`Whoscall`); no continuation model call; complete for that requested field, 120 tokens. |
| Recorded share conversation, three independent model runs | All selected only `Dd0_RHRH6h9`, excluding the reader-response apology. |
| Recorded anonymous `@wheretogo_blue` conversation, three independent model runs | All selected `DfN7KYxkgGn`, `DfN7KarksFD`, `DfN7KalkgFv` in order, preserving source text and partial status without sequence badges. |
| Recorded `@tai_wan_lan` connector evidence, three independent model runs | Selected only `DU0gvTyk830`, `DU0iKvbE2Zj`; reader branches and a recorded missing parent were ineligible. |
| Fresh live CLI after connector extraction | `@tai_wan_lan` retained two continuations (1,891 tokens); `@wheretogo_blue` retained three (2,460 tokens); share URL retained one (921 tokens). All results partial. |

Manual comparison against the acquired conversation confirms the share author apology follows and answers the reader's question, while the activity-details link adds to the original announcement. The canonical continuation expands the root's phone-number explanation. Text was compared to tool evidence, not independently verified as untruncated by the website.

The old prompt failed this same recorded case before the change: it selected the apology as a continuation based on authorship/topic. The revised prompt explicitly checks reader context and omits ambiguous candidates. Three passes per conversation on these three recorded cases are regression checks, not a classification-accuracy benchmark. The share link remains visibly truncated (`…`); no expansion or exhaustive-loading claim is made.

Raw local runs are ignored under `artifacts/acceptance-{share-fixed,canonical-fixed,profile-only}/`; they are not required to use this committed example.

Rerun the paid, opt-in regression with local `.env` configured:

```sh
RUN_LIVE_MODEL=1 node --test test/live-continuations.test.mjs
```

This makes up to eighteen model calls (three full two-call workflows per case) against three recorded conversations, does not browse, and saves result/trace files under a fresh `artifacts/eval-continuations-*` directory per case. Each case stops on its first failed assertion. Ordinary `npm test` skips it and requires no API key.

## Multipart badge investigation: `@wheretogo_blue`

Inspected `https://www.threads.com/@wheretogo_blue/post/DfN7KeGkuzN` anonymously on 2026-11-02. The user supplied a [logged-in screenshot](assets/multipart-logged-in.jpg) showing a `1/4` badge, then a [logged-out screenshot](assets/multipart-logged-out.jpg) showing the same original post without the badge and its next author post directly below. Per the user's session comparison, badge visibility is login-dependent for this example; this does not establish behavior for every Threads post. The logged-out screenshot matches our anonymous acquisition, where the badge was **not exposed in the inspected browser views**:

- English desktop post: HTTP 200; no numeric fraction in visible or hidden DOM text.
- Traditional Chinese mobile post: no numeric fraction, including nested text or CSS-generated content in post containers; timestamp permalinks for all four observed posts were present.
- Traditional Chinese desktop profile: root and same-author candidates were rendered, but no numeric-fraction badge was found in leaf text.

The existing `acquirePost` tool returned [this evidence JSON](../examples/multipart/evidence.json), without any model calls:

| Observed position (not a platform sequence number) | Post ID |
|---|---|
| 0, target | `DfN7KeGkuzN` |
| 1 | `DfN7KYxkgGn` |
| 2 | `DfN7KarksFD` |
| 3 | `DfN7KalkgFv` |

The three later posts carry author markers and continue the original content when read manually. This initial snapshot did not capture parent edges or the screenshot's `1/4` cue. The subsequent connector investigation below added recognized within-group edges to acquisition, but still does not establish a platform-declared four-part total, complete ancestry or exhaustive coverage. The original committed snapshot is retained unchanged for reproducible recorded-evidence evaluation.

The logged-out screenshot also shows a vertical connector beside the next author post; the later investigation below identified its within-group DOM structure, without establishing platform sequence totals. The anonymous workflow must not depend on logged-in badges. Capture explicit public relationships in the tool only when verified, and retain contextual model classification where they remain unknown. Do not manufacture `1/4` from author matching or use private login state to reproduce the screenshot.

Regression: `test/live-continuations.test.mjs` reuses the committed evidence above (no duplicate snapshot). Manually labeled expected continuations are `DfN7KYxkgGn`, `DfN7KarksFD`, `DfN7KalkgFv`; all three model runs passed. Assertions check the exact IDs/order, original and continuation text, and partial continuation status, without assuming numbered badges or complete coverage. This regression uses recorded anonymous evidence, not the screenshots or a fresh website acquisition.

Local investigation artifacts (DOM observations and screenshot) are under ignored `artifacts/sequence-discovery/`. The committed evidence contains only the public acquisition result, not full HTML, cookies or private session data.

## Vertical connectors and reader branches: `@tai_wan_lan`

The [supplied screenshot](assets/reader-branches.jpg) shows the author's database link connected to the author's search tips, and a separate reader-to-author branch. Anonymous inspection of `https://www.threads.com/@tai_wan_lan/post/DU0gmxnk-dT` confirmed the layout:

- Each rendered branch is grouped under `[data-virtualized]`.
- The earlier post contains an empty, visible 2px-wide vertical bar outside its text, with `--x-borderBottomLeftRadius: 2px` and `--x-borderBottomRightRadius: 2px`. Within that same group, it connects to the next container.
- Distinct groups are not joined merely because they are adjacent or have the same author. The original post is displayed separately; the first post of a group keeps an unknown parent.

Acquisition now records these observed edges as `parent_id`. It finds the previous container's timestamp permalink even if that parent's text was skipped. The Agent follows recorded ancestry: crossing a reader makes the entire author-reply tail ineligible; a recorded missing, cyclic or nonpreceding parent is also ineligible. The model receives the eligible ID list and cannot return an excluded ID without failing validation. Unknown ancestry still uses contextual classification—an author-only fragment is not asserted to connect all the way to the original.

The initial live run returned five continuations, incorrectly including reader responses. After adding connector evidence and deterministic eligibility, a fresh live run returned only:

1. `DU0gvTyk830` — database link, parent unknown.
2. `DU0iKvbE2Zj` — search tips, observed parent `DU0gvTyk830`.

Excluded structural branches include `DU0r6MYk5vy` → reader `DU0orKZCRKA`, `DU0uDbjk2vq` → reader `DU0tdyRgYDi`, and `DU1tNrtEyXq` → missing-text parent `DU1XjjbE57I`. The latter is withheld because its parent was not extracted, not because missing text was fabricated.

[Recorded post evidence and manual expected IDs](../test/fixtures/continuation-reader-branches.json) feed the third paid regression case; all three runs passed. Offline browser fixtures cover group separation, hidden/transparent/absent bars, text decorations, skipped parents and author-only tails after a reader. A fake model trying to select forbidden branches fails deterministically.

Limitations: this is a matcher for observed DOM/style structure, not a public platform relationship API. A changed layout may leave edges unknown; unrecognized layouts still depend on model context. Seven text blocks remain skipped on this post, and all results remain partial. No login, extra loading or access-limit bypass was added. Local discovery and corrected CLI artifacts are under ignored `artifacts/connector-discovery/` and `artifacts/agent-20261102-134115/`.
