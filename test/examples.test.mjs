import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EvidenceSchema, ResultSchema, TraceSchema } from '../src/contracts.mjs';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

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
