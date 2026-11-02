import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { runAgent } from '../src/agent.mjs';
import { createModel } from '../src/model.mjs';
import { acquirePost, acquireProfile } from '../src/acquisition.mjs';

const output = resolve(process.argv[3] ?? `artifacts/agent-${Date.now()}`);
let browser;
let page;
async function browserPage() {
  if (!page) {
    browser = await chromium.launch();
    const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
    page = await context.newPage();
  }
  return page;
}
try {
  await mkdir(output, { recursive: true });
  const modelName = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
  const run = await runAgent({
    message: process.argv[2], modelName,
    model: createModel({ apiKey: process.env.OPENAI_API_KEY, model: modelName }),
    secrets: [process.env.OPENAI_API_KEY],
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
