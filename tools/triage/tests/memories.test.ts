import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listYears, readYear, writeYear } from '../src/memories';
import type { Memory } from '@meridian/schema';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mem-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const mk = (id: string): Memory => ({
  id, date: '2026-01-01', type: 'date', title: '', caption: '',
  location: null, photos: [], music: null, weather: null, videos: [], tags: [],
});

describe('listYears', () => {
  it('returns years from memories-YYYY.json files', async () => {
    writeFileSync(join(dir, 'memories-2024.json'), '[]');
    writeFileSync(join(dir, 'memories-2026.json'), '[]');
    writeFileSync(join(dir, 'memories-not-a-year.json'), '[]');
    writeFileSync(join(dir, 'other.json'), '[]');
    expect(await listYears(dir)).toEqual(['2024', '2026']);
  });

  it('returns empty when no matching files', async () => {
    expect(await listYears(dir)).toEqual([]);
  });
});

describe('readYear', () => {
  it('parses memories-YYYY.json', async () => {
    writeFileSync(join(dir, 'memories-2024.json'), JSON.stringify([mk('a')]));
    const r = await readYear(dir, '2024');
    expect(r).toEqual([mk('a')]);
  });

  it('returns empty array when file missing', async () => {
    expect(await readYear(dir, '2099')).toEqual([]);
  });
});

describe('writeYear', () => {
  it('writes pretty-printed JSON with trailing newline', async () => {
    await writeYear(dir, '2025', [mk('a')]);
    const path = join(dir, 'memories-2025.json');
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, 'utf-8');
    expect(text.endsWith('\n')).toBe(true);
    expect(JSON.parse(text)).toEqual([mk('a')]);
    expect(text).toContain('  "id"'); // pretty-printed (2-space indent)
  });

  it('rejects invalid year', async () => {
    await expect(writeYear(dir, 'bogus', [])).rejects.toThrow(/year/i);
  });
});
