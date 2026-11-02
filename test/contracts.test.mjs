import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseRequest, EvidenceSchema, ResultSchema, UsageSchema, TraceEventSchema, TraceSchema, buildResult
} from '../src/contracts.mjs';

const url = 'https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz';
const knownUsage = { status: 'known', input_tokens: 20, output_tokens: 5, total_tokens: 25 };
const unknownUsage = { status: 'unknown', reason: 'Provider did not return usage.' };
const okText = { status: 'ok', value: '原文\n第二行' };
const missing = { status: 'unavailable', value: null, reason: 'Public page did not expose this field.' };

function result(fields, values, usage = knownUsage) {
  return buildResult({
    request: parseRequest(`請取得資料：${url}`, fields),
    resolved_url: url,
    extracted_at: '2026-11-02T02:00:00Z',
    values,
    usage
  });
}

test('accepts one post or share URL, including Chinese punctuation, preserving query parameters', () => {
  const request = parseRequest(`請取得內容：${url}。`, ['post_content']);
  assert.equal(request.url, url);
  assert.deepEqual(request.fields, ['post_content']);
  const share = 'https://www.threads.com/share/GW3EPb5M8/?x=1';
  assert.equal(parseRequest(`取資料 ${share}`, ['profile_name']).url, share);
  assert.equal(parseRequest('https://www.threads.net/@user/post/ABC', ['profile_name']).fields[0], 'profile_name');
});

test('rejects missing/multiple URLs, unsupported fields and empty field selection', () => {
  for (const message of ['沒有網址', `${url} ${url}`, `${url} https://example.com`]) {
    assert.throws(() => parseRequest(message, ['post_content']));
  }
  for (const fields of [[], ['likes'], ['profile_name', 'profile_name']]) {
    assert.throws(() => parseRequest(url, fields));
  }
});

test('rejects non-public targets, credentials, ports, lookalike hosts and non-post routes', () => {
  for (const bad of [
    'http://www.threads.com/@user/post/ABC',
    'https://www.threads.com.evil.test/@user/post/ABC',
    'https://secret@www.threads.com/@user/post/ABC',
    'https://www.threads.com:444/@user/post/ABC',
    'https://127.0.0.1/@user/post/ABC',
    'https://www.threads.com/login',
    'https://www.threads.com/@user',
    'https://www.threads.com/share/'
  ]) assert.throws(() => parseRequest(bad, ['post_content']), bad);
});

test('projects requested fields only and preserves original newlines', () => {
  const output = result(['post_content'], { post_content: okText, profile_name: { status: 'ok', value: 'Whoscall' } });
  assert.deepEqual(Object.keys(output.data), ['post_content']);
  assert.equal(output.data.post_content.value, '原文\n第二行');
  assert.equal(output.status, 'complete');
  assert.equal(output.source.input_url, url);
  assert.equal(ResultSchema.parse(output).usage.total_tokens, 25);
});

test('missing evidence becomes unavailable, not fabricated or complete', () => {
  const output = result(['post_content', 'follower_count'], { post_content: okText });
  assert.equal(output.status, 'partial');
  assert.equal(output.data.follower_count.status, 'unavailable');
  assert.equal(output.data.follower_count.value, null);
  assert.ok(output.data.follower_count.reason);
  assert.equal(result(['profile_name'], {}).status, 'unavailable');
});

test('unknown continuations differ from confirmed none and incomplete observed continuations', () => {
  const none = result(['author_continuations'], { author_continuations: { status: 'ok', value: [] } });
  assert.equal(none.status, 'complete');
  const unknown = result(['author_continuations'], { author_continuations: missing });
  assert.equal(unknown.status, 'unavailable');
  assert.equal(unknown.data.author_continuations.value, null);
  const partial = result(['author_continuations'], {
    author_continuations: { status: 'partial', value: [{ id: 'next', url, text: '續文\n原文' }], reason: 'Loading stopped before completeness could be verified.' }
  });
  assert.equal(partial.status, 'partial');
  assert.equal(partial.data.author_continuations.value[0].text, '續文\n原文');
  const uncertain = result(['author_continuations'], {
    author_continuations: { status: 'uncertain', value: null, reason: 'Reply relationship is not exposed.' }
  });
  assert.equal(uncertain.status, 'uncertain');
});

test('rounded follower displays cannot masquerade as exact counts', () => {
  const output = result(['follower_count'], {
    follower_count: { status: 'ok', value: { display: '15.1K', precision: 'rounded', count: null } }
  });
  assert.equal(output.data.follower_count.value.display, '15.1K');
  assert.equal(output.data.follower_count.value.count, null);
  assert.throws(() => result(['follower_count'], {
    follower_count: { status: 'ok', value: { display: '15.1K', precision: 'rounded', count: 15100 } }
  }));
  assert.throws(() => result(['follower_count'], {
    follower_count: { status: 'ok', value: { display: '15.1K', precision: 'exact', count: 15100 } }
  }));
  const exact = result(['follower_count'], {
    follower_count: { status: 'ok', value: { display: '15,123', precision: 'exact', count: 15123 } }
  });
  assert.equal(exact.data.follower_count.value.count, 15123);
});

