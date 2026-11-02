import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../src/browser.mjs';

export async function inspectPage(page, url, settleMs = 8000) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // A bounded observation window, not proof that all replies have loaded.
  await page.waitForTimeout(settleMs);
  return {
    input_url: url,
    resolved_url: page.url(),
    captured_at: new Date().toISOString(),
    http_status: response?.status() ?? null,
    title: await page.title(),
    extraction_complete: false,
    note: 'Rendered page evidence only; follower count and continuation completeness are not verified.',
    ...await page.evaluate(() => ({
      body_text: document.body.innerText,
      description: document.querySelector('meta[property="og:description"]')?.content ?? null,
      links: Array.from(document.querySelectorAll('a[href]'), a => ({ text: a.innerText, url: a.href }))
    }))
  };
}

async function main() {
  const url = process.argv[2];
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !['www.threads.com', 'threads.com', 'www.threads.net', 'threads.net'].includes(parsed.hostname) || parsed.username || parsed.password) {
    throw new Error('Provide a public HTTPS Threads URL without credentials.');
  }
  const output = resolve(process.argv[3] ?? `artifacts/probe-${Date.now()}`);
  await mkdir(output, { recursive: true });
  const browser = await launchBrowser();
  let exitCode = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 960 } });
    const page = await context.newPage();
    let result;
    try {
      result = { status: 'observed', ...await inspectPage(page, url) };
    } catch (error) {
      exitCode = 1;
      result = { status: 'failed', input_url: url, captured_at: new Date().toISOString(), extraction_complete: false, error: error.message };
    }
    await writeFile(`${output}/page.json`, JSON.stringify(result, null, 2));
    await page.screenshot({ path: `${output}/page.png`, fullPage: true });
    console.log(JSON.stringify({ ...result, artifacts_directory: output }, null, 2));
  } finally {
    await browser.close();
  }
  process.exitCode = exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
