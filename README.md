# Threads Acquisition Agent

A CLI Agent that reads one Threads post URL and the fields you ask for, then returns source-backed JSON. Supports canonical and share URLs, preserves original text and order, and reports incomplete or uncertain data instead of inventing it.

[GitHub repository](https://github.com/shllq/gogolook-test-261102) · **Private: reviewers need access.**

## Quick start

Requires **Node.js 22+**, npm, and an OpenAI API key. Chromium runs in a fresh anonymous context—no personal account, cookies, or existing browser session.

```sh
git clone https://github.com/shllq/gogolook-test-261102.git
cd gogolook-test-261102
npm ci
npx playwright install chromium
cp .env.example .env
chmod 600 .env
```

Edit `.env` locally and set `OPENAI_API_KEY` to a dedicated, restricted key. Keep it private; `.env` is Git-ignored. The default model is `gpt-4.1-mini`; optionally override it with `OPENAI_MODEL`.

Run the assignment example:

```sh
npm run --silent agent -- '請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：https://www.threads.com/share/GW3EPb5M8/' artifacts/my-run
```

Quote the whole message. The output directory is optional. To request fewer fields, change the message—for example, `只要作者的個人檔案名稱：https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz`.

## Output

| Requested field | JSON key |
|---|---|
| Profile display name | `profile_name` |
| Follower count | `follower_count` |
| Original post text | `post_content` |
| Author continuations | `author_continuations` |

Only requested fields are returned. Results include source URLs, extraction time, aggregate token usage, and per-field status/reasons.

- **stdout / `result.json`:** extracted data or an error object. [Actual result example](examples/share/result.json).
- **`trace.json`:** model/tool requests, responses, usage, and terminal state—not private model reasoning. [Actual trace example](examples/share/trace.json).

Failures and wholly unavailable results exit nonzero. Partial/uncertain results exit zero: **check field statuses, not just the exit code**. Traces are saved on completion or caught failure, not hard crashes. Credentials are redacted, but review artifacts before sharing.

## Design

Node.js ESM, Playwright, Zod, and the official OpenAI SDK; no custom Agent framework.

1. Validate one supported URL and use the model to select requested fields.
2. Acquire public post/profile evidence in anonymous Chromium. Exclude recommendations and record recognized vertical-connector parent relationships.
3. Deterministically exclude reader-reply ancestry and recorded missing/invalid parents. Use conversation context to classify eligible author continuations.
4. Assemble JSON from evidence IDs, preserving source text/order, and save the sanitized trace.

At most two model calls per task, with timeouts and no automatic retries. Browser credentials are isolated and egress is restricted to public HTTPS. This is a local CLI, not an OS sandbox; see [security details](security-checks/README.md).

## Validation and limits

```sh
npm test # Offline fixture tests; no API key needed.
RUN_LIVE_MODEL=1 node --test test/live-continuations.test.mjs # Paid, opt-in.
```

- **54 offline tests passed.** Three recorded-evidence model cases passed three runs each; the full paid suite makes up to 18 model calls. Covers field combinations, text/order, reader branches, failures, usage, tracing, and security.
- Fresh dependency/Chromium downloads and canonical/share CLI runs were verified on macOS arm64 with Node 26.12.0. Other OSes and the Node 22 minimum are unverified.
- Public content may be blocked, truncated, or missing text blocks. No login bypass, extra scrolling, or content expansion is attempted; post/continuation results remain partial or uncertain, not exhaustive.
- DOM connectors are layout-dependent; unknown relationships still need model interpretation and can be misclassified. Login-only sequence badges are not required. Rounded follower counts are not reported as exact.

See [examples and findings](examples/README.md) for observed successes, failures, and regression evidence.

## AI assistance and references

AI assisted implementation, tests, documentation, and live-result analysis. Deterministic tests verify orchestration; model evaluations are narrow checks, not a general accuracy guarantee.

[Original assignment](init_assignment.md) · [Requirement status](ASSIGNMENT_STATUS.md) · [Data contracts](CONTRACTS.md) · [Work log](WORK_LOG.md)
