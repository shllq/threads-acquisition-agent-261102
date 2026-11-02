# Live CLI example and acceptance checks

Captured on 2026-11-02 with `gpt-4.1-mini`, fresh anonymous Chromium and the guarded browser launcher. These are observed public snapshots, not guaranteed current values or complete conversations.

```sh
npm run --silent agent -- '請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：https://www.threads.com/share/GW3EPb5M8/' artifacts/my-share-run
```

- [Result JSON](share/result.json): all four requested fields, Whoscall, 15,108 followers, original post and one continuation; `partial`, 872 tokens.
- [Execution trace JSON](share/trace.json): two model calls, post/profile tool calls with evidence, and completed terminal state. No private model reasoning.
- Sanitization: the CLI redactor was applied again and the resolved URL's `xmt` tracking query was removed. Public evidence text, timestamps, usage and model decisions are unchanged. No keys, cookies or login state are included.

## Checks performed

| Case | Observed result |
|---|---|
| Share URL, all fields | Selected `Dd0_RHRH6h9`; excluded reader reply `Dd8sq8MH9pJ`; partial, 872 tokens. |
| Canonical `https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz`, all fields | Selected `De6YqepH6ke`; source text/order preserved; partial, 821 tokens. |
| Same canonical URL, profile name only | Only `profile_name` returned (`Whoscall`); no continuation model call; complete for that requested field, 120 tokens. |
| Recorded share conversation, three independent model runs | All selected only `Dd0_RHRH6h9`, excluding the reader-response apology. |

Manual comparison against the acquired conversation confirms the share author apology follows and answers the reader's question, while the activity-details link adds to the original announcement. The canonical continuation expands the root's phone-number explanation. Text was compared to tool evidence, not independently verified as untruncated by the website.

The old prompt failed this same recorded case before the change: it selected the apology as a continuation based on authorship/topic. The revised prompt explicitly checks reader context and omits ambiguous candidates. Three passes on one conversation are a regression check, not a classification-accuracy benchmark. The share link remains visibly truncated (`…`); no expansion or exhaustive-loading claim is made.

Raw local runs are ignored under `artifacts/acceptance-{share-fixed,canonical-fixed,profile-only}/`; they are not required to use this committed example.

Rerun the paid, opt-in regression with local `.env` configured:

```sh
RUN_LIVE_MODEL=1 node --test test/live-continuations.test.mjs
```

This makes up to six model calls (three full two-call workflows) against recorded evidence, does not browse, and saves result/trace files under a fresh `artifacts/eval-continuations-*` directory. It stops on the first failed assertion. Ordinary `npm test` skips it and requires no API key.

## Multipart badge investigation: `@wheretogo_blue`

Inspected `https://www.threads.com/@wheretogo_blue/post/DfN7KeGkuzN` anonymously on 2026-11-02. The supplied screenshot shows a `1/4` badge; that badge was **not exposed in the inspected browser views**:

- English desktop post: HTTP 200; no numeric fraction in visible or hidden DOM text.
- Traditional Chinese mobile post: no numeric fraction, including nested text or CSS-generated content in post containers; timestamp permalinks for all four observed posts were present.
- Traditional Chinese desktop profile: root and same-author candidates were rendered, but no numeric-fraction badge was found in leaf text.

The existing `acquirePost` tool returned [this evidence JSON](multipart/evidence.json), without any model calls:

| Observed position (not a platform sequence number) | Post ID |
|---|---|
| 0, target | `DfN7KeGkuzN` |
| 1 | `DfN7KYxkgGn` |
| 2 | `DfN7KarksFD` |
| 3 | `DfN7KalkgFv` |

The three later posts carry author markers and continue the original content when read manually. However, the anonymous DOM did not provide the screenshot's `1/4` cue or verified parent/sequence links. Counting these posts is not proof of a platform-declared four-part sequence. No sequence metadata, badge selector, automatic navigation or classifier bypass was added from unverified markup. Evidence remains incomplete, with unknown parent IDs, as before.

Next acquisition step: inspect a permitted anonymous view that actually exposes the badge/control, then fixture its markup and extract its explicit sequence/link information in the tool. Do not manufacture `1/4` from author matching or use private login state to reproduce the screenshot.

Local investigation artifacts (DOM observations and screenshot) are under ignored `artifacts/sequence-discovery/`. The committed evidence contains only the public acquisition result, not full HTML, cookies or private session data.
