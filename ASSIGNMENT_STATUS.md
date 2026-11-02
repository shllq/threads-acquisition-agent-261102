# Assignment baseline and current gap analysis

## Invariant reference

[`init_assignment.md`](init_assignment.md) is the verbatim authoritative acceptance reference. Its bytes remain unchanged; verify with:

```sh
shasum -a 256 -c init_assignment.sha256
```

Plans, schemas and milestone labels do not amend the assignment. This report is a manual snapshot through the initial M4/M5 implementation, not an automatic conformance guarantee.

## Overall verdict

**Implemented vertical workflow; not yet delivery-ready or live-model verified.** The CLI accepts the assignment-style message, selects fields using OpenAI, calls existing anonymous browser tools, optionally classifies continuations from conversation context, and emits source-backed JSON plus sanitized execution logs. Deterministic fake-provider tests establish orchestration behavior, not actual model classification accuracy. No configured API key was available for a live model run.

## Feature requirements

| ID | Requirement | Implementation / remaining acceptance gap |
|---|---|---|
| F1 | Display name, followers, original post and author continuations; requested combinations | CLI model field selection, conditional profile acquisition and exact field projection implemented. All 15 combinations are contract-tested; natural-language interpretation still needs live evaluation. |
| F2 | Canonical and share URLs, one per task | Deterministic route/cardinality validation before model/browser access. Both acquisition paths previously returned HTTP 200 live; complete model-driven runs pending. |
| F3 | Original text/order; exclude readers, author-reader replies and recommendations | Model selects evidence IDs; deterministic assembly preserves text and observed order and rejects root, reader, recommendation, preceding or unknown IDs. Recommendations already filtered structurally. Semantic exclusion of author-reader replies depends on model accuracy and remains unverified live. No expansion/truncation proof; post content remains partial. |
| F4 | Contextual distinction of continuations vs author-reader replies | Classifier receives conversation context and explicit instructions that same author/marker/adjacency are insufficient. Uncertainty retained; continuations never claimed exhaustive. Fake-provider tests cannot establish semantic accuracy. |
| F5 | Source URL, extraction time, task tokens or cost | Result includes input/resolved URL, observation timestamp and aggregate tokens across all model calls. Missing provider usage is unknown, never synthetic zero. Cost reporting not needed when tokens are available. |
| F6 | Explain inaccessible/incomplete/uncertain data; no fabrication | Browser limitations propagated for observed post/continuations; missing fields unavailable, ambiguous/empty continuation selection uncertain. Failed workflow returns error JSON rather than fabricated result. |
| F7 | Model/tool calls, results, terminal state; sanitized credentials, no private reasoning | CLI persists trace JSON for normal and caught-error paths. Public SDK content only; configured key, credential-shaped fields and common token patterns redacted. No universal arbitrary-secret guarantee or crash/interruption recovery; review artifacts before sharing. |

## Implementation requirements

- **I1:** Node ESM, Playwright, Zod and official OpenAI SDK; fixed bounded workflow, not a custom Agent framework. At most two model calls, no retries, SDK timeout/output cap.
- **I2:** Fresh non-persistent Chromium context, no private account/session or login bypass. All CLI launches use credential-isolated browser environments and a DNS-pinned public-IPv4/port-443 egress proxy. This is not an OS-level sandbox or an untrusted remote browsing service.

## Deliverables

| ID | Status / remaining work |
|---|---|
| D1 GitHub source/dependencies/setup | Lockfile and browser/model/CLI instructions exist. No remote configured, published repository link or clean-install verification. |
| D2 CLI examples/result/log | README has runnable original-style message. Ignored local no-key failure artifacts exist; sanitized successful result/trace examples still pending. |
| D3 README | Design, setup, validation, limitations and AI assistance documented. Update with actual live model findings before delivery. |
| D4 JSON terminal/file | CLI writes result to stdout and `result.json`, trace to `trace.json`; errors use an error object and nonzero exit. |

## Verification

- **46 tests pass:** 27 contract/browser tests, 9 Agent/SDK tests and 10 security tests. Includes a complete fake-provider workflow through guarded Chromium, endpoint/credential/redaction checks and private-network denial.
- Test-first Agent run failed on the missing module before implementation.
- Agent tests cover source-backed selection/order, rejection of invalid IDs, profile-only projection, ambiguous empty continuations, missing evidence/usage, failed-call terminal traces and credential redaction.
- SDK fake-client test verifies public content/usage projection and truncated-response rejection.
- CLI without credentials exited nonzero and persisted a failed model event plus terminal state in `artifacts/m4-no-key/` (ignored).
- Prior canonical/share browser acquisitions succeeded live; the recommendation flag was additionally verified on the real canonical page before M4.
- **No live model call, model accuracy evaluation, full successful CLI acceptance, crash-recovery validation or GitHub delivery yet.**

## Next

1. Set a dedicated restricted/revocable key in local `.env` (or inject `OPENAI_API_KEY` for CI); run canonical/share natural-language cases and manually check continuation decisions.
2. Keep partial/uncertain statuses where evidence is incomplete; fix only demonstrated acquisition/classification gaps.
3. Save sanitized successful output/trace examples, verify clean setup and publish to the agreed GitHub destination.
