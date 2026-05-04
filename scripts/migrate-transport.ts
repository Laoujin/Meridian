#!/usr/bin/env bun
// One-shot: collapse `transport: [{mode, from, to}, ...]` to a single string
// using the last leg ("how you arrived"). Omit when result is 'car'.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILES = ["memories-2024.json", "memories-2025.json", "memories-2026.json"];
const DATA_DIR = join(import.meta.dir, "..", "data");
const ALLOWED = new Set(["car", "plane", "train", "metro", "walking", "boat", "bike", "bus"]);

type LegacyLeg = { mode: string; from?: string; to?: string };
type AnyEntry = { transport?: LegacyLeg[] | string; days?: AnyEntry[]; title?: string; date?: string };

let touched = 0;
const unmapped: { file: string; title?: string; mode: string }[] = [];

function migrate(entry: AnyEntry, file: string) {
  if (Array.isArray(entry.transport)) {
    const legs = entry.transport;
    const last = legs[legs.length - 1];
    let mode = last?.mode ?? "car";
    if (!ALLOWED.has(mode)) {
      unmapped.push({ file, title: entry.title, mode });
      // train was already in ALLOWED; anything else (bus/boat/walk/bike) falls back to car
      mode = "car";
    }
    if (mode === "car") delete entry.transport;
    else entry.transport = mode;
    touched++;
  }
  if (Array.isArray(entry.days)) for (const d of entry.days) migrate(d, file);
}

for (const file of FILES) {
  const path = join(DATA_DIR, file);
  const entries: AnyEntry[] = JSON.parse(readFileSync(path, "utf-8"));
  for (const e of entries) migrate(e, file);
  writeFileSync(path, JSON.stringify(entries, null, 2) + "\n");
  console.log(`✓ ${file}`);
}

console.log(`\nMigrated ${touched} entries.`);
if (unmapped.length) {
  console.log(`\n⚠ Unmapped modes (collapsed to car):`);
  for (const u of unmapped) console.log(`  ${u.file}  "${u.title ?? ""}"  → ${u.mode}`);
}
