#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Loc = { lat: number | null; lng: number | null; name: string };
type Weather = { note: string };
type Entry = {
  id?: string;
  title?: string;
  date: string;
  tripStart?: string;
  location: Loc | null;
  weather: Weather | null;
};

const FILES = ["memories-2024.json", "memories-2025.json", "memories-2026.json"];
const DATA_DIR = join(import.meta.dir, "..", "data");

// WMO weather code → Dutch label. https://open-meteo.com/en/docs (WMO Weather interpretation codes)
const WMO: Record<number, string> = {
  0: "Zonnig",
  1: "Meestal helder",
  2: "Half bewolkt",
  3: "Bewolkt",
  45: "Mistig",
  48: "Mistig",
  51: "Motregen",
  53: "Motregen",
  55: "Motregen",
  56: "IJzelende motregen",
  57: "IJzelende motregen",
  61: "Lichte regen",
  63: "Regen",
  65: "Hevige regen",
  66: "IJzel",
  67: "IJzel",
  71: "Lichte sneeuw",
  73: "Sneeuw",
  75: "Hevige sneeuw",
  77: "Sneeuwkorrels",
  80: "Lichte regenbuien",
  81: "Regenbuien",
  82: "Hevige regenbuien",
  85: "Sneeuwbuien",
  86: "Sneeuwbuien",
  95: "Onweer",
  96: "Onweer met hagel",
  99: "Onweer met hagel",
};

type ArchiveResponse = {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: (number | null)[];
  };
  error?: boolean;
  reason?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWeather(
  lat: number,
  lng: number,
  date: string,
): Promise<Weather | null> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weather_code,temperature_2m_max&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as ArchiveResponse;
  if (data.error) throw new Error(data.reason ?? "open-meteo error");
  const code = data.daily?.weather_code?.[0];
  const temp = data.daily?.temperature_2m_max?.[0];
  if (code == null) return null;
  const label = WMO[code] ?? `Code ${code}`;
  const note = temp == null ? label : `${label}, ${Math.round(temp)}°C`;
  return { note };
}

type Failure = { file: string; id: string; reason: string };
const failures: Failure[] = [];
let filled = 0;
let skipped = 0;

for (const file of FILES) {
  const path = join(DATA_DIR, file);
  const entries: Entry[] = JSON.parse(readFileSync(path, "utf-8"));
  let touched = 0;
  console.log(`\n${file}: ${entries.length} entries`);

  for (const entry of entries) {
    if (entry.weather !== null) continue;
    const lat = entry.location?.lat;
    const lng = entry.location?.lng;
    if (lat == null || lng == null) {
      skipped++;
      continue;
    }
    const date = entry.tripStart ?? entry.date;
    try {
      const w = await fetchWeather(lat, lng, date);
      if (!w) {
        failures.push({ file, id: entry.id ?? date, reason: "no data" });
        continue;
      }
      entry.weather = w;
      filled++;
      touched++;
      console.log(`  ✓ ${entry.id ?? date} → ${w.note}`);
    } catch (e) {
      failures.push({ file, id: entry.id ?? date, reason: String(e) });
      console.log(`  ✗ ${entry.id ?? date} → ${String(e).split("\n")[0]}`);
    }
    await sleep(150);
  }

  if (touched > 0) {
    writeFileSync(path, JSON.stringify(entries, null, 2) + "\n");
    console.log(`  → wrote ${touched} updates`);
  } else {
    console.log(`  → no changes`);
  }
}

console.log(
  `\nFilled: ${filled}   Skipped (no coords): ${skipped}   Failed: ${failures.length}`,
);
if (failures.length) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(`  ${f.file}  ${f.id}  → ${f.reason}`);
}
