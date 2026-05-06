import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Memory } from '@meridian/schema';

const YEAR_RX = /^memories-(\d{4})\.json$/;

export async function listYears(dataDir: string): Promise<string[]> {
  if (!existsSync(dataDir)) return [];
  const entries = await readdir(dataDir);
  const years: string[] = [];
  for (const name of entries) {
    const m = name.match(YEAR_RX);
    if (m) years.push(m[1]);
  }
  return years.sort();
}

export async function readYear(dataDir: string, year: string): Promise<Memory[]> {
  const path = join(dataDir, `memories-${year}.json`);
  if (!existsSync(path)) return [];
  return JSON.parse(await readFile(path, 'utf-8'));
}

export async function writeYear(dataDir: string, year: string, memories: Memory[]): Promise<void> {
  if (!/^\d{4}$/.test(year)) throw new Error(`Invalid year: ${year}`);
  const path = join(dataDir, `memories-${year}.json`);
  await writeFile(path, JSON.stringify(memories, null, 2) + '\n');
}
