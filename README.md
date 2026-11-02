# Threads acquisition — browser feasibility probe

This is an initial anonymous-browser probe, not the completed extraction Agent.
Requires Node.js 22+ and npm.

## Project planning

- [Original assignment](init_assignment.md): invariant acceptance reference; preserve verbatim. Verify with `shasum -a 256 -c init_assignment.sha256`.
- [Assignment comparison](ASSIGNMENT_STATUS.md): requirement-by-requirement evidence and gaps.
- [Initial plan](PLAN.md): requirements, architecture, milestones, validation and scope.
- [Implementation tracker](IMPLEMENTATION_TRACKER.md): completed work, evidence, gaps and next steps.
- [Work log](WORK_LOG.md): actions, rationale and verification history.
- [Data contracts](CONTRACTS.md): runtime schemas for requests, evidence, results, token usage and execution traces.

```sh
npm ci
npx playwright install chromium
npm test
npm run probe -- 'https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz'
```

Optionally pass an output directory after the URL. Each run launches Chromium with a fresh, non-persistent context: no private profile, imported cookies or login credentials. It observes the page for eight seconds after DOMContentLoaded; this does not prove loading is complete.

Outputs: `page.json` (HTTP status, URL, timestamp, title, rendered body text, description and links) and `page.png`. Artifacts are ignored by Git. stdout contains the observation JSON; use `npm run --silent probe -- URL` to omit npm's banner. `status: observed` means a page was inspected, not successful or complete data extraction. Navigation failures are recorded with `status: failed`; HTTP errors remain visible in `http_status`.

## Initial live observations

The supplied post and its author's public profile both returned HTTP 200 during the initial test:

- Post: `https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz`
- Profile: `https://www.threads.com/@whoscall_tw`
- Profile displayed name: `Whoscall`.
- Profile displayed followers: `15.1K` (rounded display, not an exact count).
- Main text: `看到 07 開頭的陌生號碼\n先別急著認定是高雄打來的\n有可能是070 網路電話`.
- A same-author continuation candidate immediately followed, marked `Author`, beginning `辨認方法如下：`; its permalink was `https://www.threads.com/@whoscall_tw/post/De6YqepH6ke`.
- The post page also contained unrelated `Related threads` entries. Whole-page text must not be treated as extracted post content.
- A sign-in modal obscured the screenshot, although the already-loaded DOM text was readable. No login or access-limit bypass was attempted.

Evidence is saved locally in `artifacts/whoscall-initial/` and `artifacts/whoscall-profile/`. This observation does not establish exhaustive continuation coverage or a general solution for distinguishing author-reader replies.

## Data contracts

`src/contracts.mjs` provides Zod runtime schemas and `buildResult` for field selection, explicit unavailable/uncertain/partial states, rounded follower displays, consistent token usage and trace structure. These are pure contracts, not an implemented Agent or automatic extractor. See [CONTRACTS.md](CONTRACTS.md) for semantics and remaining responsibilities.

## Validation and limitations

`npm test` also validates all 15 nonempty requested-field combinations, missing/uncertain data, follower precision, token totals, evidence identity and trace terminal/error states. The browser test uses real Chromium against a local fixture server, checking rendered Chinese text/newlines, absolute links, capture timestamp, HTTP 403 reporting and the explicit incomplete-extraction flag. Live network observations are separate from deterministic tests.

No LLM is called yet, so there is no model usage or model trace. The probe does not emit the Agent result schema defined in `src/contracts.mjs`. Share URLs, incremental loading, structural extraction, automatic continuation classification, and credential-redacted Agent tracing remain to be implemented. The probe captures public rendered text and links, not browser cookies, headers or storage. Review artifacts before sharing, since public links can still contain tracking parameters.

AI assistance was used to write the probe, its fixture test and these notes, and to run and interpret the live browser observations.
