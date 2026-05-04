#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Loc = { lat: number | null; lng: number | null; name: string; text?: string };
type Music = { track: string; artist: string; title: string };
type Weather = { icon: string; tempC: number; note?: string };
type Transport = { mode: string; from: string; to: string };

type Day = {
  date: string;
  title: string;
  caption: string;
  location: Loc | null;
  photos: string[];
  videos: string[];
  tags?: string[];
  transport?: Transport[];
};

type Entry = {
  id: string;
  date: string;
  type: "date" | "trip" | "milestone" | "special";
  title: string;
  caption: string;
  location: Loc | null;
  photos: string[];
  music: Music | null;
  weather: Weather | null;
  videos: string[];
  tags: string[];
  transport?: Transport[];
  days?: Day[];
  tripStart?: string;
  tripEnd?: string;
  linkedTo?: string;
  relatedNote?: string;
  attachments?: string[];
};

const FILES = ["memories-2024.json", "memories-2025.json", "memories-2026.json"];
const DATA_DIR = join(import.meta.dir, "..", "data");

function unionTags(a: string[] = [], b: string[] = []): string[] {
  return [...new Set([...a, ...b])];
}

// Day.date sometimes carries a manual `-N` suffix (e.g. "2024-11-01-2") to
// disambiguate same-day entries. Strip it back to ISO; id-collision handles uniqueness.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
function isoDate(d: string): string {
  const m = d.match(ISO_DATE);
  return m ? m[0] : d;
}

function dayToEntry(day: Day): Entry {
  const date = isoDate(day.date);
  return {
    id: date,
    date,
    type: "trip",
    title: day.title,
    caption: day.caption,
    location: day.location,
    photos: day.photos ?? [],
    music: null,
    weather: null,
    videos: day.videos ?? [],
    tags: day.tags ?? [],
    ...(day.transport ? { transport: day.transport } : {}),
  };
}

function mergeParentInto(day: Entry, parent: Entry): Entry {
  return {
    ...day,
    id: parent.id,
    music: parent.music ?? day.music,
    weather: parent.weather ?? day.weather,
    transport: parent.transport ?? day.transport,
    tags: unionTags(parent.tags, day.tags),
  };
}

function stripTripDates(e: Entry): Entry {
  const { tripStart, tripEnd, ...rest } = e;
  void tripStart; void tripEnd;
  return rest as Entry;
}

function disambiguateIds(entries: Entry[]): void {
  const seen = new Map<string, number>();
  for (const e of entries) {
    const n = (seen.get(e.id) ?? 0) + 1;
    seen.set(e.id, n);
    if (n > 1) e.id = `${e.id}-${n}`;
  }
}

let totalExpanded = 0;
let totalNewEntries = 0;

for (const file of FILES) {
  const path = join(DATA_DIR, file);
  const raw: Entry[] = JSON.parse(readFileSync(path, "utf-8"));
  const out: Entry[] = [];
  let touched = false;

  for (const entry of raw) {
    if (!entry.days || entry.days.length === 0) {
      out.push(stripTripDates(entry));
      continue;
    }
    touched = true;
    totalExpanded++;

    const parentDate = entry.date;
    const { days, ...parentSansDays } = entry;
    void days;
    const parent = stripTripDates(parentSansDays as Entry);

    let absorbed = false;
    for (const day of entry.days) {
      let dayEntry = dayToEntry(day);
      if (!absorbed && day.date === parentDate) {
        dayEntry = mergeParentInto(dayEntry, parent);
        absorbed = true;
      }
      out.push(dayEntry);
      totalNewEntries++;
    }
    if (!absorbed) {
      // Parent date didn't match any day; keep the parent as a separate entry.
      out.push({ ...parent, days: undefined } as Entry);
    }
    console.log(`  ↳ ${file}  ${entry.id}: expanded ${entry.days.length} day(s)${absorbed ? " (parent merged)" : " (parent kept)"}`);
  }

  // Sort by date asc, stable
  out.sort((a, b) => a.date.localeCompare(b.date));
  disambiguateIds(out);

  if (touched) {
    writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
    console.log(`${file}: wrote ${out.length} entries`);
  } else {
    console.log(`${file}: no changes (${raw.length} entries)`);
  }
}

console.log(`\nExpanded ${totalExpanded} trip(s) into ${totalNewEntries} day-entries.`);
