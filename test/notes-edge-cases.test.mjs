import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runAgent } from '../src/agent.mjs';
import { EvidenceSchema } from '../src/contracts.mjs';

const pinned = JSON.parse(await readFile(new URL('./fixtures/continuation-pinned-message.json', import.meta.url), 'utf8'));
const invalid = JSON.parse(await readFile(new URL('./fixtures/invalid-post.json', import.meta.url), 'utf8'));
const usage = { status: 'known', input_tokens: 1, output_tokens: 1, total_tokens: 2 };

// This checks deterministic assembly; live-continuations.test.mjs checks actual model selection.
test('recorded pinned-message conversation preserves the four selected continuations in source order', async () => {
  const evidence = EvidenceSchema.parse(pinned.evidence);
  let calls = 0;
  const run = await runAgent({ message: `貼文內容及續文 ${evidence.source_url}`, modelName: 'fixture',
    model: async () => ({ usage, content: JSON.stringify(++calls === 1
      ? { fields: ['post_content', 'author_continuations'] }
      : { continuation_ids: [...pinned.expected_ids].reverse(), uncertain: false, reason: 'Manually labeled continuations; later comment and reader replies excluded.' }) }),
    acquirePost: async () => evidence });
  assert.equal(run.error, null);
  assert.equal(run.result.data.post_content.value, evidence.posts[0].text);
  assert.deepEqual(run.result.data.author_continuations.value, pinned.expected_ids.map(id => {
    const { url, text } = evidence.posts.find(post => post.id === id);
    return { id, url, text };
  }));
  assert.equal(run.result.data.author_continuations.status, 'partial');
  assert.equal(calls, 2);
});

test('recorded invalid post returns unavailable for every field without profile or classification calls', async () => {
  const evidence = EvidenceSchema.parse(invalid.evidence);
  const fields = ['profile_name', 'follower_count', 'post_content', 'author_continuations'];
  let calls = 0;
  const run = await runAgent({ message: `個人檔案名稱、追蹤者數量、貼文內容及續文 ${evidence.source_url}`, modelName: 'fixture',
    model: async () => {
      assert.equal(++calls, 1, 'No continuation classification without a target');
      return { usage, content: JSON.stringify({ fields }) };
    },
    acquirePost: async () => evidence,
    acquireProfile: async () => assert.fail('No verified author profile') });
  assert.equal(run.error, null);
  assert.equal(run.result.status, 'unavailable');
  assert.equal(run.result.source.resolved_url, null);
  assert.deepEqual(Object.keys(run.result.data), fields);
  for (const field of fields) {
    assert.deepEqual(run.result.data[field], { status: 'unavailable', value: null, reason: evidence.limitations.join(' ') });
  }
  assert.deepEqual(run.trace.events.map(event => event.type), ['model_call', 'tool_call', 'run_end']);
});
