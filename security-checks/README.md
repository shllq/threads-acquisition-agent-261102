# Security checks

Scope: trusted, single-user local CLI. Use dummy credentials for checks; never commit raw environment dumps, private sessions or real keys. This is not an OS-level sandbox or a hosted browsing service.

## Implemented controls

| Review finding | Fix | Verification |
|---|---|---|
| SEC-01: endpoint override | Fixed `https://api.openai.com/v1`, redirects rejected, SDK logging off | Mocked transport verifies inherited endpoint/debug settings cannot change destination or expose authentication in the body. |
| SEC-02: browser key inheritance | All three CLIs use `launchBrowser` with an explicit OS-environment allowlist | Real Chromium process inspection with a dummy key; original fixture workflow still passes. |
| SEC-03: credential setup | Local Git-ignored `.env`, read directly into memory; injected environment override is consumed and deleted | Temporary-file tests cover quoted keys, missing/empty/unreadable files, environment precedence and no export of file settings. Plaintext storage is an accepted local trade-off. |
| SEC-04: JSON redaction bypass | Recursive parsing/redaction of serialized JSON; conservative omission of malformed credential-bearing text | Nested JSON, malformed output, credential assignments and bearer/key regression checks. |
| Browser private-network access | Local CONNECT proxy allows only public IPv4 destinations on port 443, validates all DNS answers and connects to the validated IP | Tests deny private/mixed DNS, metadata, IPv6 and other ports; verify pinned-IP tunneling and real Chromium loopback navigation/redirect/subresource blocking. |

Code: [credentials](../src/credentials.mjs), [model](../src/model.mjs), [trace redaction](../src/agent.mjs), [browser launch](../src/browser.mjs), [egress proxy](../src/network.mjs).

```sh
node --test test/security.test.mjs
npm test
```

The original endpoint/inheritance/JSON findings were reproduced with dummy secrets before these fixes. During implementation, a live canonical acquisition initially exposed a proxy resolver configuration error; after fixing it, both the post and public profile returned HTTP 200 through the guarded launcher. No live model call or real key was needed.

## Credential setup

Generate a **dedicated, restricted project API key**, grant only the needed permissions, and configure provider-side usage limits/alerts. The key is **revocable anytime**; revoke it after testing or immediately if exposed.

Copy `.env.example` to `.env`, set owner-only permissions (`chmod 600 .env` on macOS/Linux), then enter the key using a local editor. Do not put it in a shell command. The CLI reads only `OPENAI_API_KEY` from `.env` in its working directory without exporting file values. `.env` variants are Git-ignored; only the empty `.env.example` is tracked. This is plaintext storage, not encryption: keep the file out of shared folders, logs and published artifacts. Keychain is no longer used.

For CI, an injected `OPENAI_API_KEY` takes precedence over `.env` and is removed from Node's environment after loading. Neither source is passed to Chromium. Removing it does not erase an ancestor shell's environment; avoid shell-wide exports. The SDK client is reused for the run.

## Remaining operator checks and limits

- [ ] Verify live OpenAI authentication, provider permissions and usage controls with a dedicated project key. No real model credentials were used for this checkpoint.
- [ ] Review actual result/trace artifacts before publishing. Arbitrary unlabelled or encoded secrets are not universally detectable; source text is not rewritten by trace sanitization.
- IPv6-only destinations and plain HTTP resources are intentionally unavailable. Chromium uses the proxy for normal network traffic, with direct DNS/QUIC/non-proxied WebRTC UDP disabled. This is application-level egress restriction, not containment of a compromised native process.
- Keys exist in plaintext in `.env` and in authorized Node memory. File permissions do not protect against malicious code/dependencies running as the same user. There is no private login import, public multi-user service, crash-recoverable trace or comprehensive secret scanner.
