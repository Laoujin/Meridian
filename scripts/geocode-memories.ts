#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Loc = { lat: number; lng: number; name: string };
type Entry = { location?: Loc; days?: Entry[]; title?: string; id?: string };

const FILES = ["memories-2024.json", "memories-2025.json", "memories-2026.json"];
const DATA_DIR = join(import.meta.dir, "..", "data");
const UA = "meridian-memories-geocoder/1.0 (personal project)";

const cache = new Map<string, { lat: number; lng: number } | null>();
const failures: { file: string; id?: string; title?: string; name: string }[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(name: string): Promise<{ lat: number; lng: number } | null> {
  if (cache.has(name)) return cache.get(name)!;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(name)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      cache.set(name, null);
      return null;
    }
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) {
      cache.set(name, null);
      return null;
    }
    const hit = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    cache.set(name, hit);
    return hit;
  } catch {
    cache.set(name, null);
    return null;
  } finally {
    // Nominatim usage policy: ≤1 req/s
    await sleep(1100);
  }
}

async function processEntry(entry: Entry, file: string) {
  if (entry.location?.name) {
    const hit = await geocode(entry.location.name);
    if (hit) {
      entry.location.lat = hit.lat;
      entry.location.lng = hit.lng;
    } else {
      failures.push({ file, id: entry.id, title: entry.title, name: entry.location.name });
    }
  }
  if (entry.days) {
    for (const day of entry.days) await processEntry(day, file);
  }
}

for (const file of FILES) {
  const path = join(DATA_DIR, file);
  const entries: Entry[] = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`\n${file}: ${entries.length} entries`);
  for (const entry of entries) await processEntry(entry, file);
  writeFileSync(path, JSON.stringify(entries, null, 2) + "\n");
  console.log(`  ✓ written`);
}

console.log(`\nUnique addresses queried: ${cache.size}`);
console.log(`Cache hits for null: ${[...cache.values()].filter((v) => v === null).length}`);

if (failures.length) {
  console.log(`\n❌ Failed (${failures.length}):`);
  for (const f of failures) {
    console.log(`  ${f.file}  ${f.id ?? ""}  "${f.title ?? ""}"  → ${f.name}`);
  }
} else {
  console.log(`\n✅ all resolved`);
}
