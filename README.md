# Threads acquisition Agent

A bounded CLI Agent selects requested fields with OpenAI, acquires public Threads evidence in anonymous Chromium, and optionally classifies author continuations by context. It preserves source text by evidence ID and writes result JSON plus a sanitized execution trace. The workflow is fixture-tested; live model accuracy and end-to-end acceptance remain unverified.
Requires Node.js 22+ and npm.

## Run the Agent

```sh
npm ci
npx playwright install chromium
# macOS: in Keychain Access, add a generic password:
# name/service: threads-acquisition-agent; account: openai; password: your API key.
# Other platforms/CI: inject OPENAI_API_KEY through a trusted credential manager.
export OPENAI_MODEL='gpt-4.1-mini' # Optional; this is the default.
npm run --silent agent -- '請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：https://www.threads.com/share/GW3EPb5M8/' artifacts/my-run
```

Quote the entire message as one argument; the optional second argument is the output directory. stdout contains result JSON; `result.json` and `trace.json` are written there. Failures save an error object and terminal trace and exit nonzero; wholly unavailable data also exits nonzero. Partial/uncertain results exit zero and must be interpreted by their field statuses. Missing credentials fail before browsing.

The official OpenAI SDK makes at most two calls: requested-field selection and, only when requested and a target exists, contextual continuation selection. Calls have a 30-second SDK timeout, no automatic retries and a 2,000-output-token cap. Browser acquisition is bounded independently. Only the author's requested profile fields trigger profile acquisition. Model selections must reference eligible same-author evidence IDs; output text comes directly from evidence in observed order, never model-written text. Contextual classification can still be wrong: no live model evaluation has been performed. Post text is conservatively partial (no expansion proof); continuations are partial or uncertain, never claimed exhaustive.

Traces contain public model/tool calls, per-call usage and terminal status, not private reasoning. Total usage is summed; missing usage stays unknown. Review artifacts before sharing. Traces persist on completion or caught failure, not after hard crashes or filesystem errors.

## Security

- Keys come from macOS Keychain, or a credential-manager-injected `OPENAI_API_KEY` fallback that is removed from Node's environment after loading. Never type real keys into shell commands or commit them.
- Model requests use a fixed OpenAI HTTPS endpoint, reject redirects and disable SDK debug logging. Chromium receives only selected OS settings, not model credentials.
- Browser traffic uses a public-IPv4/HTTPS-port-only proxy with checked, pinned destination IPs. Private/loopback/metadata addresses, HTTP and IPv6 are blocked, including redirects/subresources; IPv6-only sites are unsupported.
- Traces redact configured keys and credential fields, including serialized JSON. Redaction is not a universal secret detector: review artifacts before sharing and use a dedicated, least-privilege provider key.

This remains a trusted local CLI, not an OS-level network sandbox or public service. Real Keychain access and live model authentication still need operator verification. See [security checks](security-checks/README.md).

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

## Structured acquisition (M3)

```sh
npm run --silent acquire -- 'https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz' artifacts/m3-canonical
npm run --silent acquire -- 'https://www.threads.com/share/GW3EPb5M8/' artifacts/m3-share
```

Each run uses a fresh non-persistent Chromium context (`en-US`, service workers blocked), acquires the post conversation, and opens the identified author's public profile. It writes `evidence.json` to the output directory and emits the same JSON to stdout. The result contains the original input URL and separate post/profile observations validated by `EvidenceSchema`. No identified target produces a nonzero exit code; the evidence still explains the failure. Missing profile values do not erase post evidence.

Acquisition isolates visible pressable containers using their timestamp permalink and unambiguous language-tagged text block, excluding page chrome/link previews. A recognized recommendation-section boundary excludes everything after it, including same-author recommendations. Without a recognized boundary, only the target post is retained. Ambiguous/hidden target evidence is withheld; identical duplicate IDs are deduplicated and conflicting versions are not arbitrarily selected.

Reader comments and author replies to readers remain as **separate evidence context**, not claimed author continuations. `parent_id: null` means unknown. The six-second observation window does not establish exhaustive loading or untruncated text; `conversation_complete` remains false. No expansion, extra scrolling or login bypass occurs.

Profile names come from an unambiguous profile heading, not the username or timeline. Full numeric public follower `title` attributes take precedence over rounded visible displays. In the M3 live checks the profile exposed `15,107` as a title, allowing an exact count; the earlier probe had inspected only the `15.1K` display. Missing/unsupported/ambiguous fields stay null with reasons.

Both requested live paths returned HTTP 200 during M3. The canonical page yielded two conversation nodes; the share URL resolved to `/@whoscall_tw/post/Dd0_RGwH4K7` and yielded four, including a reader question and the author's answer. Neither observation establishes complete continuations. Local evidence is in `artifacts/m3-canonical/evidence.json` and `artifacts/m3-share/evidence.json` (ignored by Git).

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

`src/contracts.mjs` provides Zod runtime schemas and `buildResult` for field selection, explicit unavailable/uncertain/partial states, rounded follower displays, consistent token usage and trace structure. The acquisition module and Agent use these contracts; schemas alone do not prove contextual classification accuracy. See [CONTRACTS.md](CONTRACTS.md) for semantics and remaining responsibilities.

## Validation and limitations

`npm test` also validates all 15 nonempty requested-field combinations, missing/uncertain data, follower precision, token totals, evidence identity and trace terminal/error states. The initial browser test uses real Chromium against a local fixture server. Additional synthetic browser fixtures test post boundaries, original rendered text, recommendation exclusion, client-side redirects (including HTTP errors), missing/ambiguous/hidden/conflicting evidence, rounded/exact profile counts, invalid inputs and timeouts. Fixture provenance is documented in `test/fixtures/README.md`. Live network observations are separate from deterministic tests.

The probe/acquisition commands remain evidence tools, separate from the Agent result interface. The Agent now implements model orchestration, contextual continuation selection, aggregate usage and redacted tracing with deterministic fake-provider tests. Live model accuracy, incremental loading, clean-install verification and GitHub delivery remain pending. All CLI browser launches use the shared public-HTTPS egress guard described under Security; it is not an OS-level sandbox or an untrusted remote browsing service. The probe captures public rendered text and links, not browser cookies, headers or storage. Review artifacts before sharing, since public links can still contain tracking parameters.

AI assistance was used to write the probe, contracts, structured acquisition, tests and documentation, and to run and interpret the live browser observations.
