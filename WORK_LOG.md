# Work log

## Playwright feasibility milestone

1. Inspected the project and runtimes: only Pi configuration existed, with no Git repository. Added a minimal Node ESM package rather than an Agent framework.
2. Installed Playwright and Chromium to use a standalone browser, independent of private login state.
3. Added a local HTTP fixture test before implementing the probe. Confirmed it failed because the probe module did not exist.
4. Implemented bounded navigation and evidence capture. Corrected the HTML fixture to use `<br>` because plain HTML source newlines render as spaces; retained the rendered-newline assertion.
5. Ran `npm test`: 1 test passed, including success and HTTP 403 observations.
6. Ran the supplied post URL in a fresh Chromium context. HTTP 200; captured text, links and screenshot in `artifacts/whoscall-initial/`. Inspected the screenshot: sign-in overlay present; loaded DOM text remained readable.
7. Ran the author's linked public profile in another fresh context to check name and follower visibility. HTTP 200; `Whoscall` and rounded `15.1K followers` visible. Saved evidence in `artifacts/whoscall-profile/`.
8. Documented commands, observations, incomplete-extraction semantics, and remaining work in README. Ignored dependencies, artifacts, environment file and Pi's downloaded package checkout.

Not run: crapper, dryer and mutator (not installed). At this milestone, no commit or push was possible: the directory was not a Git repository and had no configured project remote. No LLM calls, login, access-limit bypass or complete continuation extraction were performed.

## Planning checkpoint

1. Re-read README and the existing work log so the saved plan would reflect actual implementation rather than proposed capabilities.
2. Inspected Git status/remotes: a local repository now exists, files were untracked, and no remote is configured. Preserved the earlier repository observation as historical context.
3. Added `PLAN.md` to preserve the initial requirements, architecture, output semantics, milestone order, testing strategy, scope and risks. Distinguished the proposed TypeScript/model stack from the implemented ESM browser probe.
4. Added `IMPLEMENTATION_TRACKER.md` with completed items, live evidence, test results, remaining work and next actions. Marked structural extraction, Agent orchestration and completeness verification as pending.
5. Linked the planning documents from README and checked their relative Markdown links. Documentation-only update; no browser rerun or code tests needed. No commit or push performed; the remote remains unconfigured.

## M2 — Data contracts and result assembly

1. Inspected existing probe/tests, repository status and model-key environment variable names to choose the next bounded unit. No common provider key names were present; no secret values were printed. Existing baseline files remained untracked.
2. Revisited the supplied post in fresh Chromium and saved local structural evidence to `artifacts/whoscall-initial/structure.json`. No article elements or JSON-LD were present. Root post ancestry exposed a pressable container, timestamp permalink and language-tagged text. This is preliminary evidence for M3, not a structural extractor.
3. Installed Zod to keep runtime input/evidence/result/trace validation declarative and reusable for later model integration; did not introduce a framework or TypeScript build.
4. Wrote contract tests before implementation and observed the expected missing-module failure.
5. Implemented `src/contracts.mjs`: allowed URL routes/hosts, unique field selection, evidence identity and limitations, typed field states, rounded/exact followers, token consistency, pure field projection and status derivation, and completed-call/terminal trace schemas.
6. Expanded tests to all 15 field combinations and trace edge cases. Observed a meaningful failure: individual failed call events accepted a null error. Moved consistency validation to the event boundary, removed redundant aggregate validation and verified the test passed.
7. Added `CONTRACTS.md` and updated README/tracker. Documented that schemas do not prove evidence completeness, implement redaction or enforce browser redirect safety.
8. Final verification: `npm test` passed 15 tests (14 contract tests plus one real-Chromium fixture test); `npm audit --omit=dev` reported zero vulnerabilities; documentation link check passed; `git diff --check` reported no tracked whitespace issues (current project baseline remains untracked).

Remaining: structural browser extraction, share-resolution live checks, natural-language model parsing, bounded Agent loop, evidence-based continuation classification, token aggregation and secret-redacted trace persistence. crapper/dryer/mutator were not installed or run. At the end of M2, no commit or push had been performed; baseline files remained untracked and no remote was configured.

## Initial Git commit checkpoint

1. Inspected status, history, tracked files and remotes: `main` had no commits and no remote. Grouped the existing probe and M2 implementation into a coherent initial project snapshot.
2. Reviewed ignored paths and project-local Pi configuration. Included the Ponytail package declaration and ub-mode skill; excluded downloaded Pi packages, dependencies and captured browser artifacts.
3. Re-ran `npm test`: all 15 tests passed. Re-ran `npm audit --omit=dev`: zero vulnerabilities. Scanned intended commit files for common private-key and API-token patterns: no matches; this scan is not a comprehensive secret audit.
4. Updated tracker repository state and prepared an explicit file list for the initial commit. Checked the staged diff for whitespace issues before committing. No push requested or performed; no remote is configured.

## Invariant assignment and comparison checkpoint

