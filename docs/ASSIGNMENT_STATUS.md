# Assignment baseline and current gap analysis

## Invariant reference

[`init_assignment.md`](../init_assignment.md) is the verbatim authoritative acceptance reference. Its bytes remain unchanged; verify with:

```sh
shasum -a 256 -c init_assignment.sha256
```

Plans, schemas and milestone labels do not amend the assignment. This report is a manual requirement-by-requirement snapshot, updated through the 2026-11-02 full regression and published CLI evidence. It is not an automatic conformance guarantee. Older run counts and token values below describe their historical checkpoints, not the latest totals.

## Latest reviewer evidence

- **58 offline tests passed; 10 opt-in paid/network cases skipped by default.** Four recorded-evidence classifier cases each passed three independent runs; six current-website CLI cases also passed.
- The six CLI cases cover the original share URL, pinned-message exclusion, valid/unavailable post URLs, profile-name-only selection and content without continuations. Their nine model calls used **6,079 input + 301 output = 6,380 Tokens**, excluding the separate recorded-evidence classifier regressions.
- [Runnable commands, per-case token table and all six result/trace pairs](../examples/README.md#cli-回歸用量與審閱證據) are available for review without credentials. The traces include the acquired public evidence; offline tests validate published schemas, source text and usage totals.
- [Root README](../README.md) provides the short setup/design/verification/limitations/AI-use guide required by D3. No new broad-accuracy, cross-platform or reviewer-access guarantee is implied.

## Overall verdict

**Implemented, checked live on canonical/share inputs, and uploaded to [GitHub](https://github.com/shllq/gogolook-test-261102); reviewer access and broader accuracy evaluation remain open.** The repository is private; grant reviewers access before submitting the link. The CLI selects requested fields, acquires anonymous browser evidence, classifies continuations, and emits source-backed JSON plus sanitized traces. An existing live share artifact exposed a reader reply misclassified as a continuation. The old prompt reproduced that failure; the revised prompt passed three recorded-case model runs and a fresh live share run. A later tai_wan_lan run showed the revised prompt still included reader replies. Connector extraction and deterministic ancestry eligibility now exclude recognized reader branches and unresolved recorded parents; fresh tai_wan_lan/multipart/share CLI checks and three recorded-case regressions passed. This remains narrow evidence, not a general accuracy guarantee.

## Feature requirements

| ID | Requirement | Implementation / remaining acceptance gap |
|---|---|---|
| F1 | Display name, followers, original post and author continuations; requested combinations | CLI model field selection, conditional profile acquisition and exact field projection implemented. All 15 combinations are contract-tested; all-fields and profile-name-only messages were also verified live. |
| F2 | Canonical and share URLs, one per task | Deterministic route/cardinality validation before model/browser access. Both canonical and share model-driven CLI paths completed live with source-backed partial results. |
| F3 | Original text/order; exclude readers, author-reader replies and recommendations | Model selects evidence IDs; deterministic assembly preserves text and observed order and rejects root, reader, recommendation, preceding or unknown IDs. Recommendations and recognized reader-reply ancestry are filtered structurally; model selections are constrained to eligible IDs, including no recorded missing/invalid ancestors. The revised prompt excluded the observed reader-response apology in three recorded-case model runs and a fresh live share run; the anonymous multipart case also retained all three expected continuations in three recorded-evidence model runs. Broader accuracy remains unevaluated. No expansion/truncation proof; post content remains partial. |
| F4 | Contextual distinction of continuations vs author-reader replies | Classifier receives conversation context and explicit instructions that same author/marker/adjacency are insufficient. Uncertainty retained; continuations never claimed exhaustive. A reader-response failure was reproduced and corrected on one observed conversation; fake-provider tests and this narrow live regression cannot establish general semantic accuracy. |
| F5 | Source URL, extraction time, task tokens or cost | Result includes input/resolved URL, observation timestamp and aggregate tokens across all model calls. Missing provider usage is unknown, never synthetic zero. Cost reporting not needed when tokens are available. |
| F6 | Explain inaccessible/incomplete/uncertain data; no fabrication | Browser limitations propagated for observed post/continuations and unavailable requested fields, including blocked/missing targets and missing profile values. Unavailable-field reasons are redacted before output; ambiguous/empty continuation selection stays uncertain. Failed workflow returns error JSON rather than fabricated result. |
| F7 | Model/tool calls, results, terminal state; sanitized credentials, no private reasoning | CLI persists trace JSON for normal and caught-error paths. Public SDK content only; configured key, credential-shaped fields and common token patterns redacted. No universal arbitrary-secret guarantee or crash/interruption recovery; review artifacts before sharing. |

## Implementation requirements

- **I1:** Node ESM, Playwright, Zod and official OpenAI SDK; fixed bounded workflow, not a custom Agent framework. At most two model calls, no retries, SDK timeout/output cap.
- **I2:** Fresh non-persistent Chromium context, no private account/session or login bypass. All CLI launches use credential-isolated browser environments and a DNS-pinned public-IPv4/port-443 egress proxy. This is not an OS-level sandbox or an untrusted remote browsing service.

## Deliverables

| ID | Status / remaining work |
|---|---|
| D1 GitHub source/dependencies/setup | Lockfile and setup instructions exist. A temporary checkout with empty npm/browser caches passed dependency installation, fresh Chromium download, 54 offline tests and canonical/share live CLI checks on macOS arm64 / Node 26.12.0. Source/examples pushed to [`shllq/gogolook-test-261102`](https://github.com/shllq/gogolook-test-261102) on `main`, with remote/local commit identity verified. Repository is private; reviewer access is not verified. Another machine/OS and the Node 22 minimum remain unverified. |
| D2 CLI examples/result/log | README has runnable original-style message; sanitized successful share result/trace JSON and an acceptance summary are committed under `examples/`. |
| D3 README | Design, setup, validation, limitations, AI assistance and actual live model findings documented. |
| D4 JSON terminal/file | CLI writes result to stdout and `result.json`, trace to `trace.json`; errors use an error object and nonzero exit. |

## Verification

- **58 offline tests pass; ten paid/network regression tests are skipped by default.** Includes contracts/browser acquisition, Agent/SDK behavior, ten security tests, Make shortcuts and published-example checks. Opt-in coverage comprises four recorded-evidence model tests and six live CLI tests; see the latest evidence above. Earlier installation checkpoints below retain their original counts.
- Test-first Agent run failed on the missing module before implementation.
- Agent tests cover source-backed selection/order, rejection of invalid IDs, profile-only projection, ambiguous empty continuations, missing evidence/usage, acquisition failure reasons for unavailable fields, preservation of available fields, failed-call terminal traces and credential redaction.
- SDK fake-client test verifies public content/usage projection and truncated-response rejection.
- CLI without credentials exited nonzero and persisted a failed model event plus terminal state in `artifacts/m4-no-key/` (ignored).
- Prior canonical/share browser acquisitions succeeded live; the recommendation flag was additionally verified on the real canonical page before M4.
- Fresh live canonical/share all-fields runs completed with partial results (821/872 tokens); profile-name-only returned exactly that field (120 tokens).
- The old classifier selected a reader reply on the recorded share case. The revised prompt passed three independent model runs and fresh live share acquisition; see [findings](FINDINGS.md) for scope and evidence.
- The anonymous `@wheretogo_blue` multipart regression retained all three manually labeled continuations in order in three model runs, preserving source text and partial status without sequence badges. The user's logged-in/logged-out screenshots explain the badge difference for this example; no private login state is used.
- Fresh-install follow-up: a temporary checkout with empty npm and Playwright caches passed `npm ci` (zero audit vulnerabilities), `npx playwright install chromium` (Chromium v1248) and 54 offline tests, with 3 paid regressions skipped. Canonical/share CLI checks from that install returned HTTP 200 for posts/profiles, expected continuations, preserved source text and partial results (875/927 tokens). Tested on macOS arm64 / Node 26.12.0, not another machine/OS or Node 22.
- Connector-first follow-up: fresh tai_wan_lan, multipart and share runs returned two/three/one expected continuations (1,891/2,460/921 tokens). All three recorded cases passed three model runs each. Seven ambiguous/missing text blocks remain on tai_wan_lan; incomplete ancestry is not filled in.
- GitHub upload: configured the user-supplied HTTPS remote and pushed `main`; verified the remote commit matches local HEAD. Scanned tracked files and Git patch history for the configured API key and selected high-signal credential patterns; no matches. This is not a universal secret audit. `.env`, artifacts and untracked `notes.md` were excluded.
- **No broad model-accuracy benchmark, other-machine/OS or Node 22 setup check, crash-recovery validation or reviewer-access check yet.**

## Next

1. Grant the assignment reviewers access to the private [GitHub repository](https://github.com/shllq/gogolook-test-261102) and submit its link. Visibility was preserved; no reviewer invitations were sent.
2. If more evaluation time is available, test additional genuine-continuation and reader-reply conversations; current regressions cover reader-reply exclusion, an anonymous multipart conversation, recorded structural reader branches and a later pinned author message. Six CLI cases additionally exercise current public pages, but do not establish broad semantic accuracy.
3. Keep partial/uncertain statuses where evidence is incomplete; do not claim exhaustive extraction. Fresh downloads passed locally, but another machine/OS and Node 22 remain unchecked.
