import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel } from '../src/model.mjs';
import { redact } from '../src/agent.mjs';
import { loadApiKey, browserEnvironment } from '../src/credentials.mjs';
import { publicAddress, createNetworkProxy } from '../src/network.mjs';
import { launchBrowser } from '../src/browser.mjs';
import { createServer as createTcpServer, connect } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('SDK ignores inherited endpoint and debug overrides without changing authentication', async () => {
  const originalFetch = globalThis.fetch;
  const saved = { base: process.env.OPENAI_BASE_URL, log: process.env.OPENAI_LOG };
  process.env.OPENAI_BASE_URL = 'http://credential-check.invalid/v1';
  process.env.OPENAI_LOG = 'debug';
  let destination;
  globalThis.fetch = async (url, init) => {
    destination = String(url);
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer dummy-key');
    assert.equal(init.redirect, 'error');
    assert.ok(!init.body.includes('dummy-key'));
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }), { headers: { 'content-type': 'application/json' } });
  };
  try {
    await createModel({ apiKey: 'dummy-key' })({ messages: [{ role: 'user', content: 'test' }] });
    assert.equal(destination, 'https://api.openai.com/v1/chat/completions');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of [['OPENAI_BASE_URL', saved.base], ['OPENAI_LOG', saved.log]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('local .env loads a quoted key without exporting credentials or other settings', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'threads-env-'));
  const file = join(directory, '.env');
  const env = {};
  try {
    await writeFile(file, '# local credential\nOPENAI_API_KEY="dummy-file-key"\nOPENAI_BASE_URL=http://untrusted.invalid\n');
    assert.equal(await loadApiKey({ env, file }), 'dummy-file-key');
    assert.deepEqual(env, {});
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('an injected environment key takes precedence and is removed after loading', async () => {
  const env = { OPENAI_API_KEY: ' dummy-key ' };
  assert.equal(await loadApiKey({ env, file: '/unused/.env' }), 'dummy-key');
  assert.deepEqual(env, {});
});

test('missing and empty .env credentials give a setup error without leaking file contents', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'threads-env-'));
  const file = join(directory, '.env');
  try {
    await assert.rejects(loadApiKey({ env: {}, file }), /\.env.*OPENAI_API_KEY/);
    await writeFile(file, 'OPENAI_API_KEY=""\nOTHER_SECRET=do-not-log-this\n');
    await assert.rejects(loadApiKey({ env: {}, file }), error => /OPENAI_API_KEY/.test(error.message) && !error.message.includes('do-not-log-this'));
    await assert.rejects(loadApiKey({ env: {}, file: directory }), /Cannot read/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('browser environment allows OS settings but no credentials or runtime injection', () => {
  assert.deepEqual(browserEnvironment({ HOME: '/home/test', PATH: '/bin', OPENAI_API_KEY: 'dummy', OTHER_SECRET: 'dummy', NODE_OPTIONS: '--inspect', LD_PRELOAD: '/evil.so' }), { HOME: '/home/test', PATH: '/bin' });
});

test('trace redaction handles serialized JSON, embedded credential assignments and malformed responses', () => {
  for (const value of ['{"password":"dummy-password"}', '{"nested":{"api_key":"dummy-password"}}', '{"password":"dummy-password",broken', 'password=dummy-password', 'Cookie: session=dummy-password', 'Bearer dummy-password', 'sk-dummy-password']) {
    assert.ok(!JSON.stringify(redact(value)).includes('dummy-password'), value);
  }
  assert.equal(redact('original post\nunchanged'), 'original post\nunchanged');
  assert.equal(redact('{"fields":["post_content"]}'), '{"fields":["post_content"]}');
});

test('network boundary rejects local, metadata, reserved and IPv6 destinations', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '168.63.129.16', '172.16.0.1', '192.168.1.1', '100.64.0.1', '0.0.0.0', '224.0.0.1', '192.0.2.1', '::1', '::ffff:127.0.0.1']) assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress('1.1.1.1'), true);
  assert.equal(publicAddress('8.8.8.8'), true);
});

async function tunnel(proxy, target, payload = '') {
  const url = new URL(proxy.server);
  const socket = connect({ host: url.hostname, port: Number(url.port) });
  try {
    return await new Promise((resolve, reject) => {
      let received = '';
      socket.on('error', reject);
      socket.setTimeout(3000, () => reject(new Error('Proxy response timed out.')));
      socket.on('connect', () => socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n${payload}`));
      socket.on('data', data => {
        received += data.toString();
        if (received.includes('403 Forbidden') || (received.includes('200 Connection Established') && (!payload || received.endsWith(payload)))) resolve(received);
      });
    });
  } finally { socket.destroy(); }
}

test('proxy denies mixed/private DNS answers, IPv6 and non-HTTPS ports before dialing', async () => {
  let dialed = false;
  const proxy = await createNetworkProxy({ resolve: async () => [{ address: '1.1.1.1' }, { address: '127.0.0.1' }], dial: () => { dialed = true; assert.fail('must not dial'); } });
  try {
    for (const target of ['mixed.test:443', '127.0.0.1:443', '[::1]:443', 'public.test:80']) assert.match(await tunnel(proxy, target), /403 Forbidden/);
    assert.equal(dialed, false);
    assert.equal((await fetch(proxy.server)).status, 403);
  } finally { await proxy.close(); }
});

test('proxy tunnels to the validated IP without a second hostname lookup', async () => {
  const echo = createTcpServer(socket => socket.pipe(socket));
  await new Promise(resolve => echo.listen(0, '127.0.0.1', resolve));
  let lookups = 0;
  const proxy = await createNetworkProxy({ resolve: async () => { lookups++; return [{ address: '1.1.1.1' }]; }, dial: options => {
    assert.deepEqual(options, { host: '1.1.1.1', port: 443 });
    return connect({ host: '127.0.0.1', port: echo.address().port });
  } });
  try {
    assert.match(await tunnel(proxy, 'public.test:443', 'payload'), /200 Connection Established/);
    assert.equal(lookups, 1);
  } finally {
    await proxy.close();
    await new Promise(resolve => echo.close(resolve));
  }
});

test('hardened Chromium blocks loopback navigation and subresources and does not inherit a key', async () => {
  let localRequests = 0;
  const server = createHttpServer((_request, response) => { localRequests++; response.end('private service'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'dummy-browser-isolation-key';
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const local = `http://127.0.0.1:${server.address().port}`;
    try { await page.goto(local, { timeout: 3000 }); } catch { /* Blocking can be an HTTP denial or a navigation error. */ }
    await page.route('https://www.threads.com/**', route => route.fulfill({ contentType: 'text/html', body: `<img src="${local}/image"><script>fetch('${local}/fetch').catch(()=>{}); location.href='${local}/redirect';</script>` }));
    try { await page.goto('https://www.threads.com/test', { timeout: 3000 }); } catch { /* Script may replace the fixture navigation. */ }
    await page.waitForTimeout(250);
    assert.equal(localRequests, 0);
    if (['darwin', 'linux'].includes(process.platform)) {
      const cdp = await browser.newBrowserCDPSession();
      const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
      const { stdout } = await promisify(execFile)('ps', ['eww', '-p', processInfo.map(p => p.id).join(','), '-o', 'command='], { maxBuffer: 4 * 1024 * 1024 });
      assert.ok(!stdout.includes('dummy-browser-isolation-key'));
    }
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
});