1. Found the user-provided, untracked `init_assignment.md` and read it completely. Preserved its bytes verbatim rather than adding annotations to the assignment.
2. Saved its SHA-256 in `init_assignment.sha256` so future changes can be detected. This is a review invariant, not filesystem write protection.
3. Compared the actual probe/contracts, tracker and README against the original core workflow, seven feature requirements, two implementation requirements and four deliverables. Saved evidence, gaps and next priorities in `ASSIGNMENT_STATUS.md`.
4. Linked the invariant and comparison from README, PLAN and tracker. Explicitly distinguished contract tests from implemented acquisition/Agent behavior and optional process tools from assignment requirements.
5. Re-ran `npm test`: all 15 tests passed. No live platform retest was performed. Verified the assignment digest and local documentation links; no application code changed at this checkpoint.

## M3 — Structured anonymous acquisition

1. Committed the invariant assignment and comparison separately as `617c099` after verifying its digest and staged whitespace.
2. Inspected canonical post, public profile and original assignment share URL in Chromium. Saved local DOM observations under `artifacts/m3-discovery/`. Found pressable post containers, timestamp permalinks, language-tagged text, recommendation labels and profile headings. Share content contains both an author continuation candidate and a reader/author exchange. No reliable parent IDs were observed.
3. Found the follower link's public numeric title (`15,107`) in addition to its rounded `15.1K` label. Implemented exact-count use from the full source attribute, not approximation from the rounded value.
4. Added synthetic, minimal conversation/profile HTML fixtures with provenance notes and acquisition tests before implementation; observed the expected missing-module failure.
5. Added `ProfileUrlSchema`, browser-realm DOM readers, and `acquirePost`/`acquireProfile`. Kept reader exchanges as separate context, excluded recognized recommendations, and retained only the target when a recommendation boundary is unknown. Always report conversation incompleteness and unknown parent relationships.
6. The first mocked HTTP-302 fixture did not stay within Playwright's request interception on the redirected request. Replaced it with an explicitly labeled client-side redirect fixture; actual share navigation is tested live, not claimed from that fixture.
7. A new client-side redirect-to-403 regression test failed because the initial document's HTTP 200 was retained. Fixed navigation-response tracking to report the final main-frame status, revalidate the final route and avoid parsing HTTP error content. Removed the per-call response listener on completion.
8. Added missing/ambiguous/hidden target, conflicting/duplicate identity, unsafe input/final route, timeout, and missing/rounded profile tests. A conflicting-target test failed against first-wins deduplication; changed it to withhold conflicting versions and all conversation candidates when the target is ambiguous. A hidden-text-block regression also failed because innerText can return hidden text content; required text-block visibility before acquisition.
9. Added `npm run --silent acquire -- URL [OUTPUT_DIRECTORY]`, launching a fresh non-persistent context and writing structured post/profile evidence to stdout and `evidence.json`. This is not a natural-language Agent, continuation classifier or execution trace.
10. Ran canonical and original-share acquisition live: both HTTP 200 with schema-valid evidence. Canonical yielded two conversation nodes; share resolved to `/@whoscall_tw/post/Dd0_RGwH4K7` and yielded four. Profile read `Whoscall` and exact public title count 15107. Saved ignored evidence in `artifacts/m3-canonical/` and `artifacts/m3-share/`.
11. Updated README, contracts, tracker and assignment comparison to distinguish implemented structural acquisition from missing Agent/classification/tracing. Documented selector/locale limitations, no expansion or exhaustive-loading proof, and the lack of a browser network sandbox.
12. Final verification: `npm test` passed 27 tests; npm audit reported zero vulnerabilities; original assignment checksum, documentation links and whitespace checks passed. A common embedded key/token-pattern scan found no matches in non-ignored project files (not a comprehensive secret audit). Prepared the M3 implementation as a separate commit. crapper/dryer/mutator remain uninstalled/unrun. No push: no remote is configured.

## M4/M5 — Bounded CLI Agent

