import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';

const execute = promisify(execFile);
const allFields = ['profile_name', 'follower_count', 'post_content', 'author_continuations'];
const cases = [
  { name: 'original share URL', url: 'https://www.threads.com/share/GW3EPb5M8/', fields: allFields,
    profile: 'Whoscall', ids: ['Dd0_RHRH6h9'] },
  { name: 'pinned message after continuations', url: 'https://www.threads.com/@kasumitoiu/post/DP1T59_E9_6', fields: allFields,
    profile: 'Sylvia Lee', ids: ['DP1T6jKkwch', 'DP1T6-9k4Gp', 'DP1T7ehE9J0', 'DP1T8A2k03k'] },
  { name: 'valid uppercase-final-letter post', url: 'https://www.threads.com/@rojiace/post/DfMburZGDEA', fields: allFields,
    profile: 'RojiAce', ids: [] },
  { name: 'unavailable lowercase-final-letter post', url: 'https://www.threads.com/@rojiace/post/DfMburZGDEb', fields: allFields,
    unavailable: true },
  { name: 'profile name only', url: 'https://www.threads.com/@whoscall_tw/post/De6Yqf8nxuz', fields: ['profile_name'],
    profile: 'Whoscall' },
  { name: 'multipart content without requesting continuations', url: 'https://www.threads.com/@wheretogo_blue/post/DfN7KeGkuzN',
    fields: ['profile_name', 'follower_count', 'post_content'], profile: '藍藍去哪兒' }
];
const labels = { profile_name: '個人檔案名稱', follower_count: '追蹤者數量', post_content: '貼文內容', author_continuations: '作者續文' };

// Opt-in: real CLI, public website and paid model calls; live content changes should fail visibly.
for (const scenario of cases) {
  test(`live CLI ${scenario.name}`, { skip: process.env.RUN_LIVE_CLI !== '1', timeout: 180_000 }, async () => {
    await mkdir('artifacts', { recursive: true });
    const output = await mkdtemp('artifacts/eval-cli-');
    console.log(`CLI regression artifacts (${scenario.name}): ${output}`);
    const message = `請取得${scenario.fields.map(field => labels[field]).join('、')}：${scenario.url}`;
    let exitCode = 0;
    let stdout;
    try {
      ({ stdout } = await execute(process.execPath, ['scripts/agent-threads.mjs', message, output], { timeout: 170_000 }));
    } catch (error) {
      assert.equal(error.code, 1, 'Only an unavailable-result exit is expected');
      exitCode = error.code;
      stdout = error.stdout;
    }
    const result = JSON.parse(await readFile(`${output}/result.json`, 'utf8'));
    const trace = JSON.parse(await readFile(`${output}/trace.json`, 'utf8'));
    assert.equal(exitCode, scenario.unavailable ? 1 : 0);
    assert.deepEqual(JSON.parse(stdout), result);
    assert.equal(result.source.input_url, scenario.url);
    assert.deepEqual([...result.requested_fields].sort(), [...scenario.fields].sort());
    assert.deepEqual(Object.keys(result.data).sort(), [...scenario.fields].sort());
    assert.equal(trace.events.at(-1).status, 'completed');
    const modelCalls = trace.events.filter(event => event.type === 'model_call');
    const toolCalls = trace.events.filter(event => event.type === 'tool_call');
    assert.equal(modelCalls.length, !scenario.unavailable && scenario.fields.includes('author_continuations') ? 2 : 1);
    assert.deepEqual(toolCalls.map(event => event.name), scenario.unavailable ? ['acquirePost'] : ['acquirePost', 'acquireProfile']);
    if (scenario.unavailable) {
      assert.equal(result.status, 'unavailable');
      assert.equal(result.source.resolved_url, null);
      for (const value of Object.values(result.data)) {
        assert.equal(value.status, 'unavailable');
        assert.equal(value.value, null);
        assert.ok(value.reason.length > 0);
      }
      return;
    }
    assert.equal(result.data.profile_name.status, 'ok');
    assert.equal(result.data.profile_name.value, scenario.profile);
    const post = toolCalls[0].response;
    const root = post.posts.find(candidate => new URL(candidate.url).pathname.replace(/\/$/, '') === new URL(post.source_url).pathname.replace(/\/$/, ''));
    assert.ok(root, 'Resolved source must identify a post');
    if (scenario.fields.includes('post_content')) {
      assert.equal(result.data.post_content.status, 'partial');
      assert.ok(root.text.length > 0);
      assert.equal(result.data.post_content.value, root.text);
    }
    if (scenario.fields.includes('follower_count')) {
      assert.equal(result.data.follower_count.status, 'ok');
      assert.deepEqual(result.data.follower_count.value, toolCalls[1].response.profile.follower_count);
    }
    if (scenario.ids) {
      const continuations = result.data.author_continuations;
      assert.deepEqual(continuations.value?.map(post => post.id) ?? [], scenario.ids);
      assert.equal(continuations.status, scenario.ids.length ? 'partial' : 'uncertain');
      for (const continuation of continuations.value ?? []) {
        assert.equal(continuation.text, post.posts.find(candidate => candidate.id === continuation.id).text);
      }
    }
  });
}
