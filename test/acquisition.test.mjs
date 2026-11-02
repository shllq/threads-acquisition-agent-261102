import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { acquirePost, acquireProfile } from '../src/acquisition.mjs';
import { EvidenceSchema } from '../src/contracts.mjs';

const origin = 'https://www.threads.com';
const postUrl = `${origin}/@example/post/ROOT`;
const profileUrl = `${origin}/@example`;
const shareUrl = `${origin}/share/EXAMPLE/`;
const conversation = await readFile(new URL('./fixtures/conversation.html', import.meta.url), 'utf8');
const profile = await readFile(new URL('./fixtures/profile.html', import.meta.url), 'utf8');
const options = { settleMs: 0, timeoutMs: 3000 };

async function withBrowser(run) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.route('**/*', route => route.fulfill({ status: 404, body: 'Unexpected fixture URL' }));
    await run(page, context);
  } finally {
    await browser.close();
  }
}

function serve(page, url, body, status = 200) {
  return page.route(url, route => route.fulfill({ status, contentType: 'text/html; charset=utf-8', body }));
}

test('extracts separate original posts in observed order, excluding UI and same-author recommendations', async () => {
  await withBrowser(async page => {
    await serve(page, postUrl, conversation);
    const evidence = await acquirePost(page, postUrl, options);
    EvidenceSchema.parse(evidence);
    assert.deepEqual(evidence.posts.map(post => post.id), ['ROOT', 'NEXT', 'QUESTION', 'ANSWER']);
    assert.equal(evidence.posts[0].text, '原文第一行\n第二行 💚 連結');
    assert.deepEqual(evidence.posts.map(post => post.position), [0, 1, 2, 3]);
    assert.equal(evidence.posts[1].author_marker, true);
    assert.equal(evidence.posts[3].author_marker, true);
    assert.ok(evidence.posts.every(post => post.parent_id === null));
    assert.ok(evidence.posts.every(post => !post.is_recommendation));
    assert.equal(evidence.conversation_complete, false);
    assert.ok(evidence.limitations.some(reason => /parent|reply relationship/i.test(reason)));
    assert.ok(evidence.limitations.some(reason => /sign-in|login/i.test(reason)));
  });
});

test('client-side share redirect resolves to canonical source and preserves unknown reply relationships', async () => {
  await withBrowser(async page => {
    await serve(page, shareUrl, `<script>setTimeout(() => location.replace(${JSON.stringify(postUrl)}), 20)</script>`);
    await serve(page, postUrl, conversation);
    const evidence = await acquirePost(page, shareUrl, { ...options, settleMs: 250 });
    assert.equal(evidence.source_url, postUrl);
    assert.equal(evidence.http_status, 200);
    assert.equal(evidence.posts[0].id, 'ROOT');
  });
});

test('a client-side redirect to an HTTP error reports the final status and does not parse its content', async () => {
  await withBrowser(async page => {
    await serve(page, shareUrl, `<script>setTimeout(() => location.replace(${JSON.stringify(postUrl)}), 20)</script>`);
    await serve(page, postUrl, conversation, 403);
    const evidence = await acquirePost(page, shareUrl, { ...options, settleMs: 250 });
    assert.equal(evidence.http_status, 403);
    assert.deepEqual(evidence.posts, []);
  });
});

test('unknown recommendation boundary retains only the target, rather than risking unrelated candidates', async () => {
  await withBrowser(async page => {
    await serve(page, postUrl, conversation.replace('Related threads', 'Unrecognized section label'));
    const evidence = await acquirePost(page, postUrl, options);
    assert.deepEqual(evidence.posts.map(post => post.id), ['ROOT']);
    assert.ok(evidence.limitations.some(reason => /boundary/i.test(reason)));
  });
});

test('post text containing the recommendation label is not mistaken for a section boundary', async () => {
  await withBrowser(async page => {
    await serve(page, postUrl, conversation.replace('原文第一行', 'Related threads'));
    const evidence = await acquirePost(page, postUrl, options);
    assert.equal(evidence.posts.length, 4);
    assert.match(evidence.posts[0].text, /^Related threads\n/);
  });
});

test('missing target, missing text and ambiguous quoted identities are not treated as complete posts', async () => {
  await withBrowser(async page => {
    await serve(page, postUrl, conversation.replace('/post/ROOT', '/post/DIFFERENT'));
    const missing = await acquirePost(page, postUrl, options);
    assert.deepEqual(missing.posts, []);
    assert.ok(missing.limitations.some(reason => /target/i.test(reason)));
    await serve(page, postUrl, conversation.replace('<div lang="zh-TW"><span>', '<div><span>'));
    const noText = await acquirePost(page, postUrl, options);
    assert.equal(noText.posts.length, 0);
    await serve(page, postUrl, conversation.replace('<aside>', '<a href="/@quote/post/QUOTE"><time>Yesterday</time></a><aside>'));
    const quoted = await acquirePost(page, postUrl, options);
    assert.equal(quoted.posts.length, 0);
  });
});

