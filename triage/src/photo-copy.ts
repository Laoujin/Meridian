import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const VIDEO_RX = /\.(mp4|mov)$/i;

function isSafeName(name: string): boolean {
  return name.length > 0 && name.length < 256
    && !name.includes('/') && !name.includes('\\') && !name.includes('..');
}

export async function copyMedia(srcDir: string, name: string, photosDir: string, videosDir: string): Promise<void> {
  if (!isSafeName(name)) throw new Error(`Invalid filename: ${name}`);
  const srcPath = join(srcDir, name);
  if (!existsSync(srcPath)) throw new Error(`Source missing: ${name}`);
  const dstDir = VIDEO_RX.test(name) ? videosDir : photosDir;
  await mkdir(dstDir, { recursive: true });
  const dstPath = join(dstDir, name);
  if (existsSync(dstPath)) return;
  await copyFile(srcPath, dstPath);
}
