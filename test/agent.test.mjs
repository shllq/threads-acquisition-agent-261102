import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent, redact } from '../src/agent.mjs';
import { createModel } from '../src/model.mjs';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { acquirePost, acquireProfile } from '../src/acquisition.mjs';

const url = 'https://www.threads.com/@author/post/root';
const post = (id, author, text, position) => ({ id, author, text, position, url: `https://www.threads.com/@${author}/post/${id}`, parent_id: null, author_marker: author === 'author', is_recommendation: false });
const evidence = {
  source_url: url, captured_at: '2026-11-02T01:00:00Z', http_status: 200,
  conversation_complete: false, limitations: ['No expansion or exhaustive loading.'], profile: null,
  posts: [post('root', 'author', '原文\n保留', 0), post('continued', 'author', '續文\n原樣', 1), post('reader', 'reader', '怎麼使用？', 2), post('answer', 'author', '請打開設定', 3)]
};
const usage = { status: 'known', input_tokens: 10, output_tokens: 5, total_tokens: 15 };
function modelWith(decision = { continuation_ids: ['continued'], uncertain: false, reason: 'Reader and answer are a separate exchange.' }) {
  let calls = 0;
  return async () => ({ content: JSON.stringify(++calls === 1 ? { fields: ['post_content', 'author_continuations'] } : decision), usage });
}

test('full workflow connects real Chromium acquisition to profile, result and trace assembly', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const rootUrl = 'https://www.threads.com/@example/post/ROOT';
    const profileUrl = 'https://www.threads.com/@example';
    const conversation = await readFile(new URL('./fixtures/conversation.html', import.meta.url), 'utf8');
    const profile = await readFile(new URL('./fixtures/profile.html', import.meta.url), 'utf8');
    await page.route('**/*', route => route.fulfill({ status: 404, body: 'Unexpected fixture URL' }));
    await page.route(rootUrl, route => route.fulfill({ contentType: 'text/html', body: conversation }));
    await page.route(profileUrl, route => route.fulfill({ contentType: 'text/html', body: profile }));
    let calls = 0;
    const model = async () => ({ usage, content: JSON.stringify(++calls === 1
      ? { fields: ['profile_name', 'follower_count', 'post_content', 'author_continuations'] }
      : { continuation_ids: ['NEXT'], uncertain: false, reason: 'Separate reader exchange excluded.' }) });
    const options = { settleMs: 0, timeoutMs: 3000 };
    const run = await runAgent({ message: `名稱、追蹤者數量、內容及續文 ${rootUrl}`, model, modelName: 'fixture',
      acquirePost: url => acquirePost(page, url, options), acquireProfile: url => acquireProfile(page, url, options) });
    assert.equal(run.error, null);
    assert.equal(run.result.data.post_content.value, '原文第一行\n第二行 💚 連結');
    assert.deepEqual(run.result.data.author_continuations.value.map(p => p.id), ['NEXT']);
    assert.equal(run.result.data.profile_name.status, 'ok');
    assert.equal(run.result.data.follower_count.value.count, 15107);
    assert.equal(run.trace.events.filter(e => e.type === 'tool_call').length, 2);
  } finally { await browser.close(); }
});

test('message workflow preserves selected source text, excludes reader exchanges and totals all model calls', async () => {
  const run = await runAgent({ message: `請取得貼文內容及續文：${url}`, model: modelWith(), modelName: 'fixture', acquirePost: async () => evidence });
  assert.equal(run.error, null);
  assert.deepEqual(Object.keys(run.result.data), ['post_content', 'author_continuations']);
  assert.equal(run.result.data.post_content.value, '原文\n保留');
  assert.deepEqual(run.result.data.author_continuations.value.map(p => p.text), ['續文\n原樣']);
  assert.equal(run.result.status, 'partial');
  assert.equal(run.result.usage.total_tokens, 30);
  assert.deepEqual(run.trace.events.map(e => e.type), ['model_call', 'tool_call', 'model_call', 'run_end']);
  assert.equal(run.trace.events.at(-1).status, 'completed');
});