1. Re-read ub-mode, inspected contracts/acquisition/callers and Git status, and checked provider-variable names without printing values. Kept the working recommendation filter unchanged; no API key or remote is configured.
2. Wrote Agent workflow tests first and ran them: expected missing `src/agent.mjs` failure. Tests pin exact source text, output projection, contextual selection plumbing, incomplete states, usage and failed-call traces rather than inventing a generic Agent framework.
3. Installed the official OpenAI SDK. Added a two-call-at-most workflow: model field selection, constrained browser acquisition, optional profile acquisition, contextual continuation ID selection, deterministic source-backed assembly. Selected IDs must be eligible same-author posts after the root; uncertain/empty selections never assert exhaustive absence.
4. Added SDK response projection, 30-second timeout, no retries and output-token cap. Added recursive configured-secret/credential-field/common-pattern redaction and schema-validated calls plus terminal traces. Logs persist on normal/caught-error completion, not hard crashes or filesystem failure.
5. Added CLI result/trace files and stdout JSON with fresh lazy-launched Chromium. Ran it without a key: nonzero exit and persisted failed model call plus terminal state in ignored `artifacts/m4-no-key/`. No credentials or live model calls were used.
6. Added SDK fake-client tests and a full fake-provider workflow through real Chromium conversation/profile fixtures. Its first run exposed an incorrect test expectation (15123 instead of the fixture's public title 15,107); read the fixture and corrected the assertion. This does not validate actual model classification accuracy.
7. Updated README, contracts, tracker and assignment status to explain the implemented workflow and remaining live-evaluation/delivery gaps. Preserved the invariant assignment. No cleanup/deletion was needed; retained existing artifacts and recommendation behavior.
8. Final checks: all 36 tests passed; dependency audit reported zero vulnerabilities; assignment checksum and whitespace check passed. crapper/dryer/mutator remain unavailable; no live model check or clean-install check. Commit this bounded milestone separately; push blocked by the absent remote.

## Credential-security documentation checkpoint

1. Checked the clean working tree and current SDK/browser/redaction call sites to confirm the previously reviewed risks remain open. No secrets were read or displayed.
2. Added a dedicated Security section to README and linked `security-checks/README.md`. Replaced the literal shell key-assignment example with a credential-manager prerequisite to avoid encouraging shell-history exposure; explicitly stated that Keychain support is not implemented.
3. Added the security-check folder with the local threat model, four open findings, dummy-secret review evidence, proposed minimal fixes and unchecked acceptance criteria. Separated historical observations from checks actually run at this checkpoint; no executable checker or credential framework was added.
4. Checked local Markdown links, whitespace and the invariant assignment checksum. This is documentation-only: no application tests, browser/model calls, credential-store access or process-environment reproduction was needed. No cleanup was needed. crapper/dryer/mutator are unavailable and irrelevant to this prose change.
5. Commit this documentation checkpoint separately. Push remains blocked because no remote is configured; the credential-security fixes themselves remain pending.

## Credential and browser-egress hardening

1. Inspected every model/redactor/browser caller and the clean working tree. Scoped the change to the four recorded credential findings plus browser private-network access; kept provider selection and extraction behavior unchanged.
2. Added security regression tests first and observed the expected missing-credentials-module failure. Added endpoint/header/body, Keychain/fallback/error, browser environment, serialized/malformed credential and network-address checks; used only dummy secrets.
3. Pinned OpenAI HTTPS, disabled SDK debug logging, rejected redirects and reused one SDK client per run. Added direct macOS Keychain retrieval via fixed executable/arguments, sanitized errors and an environment fallback removed after loading. The retrieved key joins the existing redactor secret list before SDK use; no real credential-store access was performed.
4. Extended shared trace redaction to serialized JSON and conservative omission of malformed/embedded credential text without changing source-backed output. Existing public-response projection remains intact.
5. Added a shared CLI launcher with an OS-environment allowlist and a local public-IPv4/port-443 CONNECT proxy. Validated all DNS answers, connected to the checked IP to prevent rebinding, denied private/reserved/metadata/IPv6 destinations and disabled direct DNS/QUIC/non-proxied WebRTC UDP. Updated all three CLI callers; this is application-level restriction, not OS containment.
6. Verified denied proxy destinations and positive pinned-IP tunneling using local fixtures. Real Chromium tests cover loopback navigation, redirects/subresources and dummy-key process isolation. The existing full Agent browser fixture now uses the hardened launcher too.
7. Live canonical acquisition first failed because the resolver rule also blocked the loopback proxy; excluded the proxy address from Chromium DNS denial, then reran successfully: post/profile HTTP 200 and two conversation nodes. Saved ignored evidence in `artifacts/security-live/`. No live model call was made.
8. Shortened README security guidance and the security-check ledger, replacing pending-fix claims with tested controls and explicit operator checks. Updated tracker/contracts/assignment status; retained historical log entries and the invariant assignment.
9. Full test suite passed 44 tests. Final dependency audit, documentation links, assignment checksum and whitespace checks are recorded with the commit. No safe cleanup was needed. Actual Keychain authorization and live provider authentication remain unverified; crapper/dryer/mutator remain unavailable. Push is blocked by the absent remote.

## Local .env credentials instead of Keychain

1. Inspected callers, docs/tests and the uncommitted Keychain service-name edit. The user's explicit request to remove Keychain supersedes that local edit; no other uncommitted files were changed.
2. Replaced Keychain tests with temporary-file behavior tests before implementation. The first red run reached the legacy Keychain timeout; reran with its non-macOS branch forced to verify the expected unsupported-local-file failures without further Keychain access. No credential value was displayed.
3. Removed platform-specific credential retrieval. Used Node's built-in `parseEnv` to read only `OPENAI_API_KEY` from local `.env` into memory; kept environment precedence/consumption for CI and sanitized missing/empty/unreadable-file errors. No dependency or application/browser security behavior was added or removed otherwise.
4. Added an empty `.env.example`, ignored `.env` variants while keeping the example trackable, and documented owner-only file permissions plus dedicated, restricted project keys that can be revoked anytime. Updated current setup/status docs; historical Keychain entries remain historical. Did not create, read or modify the user's actual `.env`.
5. Verified 46 passing tests, zero dependency-audit vulnerabilities, unchanged assignment checksum, whitespace and ignore rules. No live model authentication was attempted; plaintext local storage is an explicitly accepted trade-off. No cleanup needed; crapper/dryer/mutator remain unavailable. Commit this change separately; no push without a configured remote.
