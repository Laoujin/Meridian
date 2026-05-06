# Claude C — Demo Content + Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public-facing demo dataset (`data/demo/`) and a single-page marketing site (`marketing/`) so a stranger cloning the Meridian repo can understand and try it in <30 seconds.

**Architecture:**
- `data/demo/memories.json` — hand-authored Memory[] for a fake 5-day NY trip (2024-09-23 → 2024-09-27), 10 entries with real coordinates and real Open-Meteo historical weather. A small reproducibility script (`data/demo/build.ts`) calls Open-Meteo to fill the `weather` field; placeholder watercolour JPGs are generated programmatically with the documented AI prompt for later replacement.
- `marketing/index.html` — plain HTML/CSS/JS, no build step, deployable as a GitHub Pages source. Reuses the app's peach accent (`#e8836b`) + Caveat/Inter fonts.

**Tech Stack:**
- TypeScript + bun (for `build.ts` and tests via `bun test`)
- ImageMagick `convert` (for placeholder image generation)
- Plain HTML + vanilla CSS + minimal JS (no framework, no build)
- Open-Meteo Archive API (`https://archive-api.open-meteo.com/v1/archive`)

**Working assumptions** (flag at start; ask if any are wrong):
1. Trip window: **2024-09-23 → 2024-09-27** (5 days). Real historical weather will be looked up.
2. Rebrand name: **Meridian** (per spec coordination note).
3. Watercolour images: **Wouter generates them in Midjourney**. Claude C's deliverable is a set of detailed, cohesive-palette Midjourney prompts in `data/demo/README.md`, plus tiny solid-colour stub JPGs at the right filenames so the schema test passes; Wouter drops the real MJ output over the stubs.
4. Hand-author memory entries (do not depend on Claude B's `meridian-triage` CLI being ready).
5. Music field: omit (`null`). Adding real Spotify metadata is scope creep.
6. Acceptance check "app renders the 10 entries cleanly" is **manual visual verification** by Wouter — Claude C's lane forbids modifying `app/src/data/loader.ts`, so we cannot wire up an automated end-to-end test that loads `data/demo/memories.json` from disk.

---

## File Structure

```
data/demo/
  memories.json                       # Memory[] — hand-authored, weather filled by build.ts
  build.ts                            # one-shot Open-Meteo weather fetcher
  photos/
    01-jfk-arrival.jpg
    02-hotel-checkin.jpg
    03-first-night-dinner.jpg
    04-liberty-by-boat.jpg
    05-times-square.jpg
    06-central-park.jpg
    07-brooklyn-bridge.jpg
    08-moma.jpg
    09-final-dinner.jpg
    10-wheels-up.jpg
  README.md                           # what this is + AI image-gen prompt + how to regenerate
  __tests__/
    memories.test.ts                  # schema + integrity test (bun test)
marketing/
  index.html
  styles.css
  README.md                           # GitHub Pages deploy instructions
  __tests__/
    structure.test.ts                 # asserts required sections exist (bun test)
```

**Responsibility split:**
- `memories.json` is the artifact; `build.ts` is reproducibility. They are decoupled — `memories.json` is checked in fully populated, `build.ts` is for regeneration.
- `__tests__/` validates the artifact, not the script. Tests are runnable with `cd data/demo && bun test` or `cd marketing && bun test`.
- Marketing CSS lives in `styles.css` (separate file), not inline, so a fork can restyle by touching one file.

---

## Task 1: Scaffold directories + Memory schema validation test (TDD red)

**Files:**
- Create: `data/demo/__tests__/memories.test.ts`
- Create: `data/demo/photos/.gitkeep` (so empty dir is committable)

- [ ] **Step 1: Create directories**

```bash
mkdir -p data/demo/__tests__ data/demo/photos marketing/__tests__
touch data/demo/photos/.gitkeep
```

- [ ] **Step 2: Write the schema validation test**

Create `data/demo/__tests__/memories.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type TransportMode = "car" | "plane" | "train" | "metro" | "walking" | "boat" | "bike" | "bus";
type WeatherIcon = "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "rain-heavy" | "snow" | "storm";

interface Memory {
  id: string;
  date: string;
  type: "date" | "trip" | "milestone" | "special";
  title: string;
  caption: string;
  location: { lat: number | null; lng: number | null; name: string; text?: string } | null;
  photos: string[];
  music: { track: string; artist: string; title: string } | null;
  weather: { icon: WeatherIcon; tempC: number; note?: string } | null;
  videos: string[];
  tags: string[];
  emojis?: string[];
  transport?: TransportMode;
}

const ROOT = join(import.meta.dir, "..");
const memories: Memory[] = JSON.parse(readFileSync(join(ROOT, "memories.json"), "utf-8"));

const VALID_TRANSPORT: TransportMode[] = ["car", "plane", "train", "metro", "walking", "boat", "bike", "bus"];
const VALID_ICONS: WeatherIcon[] = ["sun", "cloud-sun", "cloud", "fog", "drizzle", "rain", "rain-heavy", "snow", "storm"];

describe("data/demo/memories.json", () => {
  test("contains exactly 10 entries", () => {
    expect(memories).toHaveLength(10);
  });

  test("entries are sorted chronologically", () => {
    const dates = memories.map((m) => m.date);
    expect([...dates].sort()).toEqual(dates);
  });

  test("each entry has populated required fields", () => {
    for (const m of memories) {
      expect(m.id, `${m.id}: id`).toBeTruthy();
      expect(m.date, `${m.id}: date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.title, `${m.id}: title`).toBeTruthy();
      expect(m.caption, `${m.id}: caption`).toBeTruthy();
      expect(m.location, `${m.id}: location`).not.toBeNull();
      expect(m.location!.lat, `${m.id}: lat`).toBeTypeOf("number");
      expect(m.location!.lng, `${m.id}: lng`).toBeTypeOf("number");
      expect(m.location!.name, `${m.id}: location.name`).toBeTruthy();
      expect(m.weather, `${m.id}: weather`).not.toBeNull();
      expect(VALID_ICONS).toContain(m.weather!.icon);
      expect(m.weather!.tempC, `${m.id}: tempC`).toBeTypeOf("number");
      expect(m.photos.length, `${m.id}: photos`).toBeGreaterThan(0);
      expect(m.transport, `${m.id}: transport`).toBeDefined();
      expect(VALID_TRANSPORT).toContain(m.transport!);
    }
  });

  test("each photo reference resolves to a file in photos/", () => {
    for (const m of memories) {
      for (const photo of m.photos) {
        const path = join(ROOT, "photos", photo);
        expect(existsSync(path), `${m.id}: missing photo ${photo}`).toBe(true);
      }
    }
  });

  test("all coordinates are within NYC bounding box", () => {
    for (const m of memories) {
      const { lat, lng } = m.location!;
      expect(lat, `${m.id}: lat`).toBeGreaterThan(40.4);
      expect(lat, `${m.id}: lat`).toBeLessThan(41.0);
      expect(lng, `${m.id}: lng`).toBeGreaterThan(-74.3);
      expect(lng, `${m.id}: lng`).toBeLessThan(-73.6);
    }
  });
});
```

- [ ] **Step 3: Run the test — confirm it fails**

```bash
cd data/demo && bun test
```

Expected: FAIL — `memories.json` does not exist yet (read error).

- [ ] **Step 4: Commit**

```bash
git add data/demo/__tests__/memories.test.ts data/demo/photos/.gitkeep
git commit -m "test: add demo dataset schema validation"
```

---

## Task 2: Author memories.json (skeleton, no weather)

**Files:**
- Create: `data/demo/memories.json`

- [ ] **Step 1: Write the 10-entry skeleton**

Create `data/demo/memories.json` with the exact content below. Coordinates are real, hand-checked landmark positions. Weather is filled with placeholder values that `build.ts` will overwrite in Task 3.

```json
[
  {
    "id": "demo-2024-09-23-1",
    "date": "2024-09-23",
    "type": "trip",
    "title": "Wheels down at JFK",
    "caption": "Skyline glimpsed through the AirTrain window — the city is louder than expected.",
    "location": { "lat": 40.6413, "lng": -73.7781, "name": "JFK Airport, Queens, NY" },
    "photos": ["01-jfk-arrival.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["arrival", "travel-day"],
    "emojis": ["✈️"],
    "transport": "plane"
  },
  {
    "id": "demo-2024-09-23-2",
    "date": "2024-09-23",
    "type": "trip",
    "title": "Hotel check-in",
    "caption": "Tenth-floor room with a sliver of Empire State view if you lean.",
    "location": { "lat": 40.7484, "lng": -73.9857, "name": "Midtown Manhattan" },
    "photos": ["02-hotel-checkin.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["hotel"],
    "emojis": ["🏨"],
    "transport": "car"
  },
  {
    "id": "demo-2024-09-23-3",
    "date": "2024-09-23",
    "type": "trip",
    "title": "First-night dinner",
    "caption": "Pastrami at Katz's. Half a sandwich each is plenty.",
    "location": { "lat": 40.7223, "lng": -73.9874, "name": "Katz's Delicatessen, Lower East Side" },
    "photos": ["03-first-night-dinner.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["food"],
    "emojis": ["🥪"],
    "transport": "walking"
  },
  {
    "id": "demo-2024-09-24-1",
    "date": "2024-09-24",
    "type": "trip",
    "title": "Liberty by boat",
    "caption": "Spray on the deck, Lady Liberty bigger than the postcards suggest.",
    "location": { "lat": 40.6892, "lng": -74.0445, "name": "Statue of Liberty" },
    "photos": ["04-liberty-by-boat.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["landmark"],
    "emojis": ["🗽"],
    "transport": "boat"
  },
  {
    "id": "demo-2024-09-24-2",
    "date": "2024-09-24",
    "type": "trip",
    "title": "Times Square at dusk",
    "caption": "Every screen on. Tourist trap, but worth one slow walk-through.",
    "location": { "lat": 40.7580, "lng": -73.9855, "name": "Times Square" },
    "photos": ["05-times-square.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["landmark"],
    "emojis": ["🌃"],
    "transport": "metro"
  },
  {
    "id": "demo-2024-09-25-1",
    "date": "2024-09-25",
    "type": "trip",
    "title": "Central Park afternoon",
    "caption": "Bow Bridge, then a long sit on a bench watching dogs.",
    "location": { "lat": 40.7812, "lng": -73.9665, "name": "Central Park" },
    "photos": ["06-central-park.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["park"],
    "emojis": ["🌳"],
    "transport": "walking"
  },
  {
    "id": "demo-2024-09-25-2",
    "date": "2024-09-25",
    "type": "trip",
    "title": "Brooklyn Bridge crossing",
    "caption": "Walking east, sun behind, Manhattan over the shoulder.",
    "location": { "lat": 40.7061, "lng": -73.9969, "name": "Brooklyn Bridge" },
    "photos": ["07-brooklyn-bridge.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["landmark"],
    "emojis": ["🌉"],
    "transport": "walking"
  },
  {
    "id": "demo-2024-09-26-1",
    "date": "2024-09-26",
    "type": "trip",
    "title": "MoMA",
    "caption": "Stood five minutes in front of Starry Night. Worth the queue.",
    "location": { "lat": 40.7614, "lng": -73.9776, "name": "Museum of Modern Art" },
    "photos": ["08-moma.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["museum"],
    "emojis": ["🎨"],
    "transport": "metro"
  },
  {
    "id": "demo-2024-09-26-2",
    "date": "2024-09-26",
    "type": "trip",
    "title": "Final dinner",
    "caption": "Window table, last evening, jazz drifting in from the bar.",
    "location": { "lat": 40.7308, "lng": -74.0027, "name": "Greenwich Village" },
    "photos": ["09-final-dinner.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["food"],
    "emojis": ["🍽️"],
    "transport": "walking"
  },
  {
    "id": "demo-2024-09-27-1",
    "date": "2024-09-27",
    "type": "trip",
    "title": "Wheels up",
    "caption": "Departure board glow at 6am — already planning the next trip.",
    "location": { "lat": 40.6413, "lng": -73.7781, "name": "JFK Airport, Queens, NY" },
    "photos": ["10-wheels-up.jpg"],
    "music": null,
    "weather": { "icon": "cloud", "tempC": 0 },
    "videos": [],
    "tags": ["departure", "travel-day"],
    "emojis": ["🛫"],
    "transport": "plane"
  }
]
```

- [ ] **Step 2: Run the test — expect partial pass**

```bash
cd data/demo && bun test
```

Expected: schema/coords/order tests PASS; "each photo reference resolves to a file" FAILS (photos don't exist yet).

- [ ] **Step 3: Commit**

```bash
git add data/demo/memories.json
git commit -m "feat: add demo NY trip memories skeleton"
```

---

## Task 3: Reproducibility script — fill weather from Open-Meteo

**Files:**
- Create: `data/demo/build.ts`

- [ ] **Step 1: Write the build script**

Create `data/demo/build.ts`:

```typescript
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
```

- [ ] **Step 2: Run the script**

```bash
cd data/demo && bun run build.ts
```

Expected: 10 lines of `id  date  →  icon temp°C`, then "Wrote 10 entries…". `memories.json` is overwritten with real weather values.

- [ ] **Step 3: Re-run schema test (still expect photo-reference failure)**

```bash
bun test
```

Expected: schema/coords/order tests PASS; photo-reference test still FAILS.

- [ ] **Step 4: Commit**

```bash
git add data/demo/build.ts data/demo/memories.json
git commit -m "feat: backfill demo weather via Open-Meteo"
```

---

## Task 4: Stub JPGs so the schema test passes

The real watercolour images come from Midjourney (Task 5 documents the prompts; Wouter generates and drops them in). For now: tiny solid-colour stub JPGs at the right filenames so `data/demo/__tests__/memories.test.ts` goes green.

**Files:**
- Create: `data/demo/photos/01-jfk-arrival.jpg` … `10-wheels-up.jpg`

- [ ] **Step 1: Verify ImageMagick is available**

```bash
which convert
```

Expected: a path. If not installed (WSL): `sudo apt install imagemagick` — flag to user, do not auto-install. Fallback if unavailable: `bun` can write a 1×1 JPG via the `sharp` package, but installing ImageMagick is faster.

- [ ] **Step 2: Generate 10 stubs**

```bash
cd data/demo/photos && \
for name in 01-jfk-arrival 02-hotel-checkin 03-first-night-dinner \
            04-liberty-by-boat 05-times-square 06-central-park \
            07-brooklyn-bridge 08-moma 09-final-dinner 10-wheels-up; do \
  convert -size 1200x800 xc:"#f4eee6" \
    -gravity center -pointsize 36 -fill "#a89888" \
    -annotate +0+0 "stub — replace with Midjourney output" \
    "${name}.jpg"; \
done && ls -1 *.jpg
```

Expected: 10 filenames listed.

- [ ] **Step 3: Run schema test — should fully pass**

```bash
cd data/demo && bun test
```

Expected: all 5 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add data/demo/photos/
git commit -m "chore: add stub photos so demo schema test passes"
```

---

## Task 5: data/demo/README.md — Midjourney prompts (the real image deliverable)

This is the central artifact for the demo's visual identity: 10 Midjourney prompts that share a palette/style suffix so the rendered set reads as a coherent watercolour series.

**Files:**
- Create: `data/demo/README.md`

- [ ] **Step 1: Write the README**

Create `data/demo/README.md`:

`````markdown
# Meridian — Demo Dataset

A fake 5-day NY trip (2024-09-23 → 2024-09-27) used as the public-facing example. Loaded as the default dataset when running the app from a fresh clone.

## Contents

```
memories.json    — Memory[] (10 entries), conforms to app/src/types/memory.ts
build.ts         — re-runs Open-Meteo lookups to refresh the `weather` field
photos/          — 10 watercolour JPGs (Midjourney output; stubs ship by default)
```

## Regenerating weather

```bash
cd data/demo
bun run build.ts
```

Hits the Open-Meteo Archive API once per entry (~1.5s total). Idempotent — overwrites the `weather` field on every entry.

## Generating the watercolour images (Midjourney)

Photos shipped in this folder are tiny solid-colour stubs. Replace each one with a Midjourney render using the prompts below.

### Shared style suffix

Append this to every prompt so the 10 images read as a cohesive series:

```
watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

`--ar 3:2` matches the existing `app/public/photos/full/` aspect (1152×768). `--style raw` keeps the model from over-stylizing.

### Per-image prompts

Run each one through `/imagine` in Midjourney and save the chosen upscale as the listed filename.

**1 · `01-jfk-arrival.jpg`**
```
Cinematic view through a passenger jet window descending toward New York at golden hour,
the wing slicing across pink and cream clouds, distant skyline silhouette below, condensation
on the inner glass · [shared style suffix]
```

**2 · `02-hotel-checkin.jpg`**
```
A high Midtown Manhattan hotel-room window at dusk, sheer curtain half-drawn, warm interior
lamp light, a layered cityscape of brick rooftops, water towers, and the Empire State Building
faintly visible, an open suitcase suggested in the foreground (no figures) · [shared style suffix]
```

**3 · `03-first-night-dinner.jpg`**
```
A New York deli pastrami sandwich on crinkled butcher paper, mustard smear, pickle spear,
half-eaten, overhead three-quarter angle, warm yellow diner lighting, a coffee mug edge in
the corner · [shared style suffix]
```

**4 · `04-liberty-by-boat.jpg`**
```
The Statue of Liberty seen from the deck of a passing ferry, low angle through railing,
Hudson river spray catching pale light, soft Manhattan skyline far behind, gulls
suggested as loose marks · [shared style suffix]
```

**5 · `05-times-square.jpg`**
```
Times Square at twilight, towering billboards glowing in coral, teal and amber, reflections
on rain-wet asphalt, an empty intersection painted as soft impressionistic washes, no
figures, no readable lettering on the screens · [shared style suffix]
```

**6 · `06-central-park.jpg`**
```
Central Park's Bow Bridge arching over a still pond, autumn maples in dusty terracotta and
ochre, late afternoon golden light filtering through branches, reflections on the water,
empty park bench in the foreground · [shared style suffix]
```

**7 · `07-brooklyn-bridge.jpg`**
```
Walkway view across the Brooklyn Bridge looking toward Manhattan, gothic stone arches and
suspension cables in soft grey-blue, lower Manhattan skyline behind in pale wash, empty
boards underfoot, wide cinematic perspective · [shared style suffix]
```

**8 · `08-moma.jpg`**
```
A minimalist modern art gallery interior, polished pale floor, a single large swirling
post-impressionist canvas (Starry Night style — original interpretation, not a copy) on a
white wall, soft track lighting, a wooden bench centred (empty) · [shared style suffix]
```

**9 · `09-final-dinner.jpg`**
```
A candlelit corner restaurant table for two by a rain-streaked window, two wineglasses
catching warm light, soft blurred Greenwich Village street outside with passing headlights as
loose smudges, intimate evening mood, no figures · [shared style suffix]
```

**10 · `10-wheels-up.jpg`**
```
An airport departure board glowing softly at early dawn, blurred destination text in pastel
washes (no readable words), a single suitcase silhouette in the foreground, large window
behind showing pre-dawn ramp lighting · [shared style suffix]
```

### Constraints recap

- Landscape, **1152×768** (or close — `--ar 3:2`).
- **No human figures, faces, or hands** (enforced by `--no` clause; spot-check each upscale).
- Web-optimized JPG, target **200–400 KB**. After saving from Midjourney, run e.g. `convert in.png -quality 82 out.jpg` if needed.
- Filenames must match `photos[]` references in `memories.json` exactly.

## Schema

See `app/src/types/memory.ts` for the canonical `Memory` interface.

## Tests

```bash
cd data/demo
bun test
```

Validates: 10 entries, chronological order, NYC bounding box, all referenced photos exist on disk, schema conformance.
`````

- [ ] **Step 2: Commit**

```bash
git add data/demo/README.md
git commit -m "docs: document demo dataset + Midjourney watercolour prompts"
```

---

## Task 6: Marketing structure test (TDD red)

**Files:**
- Create: `marketing/__tests__/structure.test.ts`

- [ ] **Step 1: Write the structure test**

Create `marketing/__tests__/structure.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dir, "..", "index.html"), "utf-8");
const css = readFileSync(join(import.meta.dir, "..", "styles.css"), "utf-8");

describe("marketing/index.html structure", () => {
  test("declares HTML5 doctype and viewport meta", () => {
    expect(html.toLowerCase()).toContain("<!doctype html>");
    expect(html).toMatch(/<meta\s+name="viewport"/i);
  });

  test("references stylesheet", () => {
    expect(html).toMatch(/href="styles\.css"/);
  });

  test("contains hero with Meridian title", () => {
    expect(html).toMatch(/<section[^>]*id="hero"/i);
    expect(html).toMatch(/Meridian/);
  });

  test("contains 'what is this' section", () => {
    expect(html).toMatch(/<section[^>]*id="what"/i);
  });

  test("contains a 3-step 'how it works' section", () => {
    expect(html).toMatch(/<section[^>]*id="how"/i);
    expect(html).toMatch(/meridian-triage/);
  });

  test("contains a live-demo link", () => {
    expect(html).toMatch(/<section[^>]*id="demo"/i);
  });

  test("contains an install snippet with bun install + bun run dev", () => {
    expect(html).toMatch(/<section[^>]*id="install"/i);
    expect(html).toMatch(/bun\s+install/);
    expect(html).toMatch(/bun\s+run\s+dev/);
  });

  test("contains a footer with GitHub link and MIT license mention", () => {
    expect(html).toMatch(/<footer/i);
    expect(html).toMatch(/github\.com/i);
    expect(html).toMatch(/MIT/);
  });
});

describe("marketing/styles.css palette", () => {
  test("uses Meridian peach accent #e8836b", () => {
    expect(css.toLowerCase()).toContain("#e8836b");
  });

  test("loads Caveat or Inter web font", () => {
    expect(css).toMatch(/Caveat|Inter/);
  });

  test("has at least one mobile media query", () => {
    expect(css).toMatch(/@media[^{]*max-width/);
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd marketing && bun test
```

Expected: FAIL — `index.html` and `styles.css` do not exist (read errors).

- [ ] **Step 3: Commit**

```bash
git add marketing/__tests__/structure.test.ts
git commit -m "test: add marketing site structure validation"
```

---

## Task 7: marketing/index.html + styles.css

**Files:**
- Create: `marketing/index.html`
- Create: `marketing/styles.css`

- [ ] **Step 1: Write index.html**

Create `marketing/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Meridian — a scroll-driven memory timeline</title>
  <meta name="description" content="Open-source scroll-driven timeline that draws travel lines on a map between your photos." />
  <link rel="stylesheet" href="styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@300;400;500&display=swap" />
</head>
<body>
  <header class="nav">
    <a class="brand" href="#hero">Meridian</a>
    <nav>
      <a href="#how">How</a>
      <a href="#demo">Demo</a>
      <a href="https://github.com/Laoujin/meridian" target="_blank" rel="noopener">GitHub</a>
    </nav>
  </header>

  <section id="hero" class="hero">
    <h1 class="hero__title">Meridian</h1>
    <p class="hero__tagline">A scroll-driven memory timeline. Cards with photos appear as you scroll; a map in the background draws travel lines between them.</p>
    <div class="hero__cta">
      <a class="btn btn--primary" href="#demo">See the demo</a>
      <a class="btn btn--ghost" href="https://github.com/Laoujin/meridian" target="_blank" rel="noopener">View source</a>
    </div>
  </section>

  <section id="what" class="section">
    <h2>What is this</h2>
    <p>Drop a folder of photos in, get a beautiful scrollable trip-map you can host anywhere.</p>
    <p class="muted">Built originally as a personal birthday gift. Now open source.</p>
  </section>

  <section id="how" class="section section--steps">
    <h2>How it works</h2>
    <ol class="steps">
      <li>
        <div class="step__num">1</div>
        <h3>Drop in photos</h3>
        <p>Point at a folder of trip photos. EXIF gets you dates and coordinates for free.</p>
      </li>
      <li>
        <div class="step__num">2</div>
        <h3>Run <code>meridian-triage</code></h3>
        <p>The CLI extracts metadata, geocodes locations, and looks up historical weather. Outputs a <code>Memory[]</code> JSON.</p>
      </li>
      <li>
        <div class="step__num">3</div>
        <h3>Host</h3>
        <p>Point the app at the JSON, run <code>bun run dev</code>, and ship to any static host.</p>
      </li>
    </ol>
  </section>

  <section id="demo" class="section section--demo">
    <h2>Live demo</h2>
    <p>A fake 5-day NY trip in watercolour, walking through the full feature set.</p>
    <a class="btn btn--primary" href="https://laoujin.github.io/meridian/" target="_blank" rel="noopener">Open the demo →</a>
  </section>

  <section id="install" class="section section--install">
    <h2>Install</h2>
    <pre><code>git clone https://github.com/Laoujin/meridian
cd meridian/app
bun install
bun run dev</code></pre>
    <p class="muted">Requires <a href="https://bun.sh" target="_blank" rel="noopener">bun</a>.</p>
  </section>

  <footer>
    <p>
      <a href="https://github.com/Laoujin/meridian" target="_blank" rel="noopener">GitHub</a>
      &middot;
      MIT License
    </p>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Write styles.css**

Create `marketing/styles.css`:

```css
:root {
  --accent: #e8836b;
  --accent-soft: #fff5f0;
  --accent-soft-2: #ffe8de;
  --text: #2c2c2c;
  --muted: #777;
  --border: rgba(0,0,0,0.08);
  --bg: #fff;
  --code-bg: #f4f3ec;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}
.nav .brand {
  font-family: 'Caveat', cursive;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
}
.nav nav a {
  margin-left: 24px;
  color: var(--text);
  font-size: 15px;
}

.hero {
  text-align: center;
  padding: 96px 24px 64px;
  background: linear-gradient(180deg, var(--accent-soft) 0%, var(--accent-soft-2) 100%);
}
.hero__title {
  font-family: 'Caveat', cursive;
  font-size: clamp(56px, 12vw, 120px);
  color: var(--accent);
  line-height: 1;
  margin-bottom: 16px;
}
.hero__tagline {
  font-size: 20px;
  max-width: 640px;
  margin: 0 auto 32px;
  color: #444;
}
.hero__cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

.btn {
  display: inline-block;
  padding: 14px 28px;
  border-radius: 999px;
  font-family: 'Caveat', cursive;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn--primary {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 6px 16px rgba(232,131,107,0.35);
}
.btn--primary:hover { transform: translateY(-2px); text-decoration: none; }
.btn--ghost {
  background: transparent;
  color: var(--accent);
  border: 2px solid var(--accent);
}
.btn--ghost:hover { background: var(--accent); color: #fff; text-decoration: none; }

.section {
  max-width: 880px;
  margin: 0 auto;
  padding: 80px 24px;
  text-align: center;
}
.section h2 {
  font-family: 'Caveat', cursive;
  font-size: 48px;
  color: var(--accent);
  margin-bottom: 24px;
}
.section p { font-size: 17px; max-width: 560px; margin: 0 auto 12px; }
.muted { color: var(--muted); font-size: 15px; }

.steps {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 32px;
  text-align: left;
}
.steps li {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}
.step__num {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Caveat', cursive;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}
.steps h3 { font-size: 18px; margin-bottom: 8px; }
.steps p { font-size: 15px; color: #555; margin: 0; }

code {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 14px;
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text);
}
pre {
  background: #16171d;
  color: #f3f4f6;
  padding: 20px 24px;
  border-radius: 12px;
  text-align: left;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.6;
  margin: 16px auto;
  max-width: 560px;
}
pre code { background: transparent; padding: 0; color: inherit; }

footer {
  text-align: center;
  padding: 32px 24px;
  color: var(--muted);
  font-size: 14px;
  border-top: 1px solid var(--border);
}

@media (max-width: 720px) {
  .nav { padding: 12px 16px; }
  .nav nav a { margin-left: 16px; font-size: 14px; }
  .section { padding: 56px 20px; }
  .section h2 { font-size: 36px; }
  .steps { grid-template-columns: 1fr; gap: 16px; }
  pre { font-size: 13px; padding: 16px; }
}
```

- [ ] **Step 3: Run the structure test — should pass**

```bash
cd marketing && bun test
```

Expected: all tests PASS (11 assertions).

- [ ] **Step 4: Commit**

```bash
git add marketing/index.html marketing/styles.css
git commit -m "feat: add marketing landing page"
```

---

## Task 8: Manual browser smoke test

This task has no code changes — it's a verification gate.

- [ ] **Step 1: Serve the marketing site locally**

```bash
cd marketing && bun --bun x serve .
```

Or, if `serve` is not installed:

```bash
cd marketing && python3 -m http.server 8080
```

- [ ] **Step 2: Open in a browser and verify**

Visit `http://localhost:8080` (or whichever port the server reports).

Manual checks:
- Page renders, hero "Meridian" is the peach accent color and uses Caveat font.
- Three step cards line up horizontally on desktop, stack vertically below 720px (resize the window).
- DevTools console shows zero errors and zero warnings.
- All in-page anchor links (`#how`, `#demo`, etc.) scroll smoothly.
- All external links (GitHub, demo) open in a new tab.

- [ ] **Step 3: Stop the server (Ctrl+C). No commit needed for this task.**

---

## Task 9: marketing/README.md — GitHub Pages deploy notes

**Files:**
- Create: `marketing/README.md`

- [ ] **Step 1: Write the README**

Create `marketing/README.md`:

````markdown
# Meridian — Marketing Site

Single-page landing for the Meridian repo. Plain HTML + CSS, no build step.

## Local preview

```bash
cd marketing
python3 -m http.server 8080
# or:  bun --bun x serve .
```

Open `http://localhost:8080`.

## Deploy via GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder: `/marketing`. Save.

The site is reachable at `https://<user>.github.io/<repo>/`.

## Tests

```bash
cd marketing
bun test
```

Validates required sections and palette.
````

- [ ] **Step 2: Commit**

```bash
git add marketing/README.md
git commit -m "docs: document marketing site preview + GitHub Pages deploy"
```

---

## Task 10: Final verification + handoff notes

- [ ] **Step 1: Run all tests one more time**

```bash
cd data/demo && bun test && cd ../../marketing && bun test
```

Expected: all green.

- [ ] **Step 2: Confirm no files modified outside `data/demo/` and `marketing/`**

```bash
git diff --stat main..HEAD -- ':!data/demo' ':!marketing' ':!docs/superpowers'
```

Expected: empty output.

- [ ] **Step 3: Self-checklist against spec acceptance criteria**

- [ ] `data/demo/memories.json` parses as `Memory[]`, 10 entries.
- [ ] All entries have `location`, `weather`, `date`, `title`, `caption`, `photos`, `transport`.
- [ ] `data/demo/photos/` has 10 JPGs matching `photos[]` references. Stubs trivially satisfy "no human likenesses"; once Wouter swaps in Midjourney output, spot-check each one.
- [ ] `marketing/index.html` renders in browser with no console errors (manual check, Task 8).
- [ ] All 6 required sections present: hero, what-is, how-it-works, live demo, install snippet, footer.
- [ ] `marketing/` is a self-contained GitHub Pages source.
- [ ] `data/demo/README.md` documents the AI prompt + per-image scene prompts.

- [ ] **Step 4: Write a handoff note for Wouter**

Summarize in chat:
- What landed (commit list).
- Outstanding work for Wouter: run the 10 Midjourney prompts in `data/demo/README.md`, save the upscales over the stubs at `data/demo/photos/<NN>-<slug>.jpg`.
- Manual acceptance still owed: load `data/demo/memories.json` in the running app once Claude A has rewired `loader.ts`.

No commit for this task.

---

## Self-Review (executed before handing this plan to the executor)

**Spec coverage:**
- Demo content (≥10 memories, real coords, real weather, watercolour images, fake pronouns/no real people, README with prompt) — Tasks 1–5 ✓
- Marketing site (hero, what-is, how-it-works, demo link, install snippet, footer; plain HTML/CSS/JS; mobile-friendly; GitHub Pages-ready; reuses app palette) — Tasks 6–9 ✓
- Acceptance: schema parses, fields populated, ≥10 photos match references, no console errors, sections render, self-contained, prompts documented — Task 10 ✓
- Definition of done: app plays through 10 entries (manual, flagged in Task 10 step 4); marketing serves locally (Task 8) ✓
- Coordination: no changes outside `data/demo/` and `marketing/` (verified Task 10 step 2) ✓

**Placeholder scan:** No "TBD" / "implement later" / "similar to" / "fill in" tokens. Every code step has full code; every command step has a runnable command and an expected outcome.

**Type consistency:** `Memory`, `WeatherIcon`, `TransportMode` redeclared in test and build files match `app/src/types/memory.ts` exactly. `WMO_ICON` map in `build.ts` matches `scripts/backfill-weather.ts` exactly.

**Open assumption that needs Wouter's signoff before execution:** none material — image-gen is offloaded to Wouter via Midjourney prompts (Task 5). Trip-window date (2024-09-23 → 2024-09-27) and per-entry landmark choices (Katz's, MoMA, etc.) are still negotiable; flag any swap before executing Task 2.
