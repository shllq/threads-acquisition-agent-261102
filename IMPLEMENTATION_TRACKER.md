# Implementation tracker

Baseline: [init_assignment.md](init_assignment.md) · Comparison: [ASSIGNMENT_STATUS.md](ASSIGNMENT_STATUS.md) · Plan: [PLAN.md](PLAN.md) · Actions: [WORK_LOG.md](WORK_LOG.md)

The original assignment is invariant and takes precedence over milestone labels. M1/M2 completion does not imply the assignment's end-to-end requirements are satisfied.

Status describes verified implementation, not proposed features. Update this file as each milestone changes.

## Milestone status

| Milestone | Status | Evidence / remaining work |
|---|---|---|
| M1 Anonymous-browser feasibility | Initial probe complete | Supplied canonical post and profile returned HTTP 200; fresh Chromium contexts; JSON and screenshots saved locally. Share URL subsequently verified in M3 and live CLI acceptance; broader conversation structures remain unevaluated. |
| M2 Contracts and validation | Implemented and fixture-tested | Zod request/evidence/result/usage/trace contracts and pure result assembly; field-selection and uncertainty tests. See `CONTRACTS.md`. Probe JSON remains separate from the result schema. |
| M3 Structural acquisition | Initial structural path implemented and verified | Separate post/profile evidence; recommendation exclusion; canonical/share live checks; fresh contexts. Recognized within-group vertical connectors now populate parent IDs; unknown roots and missing text remain conservative. Completeness false; no additional loading/expansion. |
| M4 End-to-end Agent | Implemented; deterministic workflow tested | Natural-language CLI, SDK, bounded tools and result assembly; live canonical/share all-fields and profile-name-only requests verified. |
| M5 Continuations and tracing | Narrow live regression passed | Prompt-only reader-reply failures led to connector extraction and deterministic ancestry eligibility. Three recorded cases passed three model runs each; fresh tai_wan_lan/multipart/share runs passed. Source text/order, usage and sanitized traces verified. Broad accuracy and crash recovery remain open. |
| M6 Delivery | Source/examples uploaded; reviewer access pending | Sanitized share result/trace and live-check summary under `examples/`. Temporary checkout with empty npm/browser caches passed fresh dependency/Chromium installation, 54 offline tests and canonical/share live CLI checks on macOS arm64 / Node 26.12.0. Pushed `main` to the private [GitHub repository](https://github.com/shllq/gogolook-test-261102) and verified remote/local commit identity. Reviewer access, other-machine/OS and Node 22 checks remain open. |

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
- Assignment share URL `https://www.threads.com/share/GW3EPb5M8/`: HTTP 200, resolved to `/@whoscall_tw/post/Dd0_RGwH4K7` (with a tracking query), four conversation nodes. Includes both an author continuation candidate and a reader/author exchange; the later live acceptance checks correctly excluded the reader reply after the prompt fix.
- At the M3 capture all parent IDs were null. Subsequent connector extraction now records recognized within-group parent edges; conversation completeness remains false. No additional loading or content expansion attempted.

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
| LLM/model usage | Live `gpt-4.1-mini`: canonical/share all-fields and profile-only runs passed; usage 821/872/120 tokens. |
| crapper / dryer / mutator | Not run: not installed. |
| End-to-end assignment acceptance | Three live CLI cases checked; reader-reply, anonymous multipart and structural reader-branch regressions each passed in three model runs. Broader accuracy and exhaustive extraction not established; source/examples uploaded to GitHub, reviewer access unverified. |
| Current offline suite | 54 pass, 3 paid live tests skipped by default. Includes unavailable-field acquisition reasons and mixed available/unavailable profile data. Fresh temporary dependency/Chromium installation with empty caches also passed all 54 offline tests. |

## Next steps

1. Grant reviewers access to the private [GitHub repository](https://github.com/shllq/gogolook-test-261102), then submit the link. `origin` is configured and `main` is pushed; repository visibility was not changed and no invitations were sent.
2. Broaden continuation evaluation if time permits. The recorded share case reproduced the old prompt's false-positive apology; the revised prompt excluded it in three model runs and a fresh live share run. The anonymous multipart case also passed three model runs without sequence badges. A new reader-branch case checks recognized connector ancestry and also passed three model runs. See `examples/README.md` for connector findings and limitations; these three cases are not a broad accuracy benchmark.
3. Verify another machine/OS or Node 22 if required. Fresh `npm ci`, Chromium download and 54 offline tests passed with empty caches on this Mac / Node 26.12.0. Canonical/share CLI smoke checks also passed from that install (875/927 tokens); the three recorded paid regressions remain opt-in and were skipped.
4. Extend acquisition/expansion only for demonstrated incomplete cases; no exhaustive-loading claim is permitted. CLI egress remains application-level public-HTTPS protection, not an OS sandbox. Abrupt termination/crash persistence remains unimplemented.

## Repository state

`main` tracks `origin/main` at `https://github.com/shllq/gogolook-test-261102.git`; source, tests, setup docs and sanitized examples have been uploaded and remote/local commit identity checked. The repository remains private, so reviewers need access. Dependencies, credentials, live artifacts and downloaded Pi packages are excluded. Untracked `notes.md` remains local and untouched. Earlier work-log statements about the absent repository/remote or pending publication describe prior milestones.
