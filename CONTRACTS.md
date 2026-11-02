# Data contracts

Runtime source of truth: [`src/contracts.mjs`](src/contracts.mjs), using Zod. These define contracts and pure result assembly. `src/acquisition.mjs` now produces validated browser evidence; `src/agent.mjs` now orchestrates model field selection, acquisition and contextual continuation selection; `src/model.mjs` projects public OpenAI SDK responses. Live model behavior remains unverified.

## Request

`parseRequest(message, fields)` validates a natural-language message and a separately selected list of fields. Field selection comes from the model in the Agent workflow; this function does not interpret Chinese field names itself.

- Exactly one HTTP(S) URL token; multiple URLs are rejected, even if identical.
- Public HTTPS Threads host only (`threads.com`, `www.threads.com`, and legacy `.net` equivalents), without credentials or custom port.
- `/@username/post/id` and `/share/id` routes accepted. Profile/login routes rejected as task inputs.
- Common sentence-ending punctuation is removed from the URL token; URL query parameters otherwise remain intact.
- Nonempty, unique selection from `profile_name`, `follower_count`, `post_content`, `author_continuations`.
- Schema acceptance of a share/legacy URL is not evidence that its redirect/acquisition path works live.

`ThreadsUrlSchema` validates a general public Threads URL for browser evidence; `PostUrlSchema` restricts task/post routes and `ProfileUrlSchema` restricts public profile routes. Browser navigation will still need redirect and network-target controls; these schemas alone are not an SSRF defense for a complete browser session.

## Evidence

`EvidenceSchema` records source URL, capture timestamp, nullable HTTP status, completeness, limitations, posts and nullable profile evidence.

Each post has:

- `id`, `url`, `author`, original `text`, and unique observed `position`.
- `parent_id`: null means **unknown**, not a proven conversation root.
- `author_marker`: whether the page displayed an author marker, not proof of continuation.
- `is_recommendation`: a structural observation, not inferred merely from a different author.

Post IDs and positions must be unique within an observation. An incomplete conversation observation must explain at least one limitation. Evidence may retain excluded candidates for auditability; output assembly must select only verified relevant posts. This schema does not infer reply relationships, sort continuations, or establish completeness by itself.

Profile evidence has its own URL, nullable display name and nullable follower display/count.

## Field and result states

| Field status | Value | Reason |
|---|---|---|
| `ok` | Valid typed value | Not required |
| `partial` | Valid typed value representing the acquired subset | Required |
| `uncertain` | Valid typed value or null | Required |
| `unavailable` | null | Required |

Continuation values are ordered arrays of `{ id, url, text }` with unique IDs. An `ok` empty array asserts confirmed absence; an unavailable/uncertain null does not. The acquisition/classification layer must justify that assertion. Original post/continuation text is not trimmed, translated or rewritten by these schemas.

Follower values are either:

```json
{ "display": "15.1K", "precision": "rounded", "count": null }
```

or a matching full numeric display and integer:

```json
{ "display": "15,123", "precision": "exact", "count": 15123 }
```

Unknown precision should be reported as uncertain/unavailable rather than invented. Exact counts require a plain numeric display (optional comma grouping); abbreviations cannot masquerade as exact integers. Acquisition uses a full numeric public `title` attribute when unambiguous and available; `display` then records that full source string rather than the abbreviated label. Without it, abbreviated displays remain rounded.

`buildResult` validates the request, projects only requested values, and marks missing values unavailable with a reason. It does not manufacture evidence. The result includes `requested_fields`, source input/resolved URLs (resolved may be null), `extracted_at`, data and usage. `ResultSchema` checks field selection and task status consistency:

- all fields `ok` → `complete`;
- all unavailable → `unavailable`;
- only uncertain/unavailable, with at least one uncertain → `uncertain`;
- other mixtures or partial fields → `partial`.

A page being inspected successfully is not an `ok` field. Consumers must only pass verified values to result assembly.

## Usage

`UsageSchema` supports either nonnegative integer input/output/total tokens, with total equal to input plus output, or `status: unknown` with a reason. The Agent aggregates all model calls. Do not substitute zero when provider usage is absent. Cost accounting is not implemented; token reporting satisfies the planned initial interface.

## Trace

`TraceSchema` contains a run ID and ordered events:

- `model_call`: event ID, timestamp, call ID, configured model name, public request/response JSON, success/failure, nullable error, usage.
- `tool_call`: the same call shape without model usage.
- `run_end`: event ID, timestamp, termination status, nullable result status and reason.

Termination statuses: `completed`, `blocked`, `timeout`, `failed`, `step_limit`. Unsuccessful termination needs a reason. Failed calls need an error; successful calls must have null error. Event IDs must be unique and exactly one terminal event must occur last.

`completed` describes execution, not complete acquisition; its result status may be `partial`. A model-to-tool invocation can be correlated through call IDs in its recorded public response and the tool event. For this initial contract, request/response are completed call records, not streaming deltas.

The schema checks structure, not secrets. The Agent redacts configured secrets, credential-shaped fields (including serialized JSON) and common bearer/key patterns before trace persistence; malformed credential-bearing text is conservatively omitted. The SDK adapter projects only public content and usage. This is not a universal secret detector. Trace persistence covers caught failures, not process crashes or filesystem failures. Never serialize raw SDK objects or private reasoning. A strict event object rejects additional top-level fields, but this does not sanitize arbitrary nested JSON.

## Validation

Run `npm test`. Contract tests cover URL/field validation, all 15 requested-field combinations, missing and uncertain evidence, original newlines, rounded counts, token consistency, evidence identity, trace terminal states and error consistency. Browser integration remains a separate fixture/live-test responsibility.