test('classification cannot select nonexistent IDs, readers, root or recommendations', async () => {
  for (const id of ['invented', 'reader', 'root', 'recommended']) {
    const recommended = { ...post('recommended', 'author', '推薦', 4), is_recommendation: true };
    const run = await runAgent({ message: `內容及續文 ${url}`, modelName: 'fixture', model: modelWith({ continuation_ids: [id], uncertain: false, reason: 'test' }), acquirePost: async () => ({ ...evidence, posts: [...evidence.posts, recommended] }) });
    assert.equal(run.result, null);
    assert.equal(run.trace.events.at(-1).status, 'failed');
  }
});

test('model failure persists a failed call and terminal event without credentials or private reasoning', async () => {
  const run = await runAgent({ message: `內容 ${url}`, modelName: 'fixture', secrets: ['test-secret'], model: async () => { throw new Error('Authorization: Bearer test-secret'); } });
  assert.equal(run.result, null);
  assert.equal(run.trace.events[0].status, 'failed');
  assert.equal(run.trace.events.at(-1).status, 'failed');
  assert.ok(!JSON.stringify(run).includes('test-secret'));
  assert.deepEqual(redact({ api_key: 'secret', nested: { reasoning: 'private', text: 'Bearer abc123' } }), { api_key: '[REDACTED]', nested: { reasoning: '[REDACTED]', text: 'Bearer [REDACTED]' } });
});

test('invalid URL fails before model or browser access', async () => {
  const run = await runAgent({ message: '內容 https://localhost/post/root', model: async () => { assert.fail('must not call model'); }, modelName: 'fixture' });
  assert.equal(run.trace.events.length, 1);
  assert.equal(run.trace.events[0].status, 'failed');
});

test('profile-only request acquires profile without classification and returns only requested fields', async () => {
  const run = await runAgent({ message: `名稱 ${url}`, modelName: 'fixture', model: async () => ({ content: JSON.stringify({ fields: ['profile_name'] }), usage }), acquirePost: async () => evidence,
    acquireProfile: async profileUrl => ({ ...evidence, source_url: profileUrl, posts: [], profile: { url: profileUrl, display_name: 'Author', follower_count: null } }) });
  assert.deepEqual(run.result.data, { profile_name: { status: 'ok', value: 'Author' } });
  assert.equal(run.result.usage.total_tokens, 15);
  assert.equal(run.trace.events.filter(e => e.type === 'model_call').length, 1);
});

test('missing target yields unavailable fields without claiming zero model usage', async () => {
  const run = await runAgent({ message: `內容 ${url}`, modelName: 'fixture', model: async () => ({ content: '{"fields":["post_content"]}', usage: { status: 'unknown', reason: 'Provider omitted usage.' } }), acquirePost: async () => ({ ...evidence, posts: [] }) });
  assert.equal(run.result.status, 'unavailable');
  assert.equal(run.result.usage.status, 'unknown');
});

test('SDK adapter projects public content and usage only, and rejects truncated output', async () => {
  const response = { choices: [{ finish_reason: 'stop', message: { content: '{"fields":["post_content"]}', reasoning: 'private' } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
  const client = { chat: { completions: { create: async request => { assert.equal(request.response_format.type, 'json_object'); return response; } } } };
  const model = createModel({ client });
  assert.deepEqual(await model({ messages: [] }), { content: response.choices[0].message.content, usage });
  response.choices[0].finish_reason = 'length';
  await assert.rejects(model({ messages: [] }), /truncated/);
});

test('uncertain empty classification does not assert no continuations', async () => {
  const run = await runAgent({ message: `內容及續文 ${url}`, modelName: 'fixture', model: modelWith({ continuation_ids: [], uncertain: true, reason: 'Reply context is ambiguous.' }), acquirePost: async () => evidence });
  assert.equal(run.result.data.author_continuations.status, 'uncertain');
  assert.equal(run.result.data.author_continuations.value, null);
});
