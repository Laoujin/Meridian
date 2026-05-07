import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listMusic } from '../src/music';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'music-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('listMusic', () => {
  it('returns sorted audio files', () => {
    mkdirSync(join(dir, 'music'));
    writeFileSync(join(dir, 'music', 'b.mp3'), '');
    writeFileSync(join(dir, 'music', 'a.flac'), '');
    writeFileSync(join(dir, 'music', 'c.m4a'), '');
    expect(listMusic(dir)).toEqual(['a.flac', 'b.mp3', 'c.m4a']);
  });

  it('skips non-audio files', () => {
    mkdirSync(join(dir, 'music'));
    writeFileSync(join(dir, 'music', 'song.mp3'), '');
    writeFileSync(join(dir, 'music', 'cover.jpg'), '');
    writeFileSync(join(dir, 'music', 'README.md'), '');
    expect(listMusic(dir)).toEqual(['song.mp3']);
  });

  it('returns empty when dataDir or music subdir missing', () => {
    expect(listMusic(dir)).toEqual([]);
    expect(listMusic(join(dir, 'nope'))).toEqual([]);
  });
});
