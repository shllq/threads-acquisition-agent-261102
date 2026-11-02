import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const makefile = fileURLToPath(new URL('../Makefile', import.meta.url));
const url = 'https://www.threads.com/@faustforgame/post/DfN8AZNkm-I';
async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'threads-make-'));
  const bin = join(directory, 'bin');
  await mkdir(bin);
  await writeFile(join(bin, 'npm'), '#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2)));\n', { mode: 0o755 });
  await writeFile(join(bin, 'date'), '#!/bin/sh\n[ "$1" = "+%Y%m%d-%H%M%S" ] || exit 1\nprintf "20261102-143045\\n"\n', { mode: 0o755 });
  const make = (...goals) => spawnSync('make', ['--no-print-directory', '-f', makefile, ...goals], {
    cwd: directory, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8'
  });
  try { await run(make, directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('make agent URL requests all fields and creates a stage/timestamp artifact directory', async () => {
  await fixture(async (make, directory) => {
    const result = make('agent', url);
    assert.equal(result.status, 0, result.stderr);
    const args = JSON.parse(result.stdout);
    assert.deepEqual(args.slice(0, 4), ['run', '--silent', 'agent', '--']);
    assert.match(args[4], /個人檔案名稱、追蹤者數量、貼文內容及續文/);
    assert.ok(args[4].endsWith(url));
    assert.equal(args[5], 'artifacts/agent-20261102-143045');
    assert.ok((await stat(join(directory, args[5]))).isDirectory());
    const repeated = make('agent', url);
    assert.notEqual(repeated.status, 0);
    assert.equal(repeated.stdout, '');
  });
});

test('make acquire/probe pass URLs unchanged and make test runs the existing suite', async () => {
  await fixture(async make => {
    for (const stage of ['acquire', 'probe']) {
      const result = make(stage, url);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), ['run', '--silent', stage, '--', url, `artifacts/${stage}-20261102-143045`]);
    }
    const result = make('test');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), ['test']);
    const queryUrl = `${url}?x=1&y=two`;
    const queried = make('agent', `URL=${queryUrl}`);
    assert.equal(queried.status, 0, queried.stderr);
    assert.ok(JSON.parse(queried.stdout)[4].endsWith(queryUrl));
    assert.notEqual(make('agent').status, 0);
    assert.notEqual(make('agent', url, 'https://www.threads.com/share/OTHER/').status, 0);
  });
});
