#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type WeatherIcon =
  | "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle"
  | "rain" | "rain-heavy" | "snow" | "storm";

type Loc = { lat: number | null; lng: number | null; name: string };
type Weather = { icon: WeatherIcon; tempC: number; note?: string };
// Legacy shape encountered in older data: { note: string }
type AnyWeather = Weather | { note: string } | string | null;
type Entry = {
  id?: string;
  title?: string;
  date: string;
  tripStart?: string;
  location: Loc | null;
  weather: AnyWeather;
};

const FILES = ["memories-2024.json", "memories-2025.json", "memories-2026.json"];
const DATA_DIR = join(import.meta.dir, "..", "data");

// WMO weather code → app icon. https://open-meteo.com/en/docs
const WMO_ICON: Record<number, WeatherIcon> = {
  0: "sun",
  1: "cloud-sun",
  2: "cloud-sun",
  3: "cloud",
  45: "fog", 48: "fog",
  51: "drizzle", 53: "drizzle", 55: "drizzle",
  56: "drizzle", 57: "drizzle",
  61: "rain", 63: "rain",
  65: "rain-heavy",
  66: "rain", 67: "rain-heavy",
  71: "snow", 73: "snow", 75: "snow", 77: "snow",
  80: "rain", 81: "rain", 82: "rain-heavy",
  85: "snow", 86: "snow",
  95: "storm", 96: "storm", 99: "storm",
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
  lat: number, lng: number, date: string,
): Promise<{ icon: WeatherIcon; tempC: number } | null> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weather_code,temperature_2m_max&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as ArchiveResponse;
  if (data.error) throw new Error(data.reason ?? "open-meteo error");
  const code = data.daily?.weather_code?.[0];
  const temp = data.daily?.temperature_2m_max?.[0];
  if (code == null || temp == null) return null;
  return { icon: WMO_ICON[code] ?? "cloud", tempC: Math.round(temp) };
}

// Auto-generated notes from the previous backfill look like "Motregen, 18°C".
// Hand-written notes ("Het was vree warm", "Sneeuw") never contain "°C".
const AUTO_NOTE = /,\s*-?\d+°C\s*$/;

function preservedNote(w: AnyWeather): string | undefined {
  if (w == null) return undefined;
  const text = typeof w === "string" ? w : "note" in w ? w.note : undefined;
  if (!text || AUTO_NOTE.test(text)) return undefined;
  return text;
}

function alreadyMigrated(w: AnyWeather): w is Weather {
  return !!w && typeof w === "object" && "icon" in w && "tempC" in w;
}

type Failure = { file: string; id: string; reason: string };
const failures: Failure[] = [];
let filled = 0;
let skipped = 0;
let alreadyOk = 0;

for (const file of FILES) {
  const path = join(DATA_DIR, file);
  const entries: Entry[] = JSON.parse(readFileSync(path, "utf-8"));
  let touched = 0;
  console.log(`\n${file}: ${entries.length} entries`);

  for (const entry of entries) {
    if (alreadyMigrated(entry.weather)) { alreadyOk++; continue; }
    const lat = entry.location?.lat;
    const lng = entry.location?.lng;
    if (lat == null || lng == null) { skipped++; continue; }

    const date = entry.tripStart ?? entry.date;
    const note = preservedNote(entry.weather);
    try {
      const w = await fetchWeather(lat, lng, date);
      if (!w) {
        failures.push({ file, id: entry.id ?? date, reason: "no data" });
        continue;
      }
      entry.weather = note ? { ...w, note } : w;
      filled++;
      touched++;
      const tag = note ? ` (note kept: "${note}")` : "";
      console.log(`  ✓ ${entry.id ?? date} → ${w.icon} ${w.tempC}°C${tag}`);
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
  `\nFilled: ${filled}   Already migrated: ${alreadyOk}   Skipped (no coords): ${skipped}   Failed: ${failures.length}`,
);
if (failures.length) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(`  ${f.file}  ${f.id}  → ${f.reason}`);
}
