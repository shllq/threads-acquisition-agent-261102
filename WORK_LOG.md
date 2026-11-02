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
