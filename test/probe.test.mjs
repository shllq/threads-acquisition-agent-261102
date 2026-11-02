import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { inspectPage } from '../scripts/probe-threads.mjs';

test('captures rendered evidence and HTTP errors without claiming extraction completeness', async () => {
  const server = createServer((request, response) => {
    response.writeHead(request.url === '/blocked' ? 403 : 200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<title>Public page</title><main>原文<br>第二行<a href="/post/next">續文</a></main>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = `http://127.0.0.1:${server.address().port}`;
    const result = await inspectPage(page, url, 0);
    assert.equal(result.http_status, 200);
    assert.equal(result.title, 'Public page');
    assert.match(result.body_text, /原文\n第二行/);
    assert.ok(result.links.some(link => link.url === `${url}/post/next`));
    assert.equal(result.extraction_complete, false);
    assert.ok(!Number.isNaN(Date.parse(result.captured_at)));
    const blocked = await inspectPage(page, `${url}/blocked`, 0);
    assert.equal(blocked.http_status, 403);
    assert.equal(blocked.extraction_complete, false);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
