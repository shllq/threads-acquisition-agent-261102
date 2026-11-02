# Implementation tracker

Baseline: [init_assignment.md](init_assignment.md) · Comparison: [ASSIGNMENT_STATUS.md](ASSIGNMENT_STATUS.md) · Plan: [PLAN.md](PLAN.md) · Actions: [WORK_LOG.md](WORK_LOG.md)

The original assignment is invariant and takes precedence over milestone labels. M1/M2 completion does not imply the assignment's end-to-end requirements are satisfied.

Status describes verified implementation, not proposed features. Update this file as each milestone changes.

## Milestone status

| Milestone | Status | Evidence / remaining work |
|---|---|---|
| M1 Anonymous-browser feasibility | Initial probe complete | Supplied canonical post and profile returned HTTP 200; fresh Chromium contexts; JSON and screenshots saved locally. Share URL and broader conversation structures remain unverified. |
| M2 Contracts and validation | Implemented and fixture-tested | Zod request/evidence/result/usage/trace contracts and pure result assembly; field-selection and uncertainty tests. See `CONTRACTS.md`. Probe JSON remains separate from the result schema. |
| M3 Structural acquisition | Initial structural path implemented and verified | Separate post/profile evidence; recommendation exclusion; canonical/share live checks; fresh contexts. Reply relationships remain unknown, completeness false, and additional loading/expansion is not implemented. |
| M4 End-to-end Agent | Implemented; deterministic workflow tested | Natural-language CLI, official OpenAI SDK, bounded tool orchestration and result assembly. Live model run pending API key. |
| M5 Continuations and tracing | Initial implementation; live accuracy unverified | Model selects continuation evidence IDs by context; source text/order preserved; total usage and sanitized traces persisted, including failures. No crash recovery. |
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
- [x] `acquirePost` / `acquireProfile` produce schema-validated structural evidence and explicit limitations.
- [x] Synthetic browser fixtures distinguish main text from UI/previews/recommendations while retaining reader conversation as context.
- [x] Share/canonical acquisition CLI with evidence JSON to stdout and file; both paths verified live.
- [x] Public profile name and follower count extraction, including exact public tooltip vs rounded visible count.
- [x] Redirect final HTTP status, timeout, ambiguous/hidden/conflicting evidence and unsafe-input tests.

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
- Initial probe displayed followers: `15.1K`; that observation did not inspect exact-count attributes.
- M3 extraction additionally observed public numeric `title="15,107"`, allowing an exact count of 15107 for that capture. This is source evidence, not conversion from `15.1K`.

M3 live acquisition:

- Canonical URL: HTTP 200, two conversation nodes, recommendations excluded.
- Assignment share URL `https://www.threads.com/share/GW3EPb5M8/`: HTTP 200, resolved to `/@whoscall_tw/post/Dd0_RGwH4K7` (with a tracking query), four conversation nodes. Includes both an author continuation candidate and a reader/author exchange; classification is pending.
- All parent IDs remain null and conversation completeness false. No additional loading or content expansion attempted.

Local evidence (ignored by Git, not guaranteed to accompany a clone):

- `artifacts/whoscall-initial/page.json` and `page.png`.
- `artifacts/whoscall-profile/page.json` and `page.png`.
- `artifacts/m3-canonical/evidence.json` and `artifacts/m3-share/evidence.json`.
- `artifacts/m3-discovery/`: preliminary DOM observations, not committed fixtures.

## Verification ledger

| Check | Recorded result |
|---|---|
| Test-first probe import | Failed before implementation: missing probe module, as expected. |
| Local Chromium fixture test | Passed: 1 test, including 200 and 403 paths. |
| Contract tests | Passed: 14 tests, including all 15 nonempty field combinations. |
| Structural acquisition tests | Passed: 12 real-Chromium fixture tests; current total is 27 tests. |
| M3 live canonical/share acquisition | Both HTTP 200; validated structural post/profile evidence saved locally. |
| Trace error-consistency TDD | New test failed because individual failed events accepted null errors; moved validation to the event boundary and verified it passes. |
| Live post probe | HTTP 200; evidence captured. |
| Live profile probe | HTTP 200; evidence captured. |
| Screenshot inspection | Sign-in overlay observed. |
| LLM/model usage | Not applicable yet: no model calls. |
| crapper / dryer / mutator | Not run: not installed. |
| End-to-end assignment acceptance | Not yet verified. |

## Next steps

1. Provision macOS Keychain (or inject `OPENAI_API_KEY` through a credential manager on other platforms) and run the natural-language CLI against canonical/share inputs. Current total: 44 passing tests; live model behavior is not verified.
2. Manually evaluate continuation selection against genuine continuations and reader/author exchanges; record classification errors rather than equating fake-provider tests with model accuracy.
3. Publish sanitized successful result/trace examples. The no-key CLI failure path has been exercised locally; abrupt termination/crash persistence is not implemented.
4. Extend acquisition/expansion only where justified by real incomplete cases; currently no exhaustive-loading claim is permitted. CLI browser egress is now restricted to DNS-pinned public IPv4 on port 443; it remains application-level protection, not a hosted-service/OS sandbox.
5. Verify live end-to-end canonical/share messages and finish examples, README and agreed GitHub delivery.

## Repository state at planning checkpoint

A local Git repository exists on `main`; no remote is configured. The initial commit checkpoint captures the probe, contracts/tests, documentation and project-local Pi configuration. Dependencies, live artifacts and downloaded Pi packages are excluded. No publication or push has been performed. Earlier work-log statements about untracked files or the absent Git repository describe prior milestones.
