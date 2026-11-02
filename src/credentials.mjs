import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

export function browserEnvironment(env = process.env) {
  const allowed = ['HOME', 'PATH', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'DISPLAY', 'XAUTHORITY', 'WAYLAND_DISPLAY', 'XDG_RUNTIME_DIR', 'SystemRoot', 'WINDIR', 'USERPROFILE', 'LOCALAPPDATA'];
  return Object.fromEntries(allowed.filter(key => env[key] !== undefined).map(key => [key, env[key]]));
}

export async function loadApiKey({ env = process.env, file = '.env' } = {}) {
  const injected = env.OPENAI_API_KEY?.trim();
  delete env.OPENAI_API_KEY;
  if (injected) return injected;
  let contents;
  try {
    contents = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot read .env. Check its file permissions.');
  }
  const key = parseEnv(contents ?? '').OPENAI_API_KEY?.trim();
  if (!key) throw new Error('Create .env with OPENAI_API_KEY set to a dedicated, restricted, revocable API key.');
  return key;
}
