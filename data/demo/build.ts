#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type WeatherIcon =
  | "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle"
  | "rain" | "rain-heavy" | "snow" | "storm";

const WMO_ICON: Record<number, WeatherIcon> = {
  0: "sun",
  1: "cloud-sun", 2: "cloud-sun",
  3: "cloud",
  45: "fog", 48: "fog",
  51: "drizzle", 53: "drizzle", 55: "drizzle", 56: "drizzle", 57: "drizzle",
  61: "rain", 63: "rain",
  65: "rain-heavy", 66: "rain", 67: "rain-heavy",
  71: "snow", 73: "snow", 75: "snow", 77: "snow",
  80: "rain", 81: "rain", 82: "rain-heavy",
  85: "snow", 86: "snow",
  95: "storm", 96: "storm", 99: "storm",
};

type Entry = {
  id: string;
  date: string;
  location: { lat: number; lng: number; name: string };
  weather: { icon: WeatherIcon; tempC: number; note?: string };
};

const PATH = join(import.meta.dir, "memories.json");
const memories: Entry[] = JSON.parse(readFileSync(PATH, "utf-8"));

async function fetchWeather(lat: number, lng: number, date: string) {
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weather_code,temperature_2m_max&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    daily?: { weather_code: number[]; temperature_2m_max: (number | null)[] };
  };
  const code = data.daily?.weather_code?.[0];
  const temp = data.daily?.temperature_2m_max?.[0];
  if (code == null || temp == null) throw new Error("no data");
  return { icon: WMO_ICON[code] ?? "cloud", tempC: Math.round(temp) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const m of memories) {
  const w = await fetchWeather(m.location.lat, m.location.lng, m.date);
  m.weather = w;
  console.log(`  ${m.id}  ${m.date}  →  ${w.icon} ${w.tempC}°C`);
  await sleep(150);
}

writeFileSync(PATH, JSON.stringify(memories, null, 2) + "\n");
console.log(`\nWrote ${memories.length} entries to ${PATH}`);
