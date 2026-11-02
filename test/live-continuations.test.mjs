import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { runAgent } from '../src/agent.mjs';
import { createModel } from '../src/model.mjs';
import { loadApiKey } from '../src/credentials.mjs';

const readerExchange = JSON.parse(await readFile(new URL('./fixtures/continuation-reader-exchange.json', import.meta.url), 'utf8'));
const readerBranches = JSON.parse(await readFile(new URL('./fixtures/continuation-reader-branches.json', import.meta.url), 'utf8'));
const pinnedMessage = JSON.parse(await readFile(new URL('./fixtures/continuation-pinned-message.json', import.meta.url), 'utf8'));
const multipart = JSON.parse(await readFile(new URL('../examples/multipart/evidence.json', import.meta.url), 'utf8'));

// Opt-in: paid model calls against recorded public evidence, not a browser accuracy test.
for (const { name, evidence, expected_ids } of [
  { name: 'excludes the observed reader reply', ...readerExchange },
  { name: 'excludes the later pinned author message and reader replies', ...pinnedMessage },
  { name: 'excludes connector-proven reader branches and unresolved recorded parents', ...readerBranches },
  { name: 'retains the three anonymous multipart continuations without a sequence badge', evidence: multipart,
    expected_ids: ['DfN7KYxkgGn', 'DfN7KarksFD', 'DfN7KalkgFv'] }
]) {
  test(`live model ${name} in three independent runs`, { skip: process.env.RUN_LIVE_MODEL !== '1', timeout: 240_000 }, async () => {
    await mkdir('artifacts', { recursive: true });
    const output = await mkdtemp('artifacts/eval-continuations-');
    console.log(`Evaluation artifacts: ${output}`);
    const secrets = [];
    const modelName = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
    const model = createModel({ model: modelName, getApiKey: async () => {
      const key = await loadApiKey();
      secrets.push(key);
      return key;
    } });
    for (let i = 1; i <= 3; i++) {
      const run = await runAgent({ message: `請取得貼文內容及作者續文：${evidence.source_url}`, model, modelName, secrets,
        acquirePost: async () => evidence });
      await writeFile(`${output}/trace-${i}.json`, JSON.stringify(run.trace, null, 2), { mode: 0o600 });
      await writeFile(`${output}/result-${i}.json`, JSON.stringify(run.result ?? { error: run.error }, null, 2), { mode: 0o600 });
      assert.equal(run.error, null);
      assert.deepEqual(run.result.data.author_continuations.value?.map(post => post.id), expected_ids);
      assert.equal(run.result.data.post_content.value, evidence.posts[0].text);
      assert.equal(run.result.data.author_continuations.status, 'partial');
      for (const continuation of run.result.data.author_continuations.value) {
        assert.equal(continuation.text, evidence.posts.find(post => post.id === continuation.id).text);
      }
    }
  });
}
