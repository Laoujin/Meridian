import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export function setEnvVar(path: string, key: string, value: string): void {
  const text = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  const lines = text === '' ? [] : text.replace(/\n+$/, '').split('\n');
  const prefix = `${key}=`;
  const idx = lines.findIndex(l => l.trimStart().startsWith(prefix));
  if (idx >= 0) lines[idx] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  writeFileSync(path, lines.join('\n') + '\n');
}
