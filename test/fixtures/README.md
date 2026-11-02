# Browser fixtures

See [acquisition findings](../../docs/FINDINGS.md) for the screenshots, observed DOM structure and known limits behind these fixtures.

The HTML files are synthetic, minimal fixtures based on structural observations from public Threads pages. They are not full saved pages and do not contain captured cookies, headers, tracking URLs or private account state.

- `conversation.html`: timestamp permalinks, pressable containers, language-tagged text, author markers, reader conversation and a separately labeled recommendation section. A same-author recommendation deliberately tests that author matching is insufficient. Reader comments and author-reader replies are retained as evidence context, not classified as continuations.
- `connected-conversation.html`: minimal synthetic markup based on anonymous `@tai_wan_lan` DOM inspection. Shared `[data-virtualized]` groups and empty 2px connector elements reproduce the observed structure without copying full HTML or obfuscated classes. Covers author-only edges, reader-reply chains and a parent with missing text; first posts of groups remain unknown-parent.
- `profile.html`: profile display-name heading separate from handle/timeline headings, a rounded follower display and its full numeric public title attribute.

- `continuation-reader-exchange.json`: actual public `acquirePost` evidence from the pre-fix live share run (`2026-11-02T04:34:31.857Z`), with the resolved URL's tracking query removed. Expected IDs were manually labeled: keep `Dd0_RHRH6h9` (activity details); exclude `Dd8sq8MH9pJ` (apology/resolution answering the preceding reader question). No model decision from the failed run is used as ground truth. The opt-in live-model regression consumes this evidence without browsing.

- `../../examples/multipart/evidence.json`: shared recorded anonymous evidence for `@wheretogo_blue/post/DfN7KeGkuzN` (`2026-11-02T05:20:31.138Z`). The multipart model regression reuses it rather than duplicating the snapshot. Expected IDs are manually labeled in `test/live-continuations.test.mjs`: `DfN7KYxkgGn`, `DfN7KarksFD`, `DfN7KalkgFv` in order. The user's logged-out screenshot agrees with the missing sequence badge; no screenshot text or platform total is synthesized into evidence.

- `continuation-reader-branches.json`: actual public post evidence from the corrected `@tai_wan_lan` CLI run (`2026-11-02T05:41:25.172Z`), including recognized connector parent IDs and missing-text limitations. Manual expected IDs retain only the database link `DU0gvTyk830` and search tips `DU0iKvbE2Zj`. This third paid model regression checks eligibility with real recorded structure, not inferred parent links or screenshot text.

## Edge cases collected from `notes.md`

Live CLI checks on 2026-11-02 used fresh anonymous browser contexts. Local result/trace files are under `artifacts/notes-edge-cases/` (ignored); follower counts are observations, not stable regression expectations.

| Case | Observed result |
| --- | --- |
| `@kasumitoiu/post/DP1T59_E9_6` | Four continuations in order: `DP1T6jKkwch`, `DP1T6-9k4Gp`, `DP1T7ehE9J0`, `DP1T8A2k03k`. Excludes the later author message `DP26N4WE_4B` and reader-reply branches. |
| `@rojiace/post/DfMburZGDEA` | Valid post, not an invalid-URL case: returned RojiAce, follower count and content; continuations uncertain/null. |
| `@rojiace/post/DfMburZGDEb` | Unavailable, all four fields null, CLI exit 1. Final route validation failed after navigation; HTTP 200 alone did not establish a valid post. The current reason is a generic schema error, not an explicit “post not found” diagnosis. |
| `@whoscall_tw/post/De6Yqf8nxuz`, name only | Complete; only `profile_name: Whoscall`, no continuation classification. |
| `@wheretogo_blue/post/DfN7KeGkuzN`, no continuations requested | Partial; only profile name, follower count and original content, no continuation classification. |

- `continuation-pinned-message.json`: public `acquirePost` evidence captured at `2026-11-02T07:14:50.560Z`. Expected IDs were manually labeled from the four successive reporting additions ending with `願平安。`; the later author message concerns managing comments rather than continuing the report. “Pinned” comes from the supplied case description: the evidence schema does not capture pin metadata. The paid model matched these labels in three independent recorded-evidence runs.
- `invalid-post.json`: public empty evidence captured at `2026-11-02T07:14:50.885Z` for the lowercase-final-letter URL. Offline replay verifies unavailable fields and no profile/classification calls. Browser fixtures separately test HTTP 200 missing-target pages, HTTP 404 pages and redirects to the home route; they do not pretend to be saved invalid-post DOM.

Run offline regressions with `npm test`. Run only the new paid classifier regression with:

```sh
RUN_LIVE_MODEL=1 node --test --test-name-pattern='pinned author' test/live-continuations.test.mjs
```

The offline pinned test checks source-backed assembly using a fake model, not classification accuracy. The opt-in paid test checks classification on recorded evidence, not future browser layout accuracy.

Tests serve the HTML fixtures through Playwright request interception. Client-side redirect fixtures exercise final-document handling; actual share URL navigation is validated separately by live acquisition. They do not claim to capture every locale or Threads layout.
