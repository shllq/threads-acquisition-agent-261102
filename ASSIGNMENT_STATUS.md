# Assignment baseline and current gap analysis

## Invariant reference

[`init_assignment.md`](init_assignment.md) is the verbatim assignment and authoritative acceptance reference. Its existing contents were preserved without edits. [`init_assignment.sha256`](init_assignment.sha256) records the baseline digest:

```sh
shasum -a 256 -c init_assignment.sha256
```

Do not rewrite the assignment to match our implementation. Record clarifications, interpretations and approved scope changes separately. If the plan or tracker conflicts with the assignment, the assignment wins. A changed digest requires explicit review; the checksum detects changes but does not prevent intentional edits.

This report assesses the implementation based on initial commit `38cc7cc`, with tests re-run at this documentation checkpoint. It is a snapshot, not an automatic conformance report. Historical live observations are not fresh platform guarantees.

## Overall verdict

**Not yet assignment-ready.** We have an anonymous-browser feasibility probe, reusable runtime contracts and deterministic contract/browser tests. We do not yet have the required natural-language CLI Agent, structural extraction, contextual continuation classification or persisted Agent execution logs. Passing schema tests is not evidence that the acquisition workflow works.

## Core workflow

| Assignment expectation | Current status | Evidence / gap |
|---|---|---|
| CLI Agent accepts a message containing a Threads URL and desired fields, then acquires data and outputs JSON | Not implemented end to end | `npm run probe -- URL` accepts a URL, not the assignment message. `parseRequest(message, fields)` needs a separately supplied field list. No model SDK/tool loop connects input, acquisition and result assembly. |
| LLM API use | Pending | No model calls or provider/model configuration yet. Common provider key environment-variable names were absent at the preceding checkpoint; fake-provider tests can proceed without a key. |
| Roughly four hours to at most one day | Timebox guidance, not verified | No complete timing ledger; do not infer compliance from milestone counts. Keep remaining implementation minimal. |

## Feature requirements

| ID | Original requirement, summarized | Current status | Evidence / remaining work |
|---|---|---|---|
| F1 | Display name, follower count, post text and author continuations; requested combinations | Contract support only; live evidence for some values | Schemas/buildResult support four fields and tests cover all 15 nonempty combinations. Historical probes observed `Whoscall`, `15.1K` and post text. No automatic field acquisition or message-to-field selection. |
| F2 | Share and canonical URLs, one per task | Partial | Contracts accept both URL shapes and reject multiple URL tokens. The probe navigated a canonical URL successfully. Share resolution is not live-verified or connected to an Agent. The probe's host-only input validation is less strict than the request contract and is not yet unified. |
| F3 | Original text and order; exclude readers, author-reader replies and recommendations | Not implemented for acquisition | Tests show result assembly preserves supplied text; they do not validate real post extraction/order. Probe whole-page text includes recommendations and interface text. Structural isolation and filtering are missing. |
| F4 | Distinguish genuine author continuations from replies to readers by context | Not implemented | An `Author`-marked candidate was observed, but no classification or reply-relationship inference exists. Same author, marker or DOM order alone is insufficient. |
| F5 | Source URL, extraction time and whole-task tokens or cost | Partial metadata only | Probe records URLs/time; result and usage contracts exist. No model calls, task-level token aggregation or final Agent result. Do not substitute a synthetic zero-usage claim. |
| F6 | Explain inaccessible, incomplete or uncertain data; no fabrication/completeness claims | Partial | Probe always marks extraction incomplete; contracts enforce reasons and distinguish missing/uncertain/partial fields. Agent paths for access blocks, interrupted loading and ambiguous classifications remain unimplemented. Schema acceptance alone cannot prove evidence is sufficient. |
| F7 | Model/tool calls, results and end states; remove credentials; no private reasoning | Contract support only | Trace schemas validate completed call records and a final terminal event. No trace recorder, redactor, public-response projection, call execution or failure-path persistence. Probe JSON/screenshots are evidence artifacts, not the required execution trace. |

## Implementation requirements

| ID | Requirement | Current status |
|---|---|---|
| I1 | Language/framework/browser unrestricted; SDK AgentLoop permitted | Current stack is permitted: Node ESM, Playwright and Zod. TypeScript, custom frameworks, multi-Agent design and specific quality tools are not assignment requirements. No Agent loop yet. |
| I2 | Independent test browser, no private account/existing session; no requirement to bypass access restrictions | Satisfied for current probes: fresh Chromium contexts without imported state; no login or bypass attempted. Preserve this invariant in the future Agent. Login overlay and limited public content remain legitimate reasons for partial results. |

## Deliverables

| ID | Required delivery | Current status | Remaining work |
|---|---|---|---|
| D1 | GitHub source link, dependencies and launch instructions including browser/model setup | Partial local preparation | Local Git commit, lockfile and browser setup exist. No remote/GitHub link, model configuration instructions or final Agent launch command. |
| D2 | CLI examples, JSON result and JSON execution log with tool calls/results/end state | Probe examples only | README documents probe CLI; ignored artifacts contain page observations. Need reproducible Agent commands, final result JSON and sanitized execution-log JSON examples. Clearly label live versus fixture examples. |
| D3 | Short README: design, validation, known limits and AI use | Partial | Current README covers the probe, tests, limitations and AI assistance. Extend it to the finished workflow and actual validation results. |
| D4 | JSON to terminal or file | Satisfied for probe, pending Agent | Probe emits JSON to stdout and file. Final Agent result/trace output paths are not implemented. |

## What is actually verified

- Current `npm test`: **15 tests passed** (14 contract tests, one real-Chromium local-server test).
- Field projection, URL/field validation, original supplied newlines, explicit uncertainty, rounded follower precision, token consistency and trace structure are tested.
- Local browser test covers rendered evidence and an HTTP 403 response without asserting extraction completeness.
- Historical canonical-post/profile probes returned HTTP 200; local screenshots/text exist in ignored `artifacts/`.
- No live Agent run, share-URL verification, automatic continuation evaluation, secret-redaction test or final delivery acceptance has happened.

## Assignment-aligned next work

1. **Structural acquisition (M3):** implement tested post/profile evidence extraction, canonical/share resolution and recommendation isolation. Preserve observed text and relationships; stop honestly at access limits.
2. **Vertical CLI Agent (M4):** accept the original-style message, select fields through the configured model, invoke constrained browser tools and assemble requested results from evidence IDs.
3. **Correctness and accountability (M5, integrated with M4):** classify continuations using conversation context, retain uncertainty, sum all model usage and persist redacted calls/results plus terminal state, including errors/timeouts.
4. **Delivery (M6):** verify canonical/share live paths, provide sanitized JSON examples and model/browser instructions, finish README and publish to the agreed GitHub destination.

Avoid spending the remaining assignment budget on optional infrastructure. Existing contracts are implementation choices, not amendments to the original requirements; adjust them if real acquisition exposes a mismatch.
