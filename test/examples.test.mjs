import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EvidenceSchema, ResultSchema, TraceSchema } from '../src/contracts.mjs';
import { redact } from '../src/agent.mjs';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('published CLI regression evidence preserves results, field selection and all model token usage', async () => {
  const cases = [
    ['share', 'partial', 924, 2, ['Dd0_RHRH6h9']],
    ['pinned', 'partial', 3531, 2, ['DP1T6jKkwch', 'DP1T6-9k4Gp', 'DP1T7ehE9J0', 'DP1T8A2k03k']],
    ['valid-post', 'partial', 1546, 2, []],
    ['invalid-post', 'unavailable', 136, 1],
    ['name-only', 'complete', 112, 1],
    ['content-only', 'partial', 131, 1]
  ];
  const total = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
  for (const [name, status, tokens, calls, ids] of cases) {
    const result = ResultSchema.parse(await json(`../examples/live-cli/${name}/result.json`));
    const trace = TraceSchema.parse(await json(`../examples/live-cli/${name}/trace.json`));
    assert.deepEqual(redact(trace), trace, `${name}: published trace must already be redacted`);
    assert.equal(result.status, status);
    assert.deepEqual(Object.keys(result.data).sort(), [...result.requested_fields].sort());
    assert.equal(trace.events.at(-1).status, 'completed');
    assert.equal(trace.events.at(-1).result_status, result.status);
    const modelCalls = trace.events.filter(event => event.type === 'model_call');
    assert.equal(modelCalls.length, calls);
    assert.equal(result.usage.status, 'known');
    for (const key of Object.keys(total)) {
      assert.equal(result.usage[key], modelCalls.reduce((sum, call) => {
        assert.equal(call.usage.status, 'known');
        return sum + call.usage[key];
      }, 0));
      total[key] += result.usage[key];
    }
    assert.equal(result.usage.total_tokens, tokens);
    const post = EvidenceSchema.parse(trace.events.find(event => event.name === 'acquirePost').response);
    assert.equal(result.extracted_at, post.captured_at);
    if (status === 'unavailable') {
      assert.deepEqual(post.posts, []);
      assert.equal(result.source.resolved_url, null);
      for (const field of Object.values(result.data)) {
        assert.equal(field.status, 'unavailable');
        assert.equal(field.value, null);
      }
      continue;
    }
    assert.equal(result.source.resolved_url, post.source_url);
    if (result.data.post_content) {
      const path = url => new URL(url).pathname.replace(/\/$/, '');
      const root = post.posts.find(candidate => path(candidate.url) === path(post.source_url));
      assert.equal(result.data.post_content.value, root.text);
    }
    const profile = trace.events.find(event => event.name === 'acquireProfile').response.profile;
    assert.equal(result.data.profile_name.value, profile.display_name);
    if (result.data.follower_count) assert.deepEqual(result.data.follower_count.value, profile.follower_count);
    if (ids) {
      assert.deepEqual(result.data.author_continuations.value?.map(item => item.id) ?? [], ids);
      for (const item of result.data.author_continuations.value ?? []) {
        const source = post.posts.find(candidate => candidate.id === item.id);
        assert.equal(item.text, source.text);
        assert.equal(item.url, source.url);
      }
    }
  }
  assert.deepEqual(total, { input_tokens: 6079, output_tokens: 301, total_tokens: 6380 });
});

test('published live share example is schema-valid and excludes the observed reader reply', async () => {
  const result = ResultSchema.parse(await json('../examples/share/result.json'));
  const trace = TraceSchema.parse(await json('../examples/share/trace.json'));
  const { evidence, expected_ids } = await json('./fixtures/continuation-reader-exchange.json');
  EvidenceSchema.parse(evidence);
  const post = trace.events.find(event => event.name === 'acquirePost').response;
  assert.deepEqual(result.data.author_continuations.value.map(item => item.id), expected_ids);
  for (const item of result.data.author_continuations.value) {
    assert.equal(item.text, post.posts.find(candidate => candidate.id === item.id).text);
  }
  assert.equal(result.data.post_content.value, post.posts[0].text);
  assert.equal(result.usage.total_tokens, trace.events.filter(event => event.type === 'model_call')
    .reduce((total, event) => total + event.usage.total_tokens, 0));
  assert.equal(trace.events.at(-1).status, 'completed');
  assert.equal(result.status, 'partial');
});
