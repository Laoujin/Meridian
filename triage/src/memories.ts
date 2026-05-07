import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Memory } from '@meridian/schema';

const MEMORIES_RX = /^memories(?:-[A-Za-z0-9_-]+)?\.json$/;

export interface Origin {
  fileById: Map<string, string>;
  files: string[];
}

export async function loadAll(dataDir: string): Promise<{ entries: Memory[]; origin: Origin }> {
  if (!existsSync(dataDir)) return { entries: [], origin: { fileById: new Map(), files: [] } };
  const files = (await readdir(dataDir)).filter(n => MEMORIES_RX.test(n)).sort();
  const entries: Memory[] = [];
  const fileById = new Map<string, string>();
  for (const file of files) {
    const list = JSON.parse(await readFile(join(dataDir, file), 'utf-8')) as Memory[];
    for (const m of list) {
      entries.push(m);
      fileById.set(m.id, file);
    }
  }
  return { entries, origin: { fileById, files } };
}

// Where a brand-new entry should land. Prefer the consolidated memories.json
// when it already exists; otherwise fall back to per-year sharding.
export function pickTargetFile(origin: Origin, year: string): string {
  if (origin.files.includes('memories.json')) return 'memories.json';
  return `memories-${year}.json`;
}

export async function saveAll(dataDir: string, entries: Memory[], origin: Origin): Promise<void> {
  const buckets = new Map<string, Memory[]>();
  for (const file of origin.files) buckets.set(file, []);

  for (const m of entries) {
    const year = m.date.slice(0, 4);
    const target = origin.fileById.get(m.id) ?? pickTargetFile(origin, year);
    if (!buckets.has(target)) {
      buckets.set(target, []);
      origin.files.push(target);
    }
    buckets.get(target)!.push(m);
    origin.fileById.set(m.id, target);
  }

  for (const [file, list] of buckets) {
    await writeFile(join(dataDir, file), JSON.stringify(list, null, 2) + '\n');
  }
}
