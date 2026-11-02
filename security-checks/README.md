# Security checks

This folder records the credential-security review and its acceptance checklist. It is documentation, **not an automated security test suite**. All four findings below remain open; no credential-handling code was changed by this documentation checkpoint.

Scope: the local, single-user CLI introduced in commit `6438d95`. Later Git-ignore changes do not fix these issues. The main [README Security section](../README.md#security) summarizes operating precautions.

## Threat model and current boundaries

- A trusted operator runs Node and anonymous Chromium on their own machine. This is not a hosted or multi-user browsing service.
- User messages and Threads content are untrusted data. The model does not need the API key in its prompt or response; the SDK uses it for HTTP authentication.
- Private login sessions are not imported. Browser contexts are non-persistent, but that does not isolate operating-system environment variables.
- Input and final-document route checks do not constrain every redirect or subresource destination. A remote browsing service would need stronger network isolation.
- Traces contain public model content and tool evidence, not raw SDK objects or private reasoning. They can still contain sensitive user input or public reader conversation. Review before sharing.
- A compromised authorized Node process can access its credentials even if they came from Keychain. Credential storage is not protection against malicious runtime dependencies.

## Open findings

### SEC-01 — API endpoint is inherited from the environment

**Priority:** must fix. **Status:** open.

Location: [`src/model.mjs`](../src/model.mjs), `createModel`.

The SDK is constructed without an explicit `baseURL`. It honors `OPENAI_BASE_URL`, allowing a stale or manipulated environment setting to direct the authorization header and model input to another server, including an HTTP endpoint. A Threads post cannot change this setting; the issue requires control or misconfiguration of the process environment.

**Observed evidence:** a dummy key and mocked network transport showed a request to `http://credential-check.invalid/v1/chat/completions` with the dummy authorization header. No real credential or network request was used.

**Smallest proposed fix:** explicitly set `baseURL: 'https://api.openai.com/v1'` in the SDK constructor. This project does not currently require custom providers or endpoints.

**Acceptance:**

- [ ] Set a conflicting `OPENAI_BASE_URL` with a dummy key; capture the SDK request through a mocked transport.
- [ ] Assert the destination remains `https://api.openai.com/v1/chat/completions`.
- [ ] Assert the dummy key appears only in the expected authentication header, not the request body or persisted logs.

### SEC-02 — Browser processes inherit the model key

**Priority:** must fix. **Status:** open.

Location: [`scripts/agent-threads.mjs`](../scripts/agent-threads.mjs), `browserPage`.

`chromium.launch()` inherits the process environment. Chromium does not need model credentials. Ordinary page JavaScript cannot directly read the process environment, but credential-bearing browser processes increase exposure through local inspection or browser compromise.

**Observed evidence:** launching Chromium with a dummy `OPENAI_API_KEY` produced four browser-related process environments containing that value. Inspection output was reduced to a count; actual environment contents were not published.

**Smallest proposed fix:** provide an explicit browser environment with only required operating-system settings and no model credentials. Check other launch commands before claiming project-wide isolation; the separate probe/acquisition CLIs also launch browsers.

**Acceptance:**

- [ ] Run with dummy model credentials and inspect the actual browser process environments without printing their contents.
- [ ] Assert the dummy values and credential variable names are absent from browser processes.
- [ ] Verify browser startup and existing Chromium fixture tests still work on supported platforms.

### SEC-03 — Documented shell exports can persist credentials

**Priority:** should fix. **Status:** open; the README no longer demonstrates a literal key assignment, but secure credential retrieval is not implemented.

Location: [Agent setup instructions](../README.md#run-the-agent) and [`scripts/agent-threads.mjs`](../scripts/agent-threads.mjs).

Typing a real key into `export OPENAI_API_KEY='…'` can save it in shell history. A shell-wide export also sends it to later child processes. Moving the value into a plaintext `.env` file does not solve credential storage.

**Proposed local macOS path:** store a dedicated project key in macOS Keychain using Keychain Access, then retrieve it directly into Node using `execFile` with the fixed `/usr/bin/security` executable and fixed service/account arguments. Do not invoke a shell or pass the secret as an argument. This is a proposed design, not an existing CLI feature; agree on non-macOS requirements before implementing platform-specific behavior.

**Acceptance:**

- [ ] Document how to provision the Keychain item without putting its secret in command history.
- [ ] Retrieve a dummy credential without exporting it or including it in command-line arguments.
- [ ] Confirm the key reaches SDK authentication but not Chromium, prompts, stdout, stderr or trace files.
- [ ] Exercise missing, denied and cancelled Keychain access; produce a useful error without printing credentials or raw command output.
- [ ] Document supported platforms and verify the chosen behavior on an actual credential store.

### SEC-04 — Serialized JSON bypasses credential-field redaction

**Priority:** should fix. **Status:** open.

Location: [`src/agent.mjs`](../src/agent.mjs), `redact`, `ask` and model call recording.

The redactor recognizes sensitive object keys, but model inputs and outputs contain serialized JSON strings. For example, `redact('{"password":"review-dummy-password"}')` currently retains the password. Replacement of the explicitly configured OpenAI key still works; this finding concerns other credential-shaped values.

**Observed evidence:** the example above returned the dummy password unchanged. No real secret was tested.

**Smallest proposed fix:** retain structured model input for trace sanitization before serializing, and parse valid JSON model responses before redacting their recorded form. Keep configured-secret replacement and define a safe logging fallback for malformed responses; never persist an unsafe raw fallback just because parsing failed.

**Acceptance:**

- [ ] Exercise nested credential fields in structured input and valid serialized model responses.
- [ ] Exercise malformed JSON, configured-key echoes and failed calls.
- [ ] Assert dummy secrets are absent from the complete persisted trace and CLI error output, while useful non-secret call/result details remain.
- [ ] Verify the SDK still receives the intended request and source-backed result text is not accidentally rewritten by trace sanitization.

## Verification discipline

- Use dummy secrets and mocked network transport for regression tests. Do not send test credentials to arbitrary endpoints.
- Never commit actual keys, raw environment dumps, private session data or unsanitized execution logs. Ignoring a file does not protect its contents.
- `npm test` covers existing redaction behavior and workflow fixtures; it does **not** establish that the open acceptance checks above pass.
- Mark an item resolved only after its code change and regression check pass. Record the commit and actual result here; do not convert proposed checks into claimed evidence.
- The original review used targeted dummy-secret reproductions. This documentation update did not repeat browser/process or SDK endpoint experiments, access Keychain, make live model calls or validate provider permissions.
