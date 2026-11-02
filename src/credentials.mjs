import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export function browserEnvironment(env = process.env) {
  const allowed = ['HOME', 'PATH', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'DISPLAY', 'XAUTHORITY', 'WAYLAND_DISPLAY', 'XDG_RUNTIME_DIR', 'SystemRoot', 'WINDIR', 'USERPROFILE', 'LOCALAPPDATA'];
  return Object.fromEntries(allowed.filter(key => env[key] !== undefined).map(key => [key, env[key]]));
}

export async function loadApiKey({ env = process.env, platform = process.platform, execute = promisify(execFile) } = {}) {
  const key = env.OPENAI_API_KEY?.trim();
  delete env.OPENAI_API_KEY;
  if (key) return key;
  if (platform !== 'darwin') throw new Error('Supply OPENAI_API_KEY through a trusted credential manager on this platform.');
  try {
    const { stdout } = await execute('/usr/bin/security', ['find-generic-password', '-s', 'threads-acquisition-agent', '-a', 'openai', '-w'], {
      env: browserEnvironment(env), timeout: 15_000, maxBuffer: 16_384
    });
    if (!stdout.trim()) throw new Error('Empty credential.');
    return stdout.trim();
  } catch {
    throw new Error('Cannot read the OpenAI key. In Keychain Access, add a generic password named threads-acquisition-agent with account openai, and allow access when prompted.');
  }
}