test('requires reasons for incomplete states and validates timestamps', () => {
  assert.throws(() => result(['profile_name'], { profile_name: { status: 'unavailable', value: null } }));
  const output = result(['profile_name'], { profile_name: missing });
  assert.throws(() => ResultSchema.parse({ ...output, extracted_at: 'not-a-date' }));
  assert.throws(() => ResultSchema.parse({ ...output, status: 'complete' }));
  assert.throws(() => ResultSchema.parse({ ...output, data: { ...output.data, post_content: okText } }));
});

test('usage is explicit and internally consistent, not silently zero for missing usage', () => {
  assert.deepEqual(result(['post_content'], { post_content: okText }, unknownUsage).usage, unknownUsage);
  assert.throws(() => UsageSchema.parse({ status: 'known', input_tokens: 20, output_tokens: 5, total_tokens: 0 }));
  assert.throws(() => UsageSchema.parse({ status: 'known', input_tokens: -1, output_tokens: 5, total_tokens: 4 }));
  assert.throws(() => UsageSchema.parse({ status: 'unknown' }));
});

test('all 15 nonempty field combinations output exactly the requested keys', () => {
  const fields = ['profile_name', 'follower_count', 'post_content', 'author_continuations'];
  const values = {
    profile_name: { status: 'ok', value: 'Whoscall' },
    follower_count: { status: 'ok', value: { display: '15.1K', precision: 'rounded', count: null } },
    post_content: okText,
    author_continuations: { status: 'ok', value: [] }
  };
  for (let mask = 1; mask < 16; mask++) {
    const selected = fields.filter((_, index) => mask & (1 << index));
    assert.deepEqual(Object.keys(result(selected, values).data), selected);
  }
});

const end = { type: 'run_end', event_id: 'end', timestamp: '2026-11-02T02:00:00Z', status: 'completed', result_status: 'partial', reason: null };
const toolCall = {
  type: 'tool_call', event_id: 'tool-1', timestamp: end.timestamp, call_id: 'call-1', name: 'read_post',
  request: { url }, response: { posts: [] }, status: 'succeeded', error: null
};

test('trace records call results and distinguishes execution completion from data completeness', () => {
  const trace = TraceSchema.parse({ run_id: 'run-1', events: [toolCall, end] });
  assert.equal(trace.events[0].response.posts.length, 0);
  assert.equal(trace.events[1].status, 'completed');
  assert.equal(trace.events[1].result_status, 'partial');
  assert.throws(() => TraceSchema.parse({ run_id: 'run-1', events: [toolCall] }));
  assert.throws(() => TraceSchema.parse({ run_id: 'run-1', events: [end, toolCall] }));
  assert.throws(() => TraceSchema.parse({ run_id: 'run-1', events: [end, end] }));
  assert.throws(() => TraceSchema.parse({ run_id: 'run-1', events: [toolCall, toolCall, end] }));
});

test('individual call failures require an error, and failed terminations require a reason', () => {
  assert.throws(() => TraceEventSchema.parse({ ...toolCall, status: 'failed', error: null }));
  assert.throws(() => TraceEventSchema.parse({ ...toolCall, status: 'succeeded', error: 'Something failed.' }));
  assert.throws(() => TraceEventSchema.parse({ ...end, status: 'timeout', reason: null }));
  assert.equal(TraceEventSchema.parse({ ...end, status: 'timeout', reason: 'Task deadline reached.' }).status, 'timeout');
});

test('model trace requires usage and cannot add a private reasoning field', () => {
  const modelCall = { ...toolCall, type: 'model_call', name: 'configured-model', usage: unknownUsage };
  assert.equal(TraceEventSchema.parse(modelCall).usage.status, 'unknown');
  assert.throws(() => TraceEventSchema.parse({ ...modelCall, reasoning: 'Do not persist private thoughts.' }));
  const { usage, ...withoutUsage } = modelCall;
  assert.throws(() => TraceEventSchema.parse(withoutUsage));
});

test('evidence retains source identity, order and explicit unknown relationships without inferring completeness', () => {
  const evidence = EvidenceSchema.parse({
    source_url: url,
    captured_at: '2026-11-02T02:00:00Z',
    http_status: 200,
    conversation_complete: false,
    limitations: ['Public view does not establish exhaustive replies.'],
    posts: [{ id: 'root', url, author: 'whoscall_tw', text: '原文\n保留', position: 0, parent_id: null, author_marker: false, is_recommendation: false }],
    profile: null
  });
  assert.equal(evidence.posts[0].parent_id, null);
  assert.equal(evidence.posts[0].text, '原文\n保留');
  assert.equal(evidence.conversation_complete, false);
  assert.throws(() => EvidenceSchema.parse({ ...evidence, posts: [evidence.posts[0], evidence.posts[0]] }));
  assert.throws(() => EvidenceSchema.parse({ ...evidence, conversation_complete: false, limitations: [] }));
});
