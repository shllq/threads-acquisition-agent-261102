# Assignment baseline and current gap analysis

## Invariant reference

[`init_assignment.md`](init_assignment.md) is the verbatim authoritative acceptance reference. Its bytes remain unchanged; verify with:

```sh
shasum -a 256 -c init_assignment.sha256
```

Plans, schemas and milestone labels do not amend the assignment. This report is a manual snapshot through live canonical/share acceptance checks and the reader-reply regression fix, not an automatic conformance guarantee.

## Overall verdict

**Implemented and checked live on canonical/share inputs; GitHub delivery and broader accuracy evaluation remain open.** The CLI selects requested fields, acquires anonymous browser evidence, classifies continuations, and emits source-backed JSON plus sanitized traces. An existing live share artifact exposed a reader reply misclassified as a continuation. The old prompt reproduced that failure; the revised prompt passed three recorded-case model runs and a fresh live share run. This is narrow regression evidence, not a general accuracy guarantee.

## Feature requirements

| ID | Requirement | Implementation / remaining acceptance gap |
|---|---|---|
| F1 | Display name, followers, original post and author continuations; requested combinations | CLI model field selection, conditional profile acquisition and exact field projection implemented. All 15 combinations are contract-tested; all-fields and profile-name-only messages were also verified live. |
| F2 | Canonical and share URLs, one per task | Deterministic route/cardinality validation before model/browser access. Both canonical and share model-driven CLI paths completed live with source-backed partial results. |
| F3 | Original text/order; exclude readers, author-reader replies and recommendations | Model selects evidence IDs; deterministic assembly preserves text and observed order and rejects root, reader, recommendation, preceding or unknown IDs. Recommendations already filtered structurally. The revised prompt excluded the observed reader-response apology in three recorded-case model runs and a fresh live share run; the anonymous multipart case also retained all three expected continuations in three recorded-evidence model runs. Broader accuracy remains unevaluated. No expansion/truncation proof; post content remains partial. |
| F4 | Contextual distinction of continuations vs author-reader replies | Classifier receives conversation context and explicit instructions that same author/marker/adjacency are insufficient. Uncertainty retained; continuations never claimed exhaustive. A reader-response failure was reproduced and corrected on one observed conversation; fake-provider tests and this narrow live regression cannot establish general semantic accuracy. |
| F5 | Source URL, extraction time, task tokens or cost | Result includes input/resolved URL, observation timestamp and aggregate tokens across all model calls. Missing provider usage is unknown, never synthetic zero. Cost reporting not needed when tokens are available. |
| F6 | Explain inaccessible/incomplete/uncertain data; no fabrication | Browser limitations propagated for observed post/continuations; missing fields unavailable, ambiguous/empty continuation selection uncertain. Failed workflow returns error JSON rather than fabricated result. |
| F7 | Model/tool calls, results, terminal state; sanitized credentials, no private reasoning | CLI persists trace JSON for normal and caught-error paths. Public SDK content only; configured key, credential-shaped fields and common token patterns redacted. No universal arbitrary-secret guarantee or crash/interruption recovery; review artifacts before sharing. |

## Implementation requirements

- **I1:** Node ESM, Playwright, Zod and official OpenAI SDK; fixed bounded workflow, not a custom Agent framework. At most two model calls, no retries, SDK timeout/output cap.
- **I2:** Fresh non-persistent Chromium context, no private account/session or login bypass. All CLI launches use credential-isolated browser environments and a DNS-pinned public-IPv4/port-443 egress proxy. This is not an OS-level sandbox or an untrusted remote browsing service.

## Deliverables

| ID | Status / remaining work |
|---|---|
| D1 GitHub source/dependencies/setup | Lockfile and setup instructions exist. A clean temporary `npm ci` and offline suite passed using the existing browser cache. No remote, published link or new-machine browser-install check. |
| D2 CLI examples/result/log | README has runnable original-style message; sanitized successful share result/trace JSON and an acceptance summary are committed under `examples/`. |
| D3 README | Design, setup, validation, limitations, AI assistance and actual live model findings documented. |
| D4 JSON terminal/file | CLI writes result to stdout and `result.json`, trace to `trace.json`; errors use an error object and nonzero exit. |

## Verification

- **49 offline tests pass; two paid regression tests are skipped by default:** 27 contract/browser tests, 9 Agent/SDK tests, 10 security tests, 2 Make shortcut tests and 1 published-example test. Includes a complete fake-provider workflow through guarded Chromium, endpoint/credential/redaction checks and private-network denial.
- Test-first Agent run failed on the missing module before implementation.
- Agent tests cover source-backed selection/order, rejection of invalid IDs, profile-only projection, ambiguous empty continuations, missing evidence/usage, failed-call terminal traces and credential redaction.
- SDK fake-client test verifies public content/usage projection and truncated-response rejection.
- CLI without credentials exited nonzero and persisted a failed model event plus terminal state in `artifacts/m4-no-key/` (ignored).
- Prior canonical/share browser acquisitions succeeded live; the recommendation flag was additionally verified on the real canonical page before M4.
- Fresh live canonical/share all-fields runs completed with partial results (821/872 tokens); profile-name-only returned exactly that field (120 tokens).
- The old classifier selected a reader reply on the recorded share case. The revised prompt passed three independent model runs and fresh live share acquisition; see `examples/README.md` for scope and evidence.
- The anonymous `@wheretogo_blue` multipart regression retained all three manually labeled continuations in order in three model runs, preserving source text and partial status without sequence badges. The user's logged-in/logged-out screenshots explain the badge difference for this example; no private login state is used.
- Clean temporary dependency installation and the offline suite passed; browser binaries came from the existing machine cache.
- **No broad model-accuracy benchmark, new-machine browser setup, crash-recovery validation or GitHub delivery yet.**

## Next

1. Agree on the GitHub destination, configure a remote and publish the reviewed source/examples.
2. If more evaluation time is available, test additional genuine-continuation and reader-reply conversations; current regressions cover one reader-reply failure case and one anonymous multipart conversation.
3. Keep partial/uncertain statuses where evidence is incomplete. New-machine browser installation remains unchecked; do not claim exhaustive extraction.
