import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchBrowser } from '../src/browser.mjs';
import { loadApiKey } from '../src/credentials.mjs';
import { runAgent } from '../src/agent.mjs';
import { createModel } from '../src/model.mjs';
import { acquirePost, acquireProfile } from '../src/acquisition.mjs';

const output = resolve(process.argv[3] ?? `artifacts/agent-${Date.now()}`);
let browser;
let page;
async function browserPage() {
  if (!page) {
    browser = await launchBrowser();
    const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
    page = await context.newPage();
  }
  return page;
}
try {
  await mkdir(output, { recursive: true });
  const modelName = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const secrets = [];
  const run = await runAgent({
    message: process.argv[2], modelName,
    model: createModel({ model: modelName, getApiKey: async () => {
      const key = await loadApiKey();
      secrets.push(key);
      return key;
    } }),
    secrets,
    acquirePost: async url => acquirePost(await browserPage(), url),
    acquireProfile: async url => acquireProfile(await browserPage(), url)
  });
  await writeFile(`${output}/trace.json`, JSON.stringify(run.trace, null, 2), { mode: 0o600 });
  const result = run.result ?? { error: run.error };
  await writeFile(`${output}/result.json`, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
  console.error(`Execution trace: ${output}/trace.json`);
  if (run.error || run.result?.status === 'unavailable') process.exitCode = 1;
} finally {
  await browser?.close();
}
