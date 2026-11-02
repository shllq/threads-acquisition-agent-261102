# Browser fixtures

These HTML files are synthetic, minimal fixtures based on structural observations from public Threads pages. They are not full saved pages and do not contain captured cookies, headers, tracking URLs or private account state.

- `conversation.html`: timestamp permalinks, pressable containers, language-tagged text, author markers, reader conversation and a separately labeled recommendation section. A same-author recommendation deliberately tests that author matching is insufficient. Reader comments and author-reader replies are retained as evidence context, not classified as continuations.
- `profile.html`: profile display-name heading separate from handle/timeline headings, a rounded follower display and its full numeric public title attribute.

Tests serve these fixtures through Playwright request interception. Client-side redirect fixtures exercise final-document handling; actual share URL navigation is validated separately by live acquisition. They do not claim to capture every locale or Threads layout.