test('HTTP block and navigation timeout return explicit incomplete evidence without parsing error-page posts', async () => {
  await withBrowser(async page => {
    await serve(page, postUrl, conversation, 403);
    const blocked = await acquirePost(page, postUrl, options);
    assert.equal(blocked.http_status, 403);
    assert.deepEqual(blocked.posts, []);
    assert.ok(blocked.limitations.some(reason => /403/.test(reason)));
    await page.route(postUrl, () => {});
    const timedOut = await acquirePost(page, postUrl, { settleMs: 0, timeoutMs: 100 });
    assert.deepEqual(timedOut.posts, []);
    assert.ok(timedOut.limitations.some(reason => /timeout/i.test(reason)));
  });
});

test('profile reads the display name, not handle or timeline headings, and exact public tooltip count', async () => {
  await withBrowser(async page => {
    await serve(page, profileUrl, profile);
    const evidence = await acquireProfile(page, profileUrl, options);
    assert.equal(evidence.profile.display_name, 'Example Display Name');
    assert.deepEqual(evidence.profile.follower_count, { display: '15,107', precision: 'exact', count: 15107 });
    assert.deepEqual(evidence.posts, []);
  });
});

test('profile falls back to rounded visible count and represents missing or ambiguous fields honestly', async () => {
  await withBrowser(async page => {
    await serve(page, profileUrl, profile.replace(' title="15,107"', ''));
    const rounded = await acquireProfile(page, profileUrl, options);
    assert.deepEqual(rounded.profile.follower_count, { display: '15.1K', precision: 'rounded', count: null });
    await serve(page, profileUrl, '<h1>example</h1><h1 translate="no">A</h1><h1 translate="no">B</h1>');
    const missing = await acquireProfile(page, profileUrl, options);
    assert.equal(missing.profile.display_name, null);
    assert.equal(missing.profile.follower_count, null);
    assert.ok(missing.limitations.some(reason => /display name/i.test(reason)));
    assert.ok(missing.limitations.some(reason => /follower/i.test(reason)));
  });
});

test('hidden and conflicting target posts are not returned as verified evidence', async () => {
  await withBrowser(async page => {
    await serve(page, postUrl, conversation.replace('data-pressable-container="true"', 'data-pressable-container="true" style="display:none"'));
    assert.deepEqual((await acquirePost(page, postUrl, options)).posts, []);
    await serve(page, postUrl, conversation.replace('lang="zh-TW"', 'lang="zh-TW" style="display:none"'));
    assert.deepEqual((await acquirePost(page, postUrl, options)).posts, []);
    const duplicateScript = `<script>
      const root = document.querySelector('[data-pressable-container]');
      const duplicate = root.cloneNode(true);
      root.after(duplicate);
    </script>`;
    await serve(page, postUrl, conversation.replace('</body>', `${duplicateScript}</body>`));
    const repeated = await acquirePost(page, postUrl, options);
    assert.deepEqual(repeated.posts.map(post => post.id), ['ROOT', 'NEXT', 'QUESTION', 'ANSWER']);
    assert.ok(repeated.limitations.some(reason => /duplicate/i.test(reason)));
    await serve(page, postUrl, conversation.replace('</body>', `${duplicateScript.replace('root.after(duplicate);', 'duplicate.querySelector("[lang]").innerText = "Conflicting text"; root.after(duplicate);')}</body>`));
    const conflict = await acquirePost(page, postUrl, options);
    assert.deepEqual(conflict.posts, []);
    assert.ok(conflict.limitations.some(reason => /conflict/i.test(reason)));
  });
});

test('does not parse a final document outside allowed Threads routes', async () => {
  await withBrowser(async page => {
    const external = 'https://example.org/@example/post/ROOT';
    await serve(page, shareUrl, `<script>setTimeout(() => location.replace(${JSON.stringify(external)}), 20)</script>`);
    await serve(page, external, conversation);
    const evidence = await acquirePost(page, shareUrl, { ...options, settleMs: 250 });
    assert.deepEqual(evidence.posts, []);
    assert.ok(evidence.limitations.some(reason => /Acquisition failed/i.test(reason)));
  });
});

test('rejects unsafe/mismatched input routes before navigation', async () => {
  await withBrowser(async page => {
    let requests = 0;
    page.on('request', () => requests++);
    await assert.rejects(() => acquirePost(page, 'https://example.org/@user/post/ABC', options));
    await assert.rejects(() => acquirePost(page, profileUrl, options));
    await assert.rejects(() => acquireProfile(page, postUrl, options));
    assert.equal(requests, 0);
  });
});
