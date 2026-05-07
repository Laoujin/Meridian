import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { copyMedia } from '../src/photo-copy';

let src = '', photos = '', videos = '';
beforeEach(() => {
  src = mkdtempSync(join(tmpdir(), 'src-'));
  photos = mkdtempSync(join(tmpdir(), 'photos-'));
  videos = mkdtempSync(join(tmpdir(), 'videos-'));
});
afterEach(() => {
  rmSync(src, { recursive: true, force: true });
  rmSync(photos, { recursive: true, force: true });
  rmSync(videos, { recursive: true, force: true });
});

describe('copyMedia', () => {
  it('routes images to the photos dir', async () => {
    writeFileSync(join(src, 'a.jpg'), 'hello');
    await copyMedia(src, 'a.jpg', photos, videos);
    expect(readFileSync(join(photos, 'a.jpg'), 'utf-8')).toBe('hello');
    expect(existsSync(join(videos, 'a.jpg'))).toBe(false);
  });

  it('routes videos (.mp4) to the videos dir', async () => {
    writeFileSync(join(src, 'clip.mp4'), 'mov');
    await copyMedia(src, 'clip.mp4', photos, videos);
    expect(readFileSync(join(videos, 'clip.mp4'), 'utf-8')).toBe('mov');
    expect(existsSync(join(photos, 'clip.mp4'))).toBe(false);
  });

  it('routes videos (.mov) to the videos dir', async () => {
    writeFileSync(join(src, 'clip.MOV'), 'mov');
    await copyMedia(src, 'clip.MOV', photos, videos);
    expect(existsSync(join(videos, 'clip.MOV'))).toBe(true);
  });

  it('is idempotent — does not re-copy if exists', async () => {
    writeFileSync(join(src, 'a.jpg'), 'v1');
    await copyMedia(src, 'a.jpg', photos, videos);
    writeFileSync(join(src, 'a.jpg'), 'v2');
    await copyMedia(src, 'a.jpg', photos, videos);
    expect(readFileSync(join(photos, 'a.jpg'), 'utf-8')).toBe('v1');
  });

  it('creates destination dir if missing', async () => {
    rmSync(photos, { recursive: true, force: true });
    writeFileSync(join(src, 'a.jpg'), 'x');
    await copyMedia(src, 'a.jpg', photos, videos);
    expect(existsSync(join(photos, 'a.jpg'))).toBe(true);
  });

  it('throws when source file missing', async () => {
    await expect(copyMedia(src, 'missing.jpg', photos, videos)).rejects.toThrow(/missing/i);
  });

  it('rejects unsafe filenames', async () => {
    await expect(copyMedia(src, '../etc/passwd', photos, videos)).rejects.toThrow(/invalid/i);
    await expect(copyMedia(src, 'a/b.jpg', photos, videos)).rejects.toThrow(/invalid/i);
  });
});
