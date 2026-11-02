import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../src/browser.mjs';
import { acquirePost, acquireProfile } from '../src/acquisition.mjs';
import { PostUrlSchema } from '../src/contracts.mjs';

async function main() {
  const inputUrl = PostUrlSchema.parse(process.argv[2]);
  const output = resolve(process.argv[3] ?? `artifacts/acquisition-${Date.now()}`);
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
    const page = await context.newPage();
    const post = await acquirePost(page, inputUrl);
    const targetPath = new URL(post.source_url).pathname.replace(/\/$/, '');
    const root = post.posts.find(candidate => new URL(candidate.url).pathname.replace(/\/$/, '') === targetPath);
    const profile = root ? await acquireProfile(page, new URL(`/@${root.author}`, post.source_url).href) : null;
    const evidence = { input_url: inputUrl, post, profile };
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
    if (!root) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
