import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadAll, saveAll, pickTargetFile } from '../src/memories';
import type { Memory } from '@meridian/schema';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mem-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const mk = (id: string, date = '2026-01-01'): Memory => ({
  id, date, type: 'date', title: '', caption: '',
  location: null, photos: [], music: null, weather: null, videos: [], tags: [],
});

describe('loadAll', () => {
  it('returns empty when dataDir missing', async () => {
    const r = await loadAll(join(dir, 'nope'));
    expect(r.entries).toEqual([]);
    expect(r.origin.files).toEqual([]);
  });

  it('reads consolidated memories.json', async () => {
    writeFileSync(join(dir, 'memories.json'), JSON.stringify([mk('a'), mk('b', '2024-06-01')]));
    const r = await loadAll(dir);
    expect(r.entries.map(m => m.id)).toEqual(['a', 'b']);
    expect(r.origin.fileById.get('a')).toBe('memories.json');
    expect(r.origin.fileById.get('b')).toBe('memories.json');
    expect(r.origin.files).toEqual(['memories.json']);
  });

  it('reads sharded memories-YYYY.json', async () => {
    writeFileSync(join(dir, 'memories-2024.json'), JSON.stringify([mk('x', '2024-01-01')]));
    writeFileSync(join(dir, 'memories-2026.json'), JSON.stringify([mk('y', '2026-01-01')]));
    const r = await loadAll(dir);
    expect(r.entries.map(m => m.id).sort()).toEqual(['x', 'y']);
    expect(r.origin.fileById.get('x')).toBe('memories-2024.json');
    expect(r.origin.fileById.get('y')).toBe('memories-2026.json');
  });

  it('merges multiple memories*.json files', async () => {
    writeFileSync(join(dir, 'memories.json'), JSON.stringify([mk('a')]));
    writeFileSync(join(dir, 'memories-2024.json'), JSON.stringify([mk('b', '2024-06-01')]));
    const r = await loadAll(dir);
    expect(r.entries.map(m => m.id).sort()).toEqual(['a', 'b']);
    expect(r.origin.fileById.get('a')).toBe('memories.json');
    expect(r.origin.fileById.get('b')).toBe('memories-2024.json');
  });

  it('ignores non-matching files', async () => {
    writeFileSync(join(dir, 'memories.json'), JSON.stringify([mk('a')]));
    writeFileSync(join(dir, 'story.json'), '{}');
    writeFileSync(join(dir, 'other.json'), '[]');
    const r = await loadAll(dir);
    expect(r.entries.map(m => m.id)).toEqual(['a']);
    expect(r.origin.files).toEqual(['memories.json']);
  });
});

describe('pickTargetFile', () => {
  it('prefers consolidated memories.json when present', () => {
    const origin = { fileById: new Map(), files: ['memories.json', 'memories-2024.json'] };
    expect(pickTargetFile(origin, '2026')).toBe('memories.json');
  });

  it('falls back to memories-YYYY.json otherwise', () => {
    const origin = { fileById: new Map(), files: ['memories-2024.json'] };
    expect(pickTargetFile(origin, '2026')).toBe('memories-2026.json');
  });

  it('uses memories-YYYY.json on empty data dir', () => {
    const origin = { fileById: new Map(), files: [] };
    expect(pickTargetFile(origin, '2026')).toBe('memories-2026.json');
  });
});

describe('saveAll', () => {
  it('writes back to original file (consolidated)', async () => {
    writeFileSync(join(dir, 'memories.json'), JSON.stringify([mk('a')]));
    const { entries, origin } = await loadAll(dir);
    entries[0].title = 'edited';
    await saveAll(dir, entries, origin);
    const list = JSON.parse(readFileSync(join(dir, 'memories.json'), 'utf-8'));
    expect(list[0].title).toBe('edited');
  });

  it('writes back to original file (sharded)', async () => {
    writeFileSync(join(dir, 'memories-2024.json'), JSON.stringify([mk('a', '2024-06-01')]));
    writeFileSync(join(dir, 'memories-2026.json'), JSON.stringify([mk('b', '2026-01-01')]));
    const { entries, origin } = await loadAll(dir);
    for (const m of entries) m.title = `t-${m.id}`;
    await saveAll(dir, entries, origin);
    const a = JSON.parse(readFileSync(join(dir, 'memories-2024.json'), 'utf-8'));
    const b = JSON.parse(readFileSync(join(dir, 'memories-2026.json'), 'utf-8'));
    expect(a[0].title).toBe('t-a');
    expect(b[0].title).toBe('t-b');
  });

  it('routes new entries to memories.json when present', async () => {
    writeFileSync(join(dir, 'memories.json'), JSON.stringify([mk('a')]));
    const { entries, origin } = await loadAll(dir);
    entries.push(mk('new', '2024-07-01'));
    await saveAll(dir, entries, origin);
    const list = JSON.parse(readFileSync(join(dir, 'memories.json'), 'utf-8'));
    expect(list.map((m: Memory) => m.id).sort()).toEqual(['a', 'new']);
    expect(existsSync(join(dir, 'memories-2024.json'))).toBe(false);
  });

  it('routes new entries to memories-YYYY.json in sharded mode', async () => {
    writeFileSync(join(dir, 'memories-2024.json'), JSON.stringify([mk('a', '2024-06-01')]));
    const { entries, origin } = await loadAll(dir);
    entries.push(mk('new', '2026-07-01'));
    await saveAll(dir, entries, origin);
    expect(existsSync(join(dir, 'memories-2026.json'))).toBe(true);
    const list = JSON.parse(readFileSync(join(dir, 'memories-2026.json'), 'utf-8'));
    expect(list.map((m: Memory) => m.id)).toEqual(['new']);
  });

  it('drops removed entries from their source file', async () => {
    writeFileSync(join(dir, 'memories.json'), JSON.stringify([mk('a'), mk('b')]));
    const { entries, origin } = await loadAll(dir);
    const kept = entries.filter(m => m.id !== 'b');
    await saveAll(dir, kept, origin);
    const list = JSON.parse(readFileSync(join(dir, 'memories.json'), 'utf-8'));
    expect(list.map((m: Memory) => m.id)).toEqual(['a']);
  });

  it('writes pretty-printed JSON with trailing newline', async () => {
    writeFileSync(join(dir, 'memories.json'), '[]');
    const { origin } = await loadAll(dir);
    await saveAll(dir, [mk('a')], origin);
    const text = readFileSync(join(dir, 'memories.json'), 'utf-8');
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('  "id"');
  });

  it('creates memories.json when data dir is empty', async () => {
    const { entries, origin } = await loadAll(dir);
    entries.push(mk('first', '2024-01-01'));
    await saveAll(dir, entries, origin);
    expect(existsSync(join(dir, 'memories-2024.json'))).toBe(true);
  });
});
