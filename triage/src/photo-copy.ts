import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function isSafeName(name: string): boolean {
  return name.length > 0 && name.length < 256
    && !name.includes('/') && !name.includes('\\') && !name.includes('..');
}

export async function copyToPhotosFull(srcDir: string, name: string, dstDir: string): Promise<void> {
  if (!isSafeName(name)) throw new Error(`Invalid filename: ${name}`);
  const srcPath = join(srcDir, name);
  if (!existsSync(srcPath)) throw new Error(`Source missing: ${name}`);
  await mkdir(dstDir, { recursive: true });
  const dstPath = join(dstDir, name);
  if (existsSync(dstPath)) return; // idempotent
  await copyFile(srcPath, dstPath);
}
