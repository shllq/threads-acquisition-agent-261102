# Browser fixtures

See [acquisition findings](../../docs/FINDINGS.md) for the screenshots, observed DOM structure and known limits behind these fixtures.

The HTML files are synthetic, minimal fixtures based on structural observations from public Threads pages. They are not full saved pages and do not contain captured cookies, headers, tracking URLs or private account state.

- `conversation.html`: timestamp permalinks, pressable containers, language-tagged text, author markers, reader conversation and a separately labeled recommendation section. A same-author recommendation deliberately tests that author matching is insufficient. Reader comments and author-reader replies are retained as evidence context, not classified as continuations.
- `connected-conversation.html`: minimal synthetic markup based on anonymous `@tai_wan_lan` DOM inspection. Shared `[data-virtualized]` groups and empty 2px connector elements reproduce the observed structure without copying full HTML or obfuscated classes. Covers author-only edges, reader-reply chains and a parent with missing text; first posts of groups remain unknown-parent.
- `profile.html`: profile display-name heading separate from handle/timeline headings, a rounded follower display and its full numeric public title attribute.

- `continuation-reader-exchange.json`: actual public `acquirePost` evidence from the pre-fix live share run (`2026-11-02T04:34:31.857Z`), with the resolved URL's tracking query removed. Expected IDs were manually labeled: keep `Dd0_RHRH6h9` (activity details); exclude `Dd8sq8MH9pJ` (apology/resolution answering the preceding reader question). No model decision from the failed run is used as ground truth. The opt-in live-model regression consumes this evidence without browsing.

- `../../examples/multipart/evidence.json`: shared recorded anonymous evidence for `@wheretogo_blue/post/DfN7KeGkuzN` (`2026-11-02T05:20:31.138Z`). The multipart model regression reuses it rather than duplicating the snapshot. Expected IDs are manually labeled in `test/live-continuations.test.mjs`: `DfN7KYxkgGn`, `DfN7KarksFD`, `DfN7KalkgFv` in order. The user's logged-out screenshot agrees with the missing sequence badge; no screenshot text or platform total is synthesized into evidence.

- `continuation-reader-branches.json`: actual public post evidence from the corrected `@tai_wan_lan` CLI run (`2026-11-02T05:41:25.172Z`), including recognized connector parent IDs and missing-text limitations. Manual expected IDs retain only the database link `DU0gvTyk830` and search tips `DU0iKvbE2Zj`. This third paid model regression checks eligibility with real recorded structure, not inferred parent links or screenshot text.

Tests serve the HTML fixtures through Playwright request interception. Client-side redirect fixtures exercise final-document handling; actual share URL navigation is validated separately by live acquisition. They do not claim to capture every locale or Threads layout.
