# Security checks

Scope: trusted, single-user local CLI. Use dummy credentials for checks; never commit raw environment dumps, private sessions or real keys. This is not an OS-level sandbox or a hosted browsing service.

## Implemented controls

| Review finding | Fix | Verification |
|---|---|---|
| SEC-01: endpoint override | Fixed `https://api.openai.com/v1`, redirects rejected, SDK logging off | Mocked transport verifies inherited endpoint/debug settings cannot change destination or expose authentication in the body. |
| SEC-02: browser key inheritance | All three CLIs use `launchBrowser` with an explicit OS-environment allowlist | Real Chromium process inspection with a dummy key; original fixture workflow still passes. |
| SEC-03: shell key storage | macOS Keychain retrieval through `/usr/bin/security` without a shell; optional environment fallback is consumed and deleted | Mocked success, missing/denied access and unsupported-platform checks. Actual Keychain access remains an operator check. |
| SEC-04: JSON redaction bypass | Recursive parsing/redaction of serialized JSON; conservative omission of malformed credential-bearing text | Nested JSON, malformed output, credential assignments and bearer/key regression checks. |
| Browser private-network access | Local CONNECT proxy allows only public IPv4 destinations on port 443, validates all DNS answers and connects to the validated IP | Tests deny private/mixed DNS, metadata, IPv6 and other ports; verify pinned-IP tunneling and real Chromium loopback navigation/redirect/subresource blocking. |

Code: [credentials](../src/credentials.mjs), [model](../src/model.mjs), [trace redaction](../src/agent.mjs), [browser launch](../src/browser.mjs), [egress proxy](../src/network.mjs).

```sh
node --test test/security.test.mjs
npm test
```

The original endpoint/inheritance/JSON findings were reproduced with dummy secrets before these fixes. During implementation, a live canonical acquisition initially exposed a proxy resolver configuration error; after fixing it, both the post and public profile returned HTTP 200 through the guarded launcher. No live model call or real key was needed.

## Credential setup

On macOS, use **Keychain Access** to create a generic password with name/service `threads-acquisition-agent`, account `openai`, and the API key as its password. Do not put the secret in a command. If `OPENAI_API_KEY` is absent, the CLI retrieves this item directly into Node memory. Missing/denied access gives a sanitized error; retrieval has a 15-second timeout.

For other platforms or CI, inject `OPENAI_API_KEY` through a trusted credential manager. The fallback takes precedence, is removed from Node's environment after loading, and is never passed to Chromium. Injection does not erase an ancestor shell's environment: avoid shell-wide exports and rotate exposed keys. The SDK client is reused for the run.

## Remaining operator checks and limits

- [ ] Provision/access a real Keychain item; verify denied/cancelled access on the actual machine. Unit tests mock the credential store and do not certify its OS access controls.
- [ ] Verify live OpenAI authentication, provider permissions and usage controls with a dedicated project key. No real model credentials were used for this checkpoint.
- [ ] Review actual result/trace artifacts before publishing. Arbitrary unlabelled or encoded secrets are not universally detectable; source text is not rewritten by trace sanitization.
- IPv6-only destinations and plain HTTP resources are intentionally unavailable. Chromium uses the proxy for normal network traffic, with direct DNS/QUIC/non-proxied WebRTC UDP disabled. This is application-level egress restriction, not containment of a compromised native process.
- Keys still exist in authorized Node memory. Keychain does not protect against malicious code/dependencies in that process. There is no private login import, public multi-user service, crash-recoverable trace or comprehensive secret scanner.
