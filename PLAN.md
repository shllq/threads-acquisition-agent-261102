# Initial implementation plan

## Authoritative reference

The verbatim [original assignment](init_assignment.md) is the invariant acceptance baseline; do not edit it to match the plan. Its digest is recorded in `init_assignment.sha256`. The assignment takes precedence over this design. See [ASSIGNMENT_STATUS.md](ASSIGNMENT_STATUS.md) for the current conformance snapshot.

## Goal and timebox

Build a CLI Agent that accepts a natural-language message containing one Threads URL and requested fields, acquires publicly accessible evidence using an isolated browser, and outputs JSON. Aim for roughly four hours to one day; favor a small complete workflow over a generic scraping platform.

This document records the initial design and decisions. See [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md) for progress and [WORK_LOG.md](WORK_LOG.md) for actions and verification.

## Acceptance requirements

1. Support requested combinations of profile display name, follower count, main post text and author continuations. Do not confuse display name with username.
2. Support share URLs and canonical post URLs, one URL per task. Document compatibility with legacy threads.net URLs.
3. Preserve original text and continuation order without summarizing, translating or rewriting. Exclude other users' comments, author replies to readers and recommendations.
4. Identify continuations using author identity, reply relationships and conversational context, not author identity or display order alone. Mark ambiguity explicitly.
5. Include source URL, extraction timestamp and total task token usage or cost.
6. Explain inaccessible, incomplete or uncertain data. Never invent missing values or claim completeness without evidence.
7. Retain model/tool calls, their results and final execution state in JSON. Redact API keys, cookies and login credentials; do not collect private model reasoning.
8. Use a separate browser context without private accounts, imported cookies or existing login state. Do not bypass platform access restrictions.
9. Deliver source on GitHub, dependency/browser/model setup, CLI examples, result and execution-log JSON examples, and a short README covering design, verification, limitations and AI assistance.

## Architecture and stack

Initial proposal: TypeScript + Node.js, Playwright Chromium, a tool-calling LLM SDK, and Node's built-in test runner. The completed feasibility probe uses plain ESM JavaScript to avoid unnecessary setup. TypeScript and the model SDK/provider remain decisions for the Agent milestone, not installed capabilities.

```text
CLI message
  -> parse/validate one URL and requested fields
  -> bounded LLM tool-calling loop
  -> public post/profile evidence and optional additional loading
  -> structural filtering and contextual continuation classification
  -> program assembles original text from evidence IDs
  -> schema validation, aggregate usage, result.json + trace.json
```

### Program responsibilities

- Validate external inputs and tool arguments at boundaries; restrict browser targets and reject credential-bearing URLs.
- Launch a fresh non-persistent browser context per task.
- Preserve source text and evidence identity, author, permalink, observed order and reply relationships when available.
- Enforce task timeouts, tool-step limits and bounded loading.
- Assemble output deterministically from evidence, rather than asking the model to reproduce original text.
- Record calls/results/errors, redact secrets before persistence, and aggregate usage across all model calls.
- Treat webpage content as untrusted data, never as Agent instructions.

### Model responsibilities

- Interpret requested field combinations.
- Choose necessary tools based on returned evidence (for example, open the profile only when needed).
- Classify ambiguous continuation candidates using available structure and context.
- Stop when evidence is sufficient, or explain limits and return partial/uncertain results.

Use an existing SDK loop where useful; do not build a framework or multi-Agent system. Proposed tools: read post, read author profile, and load additional conversation content only if browser feasibility supports it.

## Output semantics

Finalize the schema before implementing the Agent. Planned shape:

- Task result status: complete, partial, unavailable or uncertain as appropriate; separate from execution termination state.
- Source: original URL plus resolved URL.
- Extraction timestamp in UTC.
- Data: only requested fields. Each field carries a status, value and reason when not fully verified.
- Continuations: ordered source IDs/permalinks and original text. An empty confirmed list is not the same as unavailable data.
- Followers: preserve displayed precision, such as `15.1K`; never present a rounded display as an exact integer.
- Usage: aggregate input/output/total tokens, or cost. Missing provider usage is unknown, not zero.
- Trace reference or embedded trace.

Execution events should include run/event/call IDs, timestamp, type, model/tool name, arguments/request, result/response, status/error and usage where applicable. End every run with a terminal event, including blocked, timeout and failed runs. Save public model outputs/tool calls, not private reasoning. Keep diagnostics on stderr when stdout is JSON.

## Milestones

### M1 — Anonymous-browser feasibility

Test the supplied post and public profile before building the Agent. Observe redirects, public text, profile fields, continuation evidence, recommendations and access limits. Save local page evidence and screenshots. HTTP 200 alone never establishes extraction completeness.

### M2 — Contracts and deterministic validation

Define request/result/evidence/trace shapes and input behavior. Write tests for field selection, missing data, rounded follower displays, empty vs unknown continuations, and incomplete results.

### M3 — Structural browser acquisition

Extract post candidates separately from page chrome and recommendations; retain original text and reply evidence. Support share/canonical URLs, public profile reads and bounded additional loading where feasible. Stop honestly at access limits.

### M4 — Minimal end-to-end Agent

Connect CLI, chosen model SDK and constrained tools. Make model decisions evidence-driven and assemble output from source IDs. Configure API key/model via environment variables. Test with fake model/tool responses, then perform a live smoke test.

### M5 — Continuation correctness and operational tracing

Test main post plus multiple continuations, reader comments and author replies, mixed conversations, recommendation exclusion, ambiguous relationships and interrupted loading. Verify aggregate usage, secret redaction, call/result linkage, terminal states and timeout/error handling.

### M6 — Delivery

Document setup/design/verification/limitations/AI use; provide CLI and JSON examples clearly labeled as live or fixture-based. Verify a clean install. Publish to the agreed GitHub repository when configured.

## Verification strategy

Use small TDD units where meaningful: observe the expected failure, make the smallest implementation pass, then refactor with behavior pinned. Use real Chromium against local fixtures for reproducible browser tests and separate live smoke tests for external integration. Never treat a blocked live run as proof of the successful extraction path.

Keep an action/reason/verification log. Use crapper, dryer and mutator when available; explicitly report unrun checks rather than claiming equivalent coverage. Keep commits small; do not push without a configured/confirmed destination.

## Defaults and non-goals

- Profile name means display name.
- Post content means text; OCR and audio/video transcription are out of scope.
- One-shot CLI is sufficient; no chat interface needed.
- Missing fields or multiple URLs should produce an explicit input error or clarification, not silent guessing.
- No private login, anti-bot evasion, batch URLs, database, Web UI, multi-Agent architecture or generic website framework.

## Principal risks

Anonymous accessibility can change; login overlays can coexist with readable but incomplete DOM content. Reply relationships may be unavailable. DOM/display order can differ from conversation order. Follower counts may be rounded. Share URL support needs its own live verification. The existing probe is evidence collection only, not a finished extractor.
