import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { copyToPhotosFull } from '../src/photo-copy';

let src = '', dst = '';
beforeEach(() => {
  src = mkdtempSync(join(tmpdir(), 'src-'));
  dst = mkdtempSync(join(tmpdir(), 'dst-'));
});
afterEach(() => {
  rmSync(src, { recursive: true, force: true });
  rmSync(dst, { recursive: true, force: true });
});

describe('copyToPhotosFull', () => {
  it('copies file from source to destination', async () => {
    writeFileSync(join(src, 'a.jpg'), 'hello');
    await copyToPhotosFull(src, 'a.jpg', dst);
    expect(readFileSync(join(dst, 'a.jpg'), 'utf-8')).toBe('hello');
  });

  it('is idempotent — does not re-copy if exists', async () => {
    writeFileSync(join(src, 'a.jpg'), 'v1');
    await copyToPhotosFull(src, 'a.jpg', dst);
    writeFileSync(join(src, 'a.jpg'), 'v2'); // change source
    await copyToPhotosFull(src, 'a.jpg', dst);
    expect(readFileSync(join(dst, 'a.jpg'), 'utf-8')).toBe('v1'); // unchanged
  });

  it('creates destination dir if missing', async () => {
    rmSync(dst, { recursive: true, force: true });
    writeFileSync(join(src, 'a.jpg'), 'x');
    await copyToPhotosFull(src, 'a.jpg', dst);
    expect(existsSync(join(dst, 'a.jpg'))).toBe(true);
  });

  it('throws when source file missing', async () => {
    await expect(copyToPhotosFull(src, 'missing.jpg', dst)).rejects.toThrow(/missing/i);
  });

  it('rejects unsafe filenames', async () => {
    await expect(copyToPhotosFull(src, '../etc/passwd', dst)).rejects.toThrow(/invalid/i);
    await expect(copyToPhotosFull(src, 'a/b.jpg', dst)).rejects.toThrow(/invalid/i);
  });
});
