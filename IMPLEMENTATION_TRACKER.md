# Implementation tracker

Baseline: [init_assignment.md](init_assignment.md) · Comparison: [ASSIGNMENT_STATUS.md](ASSIGNMENT_STATUS.md) · Plan: [PLAN.md](PLAN.md) · Actions: [WORK_LOG.md](WORK_LOG.md)

The original assignment is invariant and takes precedence over milestone labels. M1/M2 completion does not imply the assignment's end-to-end requirements are satisfied.

Status describes verified implementation, not proposed features. Update this file as each milestone changes.

## Milestone status

| Milestone | Status | Evidence / remaining work |
|---|---|---|
| M1 Anonymous-browser feasibility | Initial probe complete | Supplied canonical post and profile returned HTTP 200; fresh Chromium contexts; JSON and screenshots saved locally. Share URL and broader conversation structures remain unverified. |
| M2 Contracts and validation | Implemented and fixture-tested | Zod request/evidence/result/usage/trace contracts and pure result assembly; field-selection and uncertainty tests. See `CONTRACTS.md`. Probe JSON remains separate from the result schema. |
| M3 Structural acquisition | Not started | Current probe captures whole-page text/links, not isolated post nodes or reply relationships. |
| M4 End-to-end Agent | Not started | No model SDK, natural-language input handling, tool loop or final result assembly yet. |
| M5 Continuations and tracing | Not started | No automatic continuation classification, aggregate model usage or redacted Agent trace yet. |
| M6 Delivery | Partial documentation only | Probe README exists. Final examples, clean-install verification and GitHub delivery pending. |

## Completed implementation

- [x] Minimal private Node ESM package with lockfile.
- [x] Playwright dependency and local Chromium installation.
- [x] `npm run probe -- URL [OUTPUT_DIRECTORY]`.
- [x] Fresh browser context without imported credentials or persistent private profile.
- [x] Bounded navigation and observation; HTTP status, URLs, timestamp, title, rendered body text, description and links captured.
- [x] JSON evidence and full-page screenshot artifacts.
- [x] Explicit `extraction_complete: false`; page observation is not a claim of complete extraction.
- [x] Local real-browser test covering text/newlines, links, timestamp, HTTP 403 and incomplete semantics.
- [x] Live canonical-post and author-profile observations.
- [x] Probe README, initial plan, tracker and work log.
- [x] Runtime schemas and documented request/evidence/result/usage/trace contracts.
- [x] Pure result assembly with exact field projection, explicit missing data and derived overall status.
- [x] All 15 nonempty field combinations, rounded-vs-exact counts, unknown usage, trace errors and terminal states tested.

## Recorded live findings

Post: https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz

- Main text was readable without login.
- A same-author candidate immediately followed, marked `Author`, beginning `辨認方法如下：`.
- Candidate permalink: https://www.threads.com/@whoscall_tw/post/De6YqepH6ke
- `Related threads` appeared after the conversation and must be excluded.
- Screenshot showed a sign-in overlay. Already-loaded DOM text remained readable; completeness was not established.
- A subsequent DOM inspection found no `<article>` nodes or JSON-LD. The root post had a `data-pressable-container` ancestor, a permalink containing `<time>`, and a `[lang]` text region. These are candidate structural selectors, not a verified general extractor. Local inspection evidence: `artifacts/whoscall-initial/structure.json`.

Profile: https://www.threads.com/@whoscall_tw

- Display name: `Whoscall`.
- Displayed followers: `15.1K`; exact count unknown.

Local evidence (ignored by Git, not guaranteed to accompany a clone):

- `artifacts/whoscall-initial/page.json` and `page.png`.
- `artifacts/whoscall-profile/page.json` and `page.png`.

## Verification ledger

| Check | Recorded result |
|---|---|
| Test-first probe import | Failed before implementation: missing probe module, as expected. |
| Local Chromium fixture test | Passed: 1 test, including 200 and 403 paths. |
| Contract tests | Passed: 14 tests, including all 15 nonempty field combinations. |
| Trace error-consistency TDD | New test failed because individual failed events accepted null errors; moved validation to the event boundary and verified it passes. |
| Live post probe | HTTP 200; evidence captured. |
| Live profile probe | HTTP 200; evidence captured. |
| Screenshot inspection | Sign-in overlay observed. |
| LLM/model usage | Not applicable yet: no model calls. |
| crapper / dryer / mutator | Not run: not installed. |
| End-to-end assignment acceptance | Not yet verified. |

## Next steps

1. Implement fixture-tested structural acquisition using the observed container/time/text clues; inspect reply relationships and recommendation boundaries before inferring them.
2. Verify share-URL resolution and profile field acquisition independently of contract acceptance.
3. Select the model SDK/provider and decide whether TypeScript adds value beyond the current ESM implementation. No common model API-key environment variables were detected during this milestone (names checked without printing values).
4. Implement bounded Agent orchestration, continuation classification and complete execution tracing.
5. Verify share URLs and live end-to-end behavior; finish deliverables.

## Repository state at planning checkpoint

A local Git repository exists on `main`; no remote is configured. The initial commit checkpoint captures the probe, contracts/tests, documentation and project-local Pi configuration. Dependencies, live artifacts and downloaded Pi packages are excluded. No publication or push has been performed. Earlier work-log statements about untracked files or the absent Git repository describe prior milestones.
