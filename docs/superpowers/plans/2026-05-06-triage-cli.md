# Triage CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone Bun CLI `meridian-triage <folder>` that ingests a folder of photos and emits a JSON file matching the `Memory` schema (EXIF date+GPS, reverse geocoding, historical weather).

**Architecture:** Standalone package at `tools/triage/`. Pure functions for id derivation, WMO mapping, merge-by-id, arg parsing — all unit-tested. Network clients (`exifr`, Nominatim, Open-Meteo) are wrapped behind small modules so tests inject `fetch` / mock the EXIF reader. CLI entry wires modules together; no global state.

**Tech Stack:** Bun, TypeScript, `exifr` for EXIF parsing, `bun:test` for tests, `node:fs/promises` + `node:path`. No framework. No external deps beyond `exifr`.

---

## File Structure

```
tools/triage/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── types.ts          # Memory + Location + Weather + WeatherIcon (mirrors app/src/types/memory.ts)
│   ├── id.ts             # deriveId(filename, date, contentBytes) -> string
│   ├── wmo.ts            # WMO_ICON map + wmoToIcon(code) -> WeatherIcon
│   ├── exif.ts           # readExif(path) -> {date?, gps?}
│   ├── geocode.ts        # forward(addr), reverse(lat,lng) — Nominatim, throttled
│   ├── weather.ts        # fetchWeather(lat,lng,date) -> Weather | null
│   ├── merge.ts          # mergeById(existing, incoming) -> Memory[]
│   ├── args.ts           # parseArgs(argv) -> {folder, out, interactive, type, address, groupBy}
│   ├── triage.ts         # buildMemories(folder, opts, deps) -> Memory[]
│   └── cli.ts            # entry: parses args, prompts, writes file
└── tests/
    ├── id.test.ts
    ├── wmo.test.ts
    ├── merge.test.ts
    ├── args.test.ts
    ├── weather.test.ts
    ├── geocode.test.ts
    └── triage.test.ts    # integration: mock exif/geocode/weather, real fs
```

Each src file has one job; deps inject `fetch`/exif so tests don't hit the network.

---

## Task 1: Scaffold package

**Files:**
- Create: `tools/triage/package.json`
- Create: `tools/triage/tsconfig.json`
- Create: `tools/triage/.gitignore`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "meridian-triage",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "bin": { "meridian-triage": "./src/cli.ts" },
  "scripts": {
    "triage": "bun run src/cli.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "exifr": "^7.1.3"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "~5.9.3"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["bun-types"],
    "lib": ["ESNext"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Write .gitignore**

```
node_modules
*.log
```

- [ ] **Step 4: Install deps**

Run: `cd tools/triage && bun install`
Expected: lockfile created, `node_modules/exifr` exists.

- [ ] **Step 5: Verify typecheck passes on empty project**

Run: `cd tools/triage && bun run typecheck`
Expected: exit 0 (no `src/*.ts` files yet, so nothing to check — that's fine).

- [ ] **Step 6: Commit**

```bash
git add tools/triage/package.json tools/triage/tsconfig.json tools/triage/.gitignore tools/triage/bun.lock
git commit -m "feat(triage): scaffold standalone tools/triage package"
```

---

## Task 2: Mirror Memory types

**Files:**
- Create: `tools/triage/src/types.ts`

- [ ] **Step 1: Write the type file (mirrors `app/src/types/memory.ts` verbatim, no app import to keep package standalone)**

```ts
export interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
  text?: string;
}

export type TransportMode =
  | 'car' | 'plane' | 'train' | 'metro' | 'walking' | 'boat' | 'bike' | 'bus';

export type WeatherIcon =
  | 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'drizzle'
  | 'rain' | 'rain-heavy' | 'snow' | 'storm';

export interface Weather {
  icon: WeatherIcon;
  tempC: number;
  note?: string;
}

export interface Music {
  track: string;
  artist: string;
  title: string;
}

export type MemoryType = 'date' | 'trip' | 'milestone' | 'special';

export interface Memory {
  id: string;
  date: string;
  type: MemoryType;
  title: string;
  caption: string;
  location: Location | null;
  photos: string[];
  music: Music | null;
  weather: Weather | null;
  videos: string[];
  tags: string[];
  emojis?: string[];
  transport?: TransportMode;
  linkedTo?: string;
  relatedNote?: string;
  attachments?: string[];
}
```

- [ ] **Step 2: Typecheck**

Run: `cd tools/triage && bun run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add tools/triage/src/types.ts
git commit -m "feat(triage): mirror Memory schema from app"
```

---

## Task 3: Deterministic ID derivation (TDD)

**Files:**
- Test: `tools/triage/tests/id.test.ts`
- Create: `tools/triage/src/id.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test';
import { deriveId, slugify } from '../src/id';

describe('slugify', () => {
  it('lowercases and replaces non-alnum with -', () => {
    expect(slugify('Photo 001.JPG')).toBe('photo-001-jpg');
  });
  it('collapses repeated dashes and trims', () => {
    expect(slugify('  --foo__bar--  ')).toBe('foo-bar');
  });
});

describe('deriveId', () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5]);

  it('combines date slug + filename slug + 8-char content hash', () => {
    const id = deriveId('IMG_1234.jpg', '2026-05-06', bytes);
    expect(id).toMatch(/^2026-05-06-img-1234-jpg-[a-f0-9]{8}$/);
  });

  it('is deterministic for identical inputs', () => {
    expect(deriveId('a.jpg', '2026-01-01', bytes))
      .toBe(deriveId('a.jpg', '2026-01-01', bytes));
  });

  it('differs when content differs', () => {
    const a = deriveId('x.jpg', '2026-01-01', new Uint8Array([1]));
    const b = deriveId('x.jpg', '2026-01-01', new Uint8Array([2]));
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd tools/triage && bun test tests/id.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement**

```ts
import { createHash } from 'node:crypto';

export function slugify(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function deriveId(filename: string, date: string, content: Uint8Array): string {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 8);
  return `${date}-${slugify(filename)}-${hash}`;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd tools/triage && bun test tests/id.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add tools/triage/src/id.ts tools/triage/tests/id.test.ts
git commit -m "feat(triage): deterministic id derivation"
```

---

## Task 4: WMO icon mapping (TDD)

**Files:**
- Test: `tools/triage/tests/wmo.test.ts`
- Create: `tools/triage/src/wmo.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test';
import { wmoToIcon } from '../src/wmo';

describe('wmoToIcon', () => {
  it('maps clear sky (0) to sun', () => {
    expect(wmoToIcon(0)).toBe('sun');
  });
  it('maps partly cloudy (1,2) to cloud-sun', () => {
    expect(wmoToIcon(1)).toBe('cloud-sun');
    expect(wmoToIcon(2)).toBe('cloud-sun');
  });
  it('maps fog (45,48) to fog', () => {
    expect(wmoToIcon(45)).toBe('fog');
    expect(wmoToIcon(48)).toBe('fog');
  });
  it('maps drizzle codes to drizzle', () => {
    for (const c of [51, 53, 55, 56, 57]) expect(wmoToIcon(c)).toBe('drizzle');
  });
  it('maps heavy rain (65,67,82) to rain-heavy', () => {
    for (const c of [65, 67, 82]) expect(wmoToIcon(c)).toBe('rain-heavy');
  });
  it('maps snow codes to snow', () => {
    for (const c of [71, 73, 75, 77, 85, 86]) expect(wmoToIcon(c)).toBe('snow');
  });
  it('maps thunderstorm (95,96,99) to storm', () => {
    for (const c of [95, 96, 99]) expect(wmoToIcon(c)).toBe('storm');
  });
  it('falls back to cloud for unknown codes', () => {
    expect(wmoToIcon(999)).toBe('cloud');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd tools/triage && bun test tests/wmo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement (verbatim from `scripts/backfill-weather.ts:25-40`)**

```ts
import type { WeatherIcon } from './types';

export const WMO_ICON: Record<number, WeatherIcon> = {
  0: 'sun',
  1: 'cloud-sun', 2: 'cloud-sun',
  3: 'cloud',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain',
  65: 'rain-heavy',
  66: 'rain', 67: 'rain-heavy',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
  80: 'rain', 81: 'rain', 82: 'rain-heavy',
  85: 'snow', 86: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
};

export function wmoToIcon(code: number): WeatherIcon {
  return WMO_ICON[code] ?? 'cloud';
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd tools/triage && bun test tests/wmo.test.ts`
Expected: 8 pass.

- [ ] **Step 5: Commit**

```bash
git add tools/triage/src/wmo.ts tools/triage/tests/wmo.test.ts
git commit -m "feat(triage): WMO weather code -> icon mapping"
```

---

## Task 5: Merge-by-id (TDD)

**Files:**
- Test: `tools/triage/tests/merge.test.ts`
- Create: `tools/triage/src/merge.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test';
import { mergeById } from '../src/merge';
import type { Memory } from '../src/types';

const mk = (id: string, title = ''): Memory => ({
  id, date: '2026-01-01', type: 'date', title, caption: '',
  location: null, photos: [], music: null, weather: null,
  videos: [], tags: [],
});

describe('mergeById', () => {
  it('appends new entries', () => {
    const out = mergeById([mk('a')], [mk('b')]);
    expect(out.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('overwrites entries with same id', () => {
    const out = mergeById([mk('a', 'old')], [mk('a', 'new')]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('new');
  });

  it('preserves order: existing first, then new', () => {
    const out = mergeById([mk('a'), mk('b')], [mk('c'), mk('a', 'updated')]);
    expect(out.map(m => m.id)).toEqual(['a', 'b', 'c']);
    expect(out.find(m => m.id === 'a')!.title).toBe('updated');
  });

  it('handles empty existing', () => {
    const out = mergeById([], [mk('a')]);
    expect(out).toEqual([mk('a')]);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd tools/triage && bun test tests/merge.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { Memory } from './types';

export function mergeById(existing: Memory[], incoming: Memory[]): Memory[] {
  const incomingById = new Map(incoming.map(m => [m.id, m]));
  const seen = new Set<string>();
  const out: Memory[] = [];

  for (const m of existing) {
    const upd = incomingById.get(m.id);
    out.push(upd ?? m);
    seen.add(m.id);
  }
  for (const m of incoming) {
    if (!seen.has(m.id)) out.push(m);
  }
  return out;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd tools/triage && bun test tests/merge.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add tools/triage/src/merge.ts tools/triage/tests/merge.test.ts
git commit -m "feat(triage): merge-by-id update path"
```

---

## Task 6: CLI argument parsing (TDD)

**Files:**
- Test: `tools/triage/tests/args.test.ts`
- Create: `tools/triage/src/args.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test';
import { parseArgs } from '../src/args';

describe('parseArgs', () => {
  it('requires a folder positional', () => {
    expect(() => parseArgs([])).toThrow(/folder/i);
  });

  it('parses folder and defaults', () => {
    const a = parseArgs(['./photos']);
    expect(a.folder).toBe('./photos');
    expect(a.interactive).toBe(false);
    expect(a.type).toBeUndefined();
    expect(a.address).toBeUndefined();
    expect(a.groupBy).toBeUndefined();
    expect(a.out).toBeUndefined();
  });

  it('parses --out=path', () => {
    expect(parseArgs(['./p', '--out=/tmp/x.json']).out).toBe('/tmp/x.json');
  });

  it('parses --interactive flag', () => {
    expect(parseArgs(['./p', '--interactive']).interactive).toBe(true);
  });

  it('parses --type=trip', () => {
    expect(parseArgs(['./p', '--type=trip']).type).toBe('trip');
  });

  it('rejects invalid --type', () => {
    expect(() => parseArgs(['./p', '--type=bogus'])).toThrow(/type/i);
  });

  it('parses --address="..."', () => {
    expect(parseArgs(['./p', '--address=Eiffel Tower']).address).toBe('Eiffel Tower');
  });

  it('parses --group-by=day', () => {
    expect(parseArgs(['./p', '--group-by=day']).groupBy).toBe('day');
  });

  it('rejects unknown flags', () => {
    expect(() => parseArgs(['./p', '--bogus'])).toThrow(/unknown/i);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd tools/triage && bun test tests/args.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { MemoryType } from './types';

export interface Args {
  folder: string;
  out?: string;
  interactive: boolean;
  type?: MemoryType;
  address?: string;
  groupBy?: 'day';
}

const VALID_TYPES: MemoryType[] = ['date', 'trip', 'milestone', 'special'];

export function parseArgs(argv: string[]): Args {
  const positionals: string[] = [];
  const args: Args = { folder: '', interactive: false };

  for (const a of argv) {
    if (!a.startsWith('--')) { positionals.push(a); continue; }
    if (a === '--interactive') { args.interactive = true; continue; }

    const eq = a.indexOf('=');
    const key = eq === -1 ? a.slice(2) : a.slice(2, eq);
    const val = eq === -1 ? '' : a.slice(eq + 1);

    switch (key) {
      case 'out': args.out = val; break;
      case 'address': args.address = val; break;
      case 'type':
        if (!VALID_TYPES.includes(val as MemoryType)) {
          throw new Error(`Invalid --type=${val}. Allowed: ${VALID_TYPES.join(', ')}`);
        }
        args.type = val as MemoryType;
        break;
      case 'group-by':
        if (val !== 'day') throw new Error(`Invalid --group-by=${val}. Allowed: day`);
        args.groupBy = 'day';
        break;
      default: throw new Error(`Unknown flag: ${a}`);
    }
  }

  if (!positionals[0]) throw new Error('Missing required <folder> argument');
  args.folder = positionals[0];
  return args;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd tools/triage && bun test tests/args.test.ts`
Expected: 9 pass.

- [ ] **Step 5: Commit**

```bash
git add tools/triage/src/args.ts tools/triage/tests/args.test.ts
git commit -m "feat(triage): CLI argument parser"
```

---

## Task 7: Weather client with injected fetch (TDD)

**Files:**
- Test: `tools/triage/tests/weather.test.ts`
- Create: `tools/triage/src/weather.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test';
import { fetchWeather } from '../src/weather';

const okResponse = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('fetchWeather', () => {
  it('returns icon + tempC from Open-Meteo response', async () => {
    const fakeFetch = ((_url: string) => okResponse({
      daily: { time: ['2026-05-06'], weather_code: [0], temperature_2m_max: [21.7] },
    })) as unknown as typeof fetch;

    const w = await fetchWeather(50.85, 4.35, '2026-05-06', { fetch: fakeFetch });
    expect(w).toEqual({ icon: 'sun', tempC: 22 });
  });

  it('returns null when daily data is missing', async () => {
    const fakeFetch = ((_url: string) => okResponse({})) as unknown as typeof fetch;
    expect(await fetchWeather(0, 0, '2026-01-01', { fetch: fakeFetch })).toBeNull();
  });

  it('throws on HTTP error', async () => {
    const fakeFetch = ((_url: string) =>
      Promise.resolve(new Response('boom', { status: 500 }))
    ) as unknown as typeof fetch;
    await expect(fetchWeather(0, 0, '2026-01-01', { fetch: fakeFetch })).rejects.toThrow(/HTTP 500/);
  });

  it('builds the correct URL', async () => {
    let captured = '';
    const fakeFetch = ((url: string) => {
      captured = url;
      return okResponse({ daily: { time: [''], weather_code: [3], temperature_2m_max: [10] } });
    }) as unknown as typeof fetch;

    await fetchWeather(50.85, 4.35, '2026-05-06', { fetch: fakeFetch });
    expect(captured).toContain('latitude=50.85');
    expect(captured).toContain('longitude=4.35');
    expect(captured).toContain('start_date=2026-05-06');
    expect(captured).toContain('end_date=2026-05-06');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd tools/triage && bun test tests/weather.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { Weather } from './types';
import { wmoToIcon } from './wmo';

interface Deps {
  fetch?: typeof fetch;
}

export async function fetchWeather(
  lat: number,
  lng: number,
  date: string,
  deps: Deps = {},
): Promise<Weather | null> {
  const f = deps.fetch ?? fetch;
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weather_code,temperature_2m_max&timezone=auto`;
  const res = await f(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    daily?: { time: string[]; weather_code: number[]; temperature_2m_max: (number | null)[] };
  };
  const code = data.daily?.weather_code?.[0];
  const temp = data.daily?.temperature_2m_max?.[0];
  if (code == null || temp == null) return null;
  return { icon: wmoToIcon(code), tempC: Math.round(temp) };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd tools/triage && bun test tests/weather.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add tools/triage/src/weather.ts tools/triage/tests/weather.test.ts
git commit -m "feat(triage): Open-Meteo Archive weather client"
```

---

## Task 8: Geocoder with injected fetch (TDD)

**Files:**
- Test: `tools/triage/tests/geocode.test.ts`
- Create: `tools/triage/src/geocode.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test';
import { createGeocoder } from '../src/geocode';

const ok = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('createGeocoder.forward', () => {
  it('returns lat/lng from Nominatim search', async () => {
    const fakeFetch = ((_u: string) => ok([{ lat: '48.8584', lon: '2.2945' }])
    ) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: fakeFetch, throttleMs: 0 });
    expect(await g.forward('Eiffel Tower')).toEqual({ lat: 48.8584, lng: 2.2945 });
  });

  it('returns null when no results', async () => {
    const fakeFetch = ((_u: string) => ok([])) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: fakeFetch, throttleMs: 0 });
    expect(await g.forward('Atlantis')).toBeNull();
  });

  it('caches repeat queries (one fetch call)', async () => {
    let calls = 0;
    const fakeFetch = ((_u: string) => { calls++; return ok([{ lat: '1', lon: '2' }]); }
    ) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: fakeFetch, throttleMs: 0 });
    await g.forward('X');
    await g.forward('X');
    expect(calls).toBe(1);
  });
});

describe('createGeocoder.reverse', () => {
  it('returns display_name from reverse lookup', async () => {
    const fakeFetch = ((_u: string) =>
      ok({ display_name: 'Brussels, Belgium' })
    ) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: fakeFetch, throttleMs: 0 });
    expect(await g.reverse(50.85, 4.35)).toBe('Brussels, Belgium');
  });

  it('returns null when no display_name', async () => {
    const fakeFetch = ((_u: string) => ok({})) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: fakeFetch, throttleMs: 0 });
    expect(await g.reverse(0, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd tools/triage && bun test tests/geocode.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
interface Deps {
  fetch?: typeof fetch;
  throttleMs?: number;
}

const UA = 'meridian-triage/0.1 (https://github.com/Laoujin/meridian)';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface Geocoder {
  forward(addr: string): Promise<{ lat: number; lng: number } | null>;
  reverse(lat: number, lng: number): Promise<string | null>;
}

export function createGeocoder(deps: Deps = {}): Geocoder {
  const f = deps.fetch ?? fetch;
  const throttleMs = deps.throttleMs ?? 1100;
  const fwdCache = new Map<string, { lat: number; lng: number } | null>();
  const revCache = new Map<string, string | null>();

  return {
    async forward(addr) {
      if (fwdCache.has(addr)) return fwdCache.get(addr)!;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`;
      try {
        const res = await f(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) { fwdCache.set(addr, null); return null; }
        const data = await res.json() as { lat: string; lon: string }[];
        const hit = data[0]
          ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
          : null;
        fwdCache.set(addr, hit);
        return hit;
      } finally {
        if (throttleMs) await sleep(throttleMs);
      }
    },

    async reverse(lat, lng) {
      const key = `${lat},${lng}`;
      if (revCache.has(key)) return revCache.get(key)!;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      try {
        const res = await f(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) { revCache.set(key, null); return null; }
        const data = await res.json() as { display_name?: string };
        const name = data.display_name ?? null;
        revCache.set(key, name);
        return name;
      } finally {
        if (throttleMs) await sleep(throttleMs);
      }
    },
  };
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd tools/triage && bun test tests/geocode.test.ts`
Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add tools/triage/src/geocode.ts tools/triage/tests/geocode.test.ts
git commit -m "feat(triage): Nominatim forward + reverse geocoder"
```

---

## Task 9: EXIF reader (thin wrapper)

**Files:**
- Create: `tools/triage/src/exif.ts`

No dedicated tests — `exifr` is a third-party library; we test it indirectly via the triage integration test by stubbing this module's export. Wrap it so the seam exists.

- [ ] **Step 1: Implement**

```ts
import exifr from 'exifr';

export interface ExifData {
  date: Date | null;
  gps: { lat: number; lng: number } | null;
}

export async function readExif(path: string): Promise<ExifData> {
  try {
    const tags = await exifr.parse(path, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'] });
    if (!tags) return { date: null, gps: null };
    const date: Date | null = tags.DateTimeOriginal ?? tags.CreateDate ?? null;
    const gps = (typeof tags.latitude === 'number' && typeof tags.longitude === 'number')
      ? { lat: tags.latitude, lng: tags.longitude }
      : null;
    return { date, gps };
  } catch {
    return { date: null, gps: null };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd tools/triage && bun run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add tools/triage/src/exif.ts
git commit -m "feat(triage): exifr wrapper for date + GPS"
```

---

## Task 10: Triage pipeline (TDD, all deps injected)

**Files:**
- Test: `tools/triage/tests/triage.test.ts`
- Create: `tools/triage/src/triage.ts`

The pipeline takes a folder and returns `Memory[]`. EXIF, geocode, weather are injected so the test runs without network or real photos.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildMemories } from '../src/triage';
import type { Geocoder } from '../src/geocode';

const stubGeocoder = (overrides: Partial<Geocoder> = {}): Geocoder => ({
  forward: async () => null,
  reverse: async () => 'Brussels, Belgium',
  ...overrides,
});

let dir = '';
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'triage-'));
  writeFileSync(join(dir, 'a.jpg'), Buffer.from([1, 2, 3]));
  writeFileSync(join(dir, 'b.jpg'), Buffer.from([4, 5, 6]));
  writeFileSync(join(dir, 'c.jpg'), Buffer.from([7, 8, 9]));
  writeFileSync(join(dir, 'notes.txt'), 'ignored');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('buildMemories', () => {
  it('emits one Memory per photo with EXIF date+GPS+weather populated', async () => {
    const out = await buildMemories(dir, { interactive: false }, {
      readExif: async (p) => ({
        date: new Date('2026-05-06T12:00:00Z'),
        gps: p.endsWith('a.jpg') ? { lat: 50.85, lng: 4.35 } : null,
      }),
      geocoder: stubGeocoder(),
      fetchWeather: async () => ({ icon: 'sun', tempC: 22 }),
      prompt: async () => '',
    });

    expect(out).toHaveLength(3);
    const a = out.find(m => m.photos[0] === 'a.jpg')!;
    expect(a.date).toBe('2026-05-06');
    expect(a.location).toEqual({ lat: 50.85, lng: 4.35, name: 'Brussels, Belgium' });
    expect(a.weather).toEqual({ icon: 'sun', tempC: 22 });
    expect(a.type).toBe('date');
    expect(a.title).toBe('');
    expect(a.caption).toBe('');
  });

  it('derives ids deterministically — same folder, same ids', async () => {
    const opts = { interactive: false };
    const deps = {
      readExif: async () => ({ date: new Date('2026-01-01'), gps: null }),
      geocoder: stubGeocoder(),
      fetchWeather: async () => null,
      prompt: async () => '',
    };
    const a = await buildMemories(dir, opts, deps);
    const b = await buildMemories(dir, opts, deps);
    expect(a.map(m => m.id)).toEqual(b.map(m => m.id));
  });

  it('honours --type override', async () => {
    const out = await buildMemories(dir, { interactive: false, type: 'trip' }, {
      readExif: async () => ({ date: new Date('2026-01-01'), gps: null }),
      geocoder: stubGeocoder(),
      fetchWeather: async () => null,
      prompt: async () => '',
    });
    expect(out.every(m => m.type === 'trip')).toBe(true);
  });

  it('uses --address forward-geocode when EXIF GPS missing', async () => {
    const out = await buildMemories(dir, { interactive: false, address: 'Eiffel Tower' }, {
      readExif: async () => ({ date: new Date('2026-01-01'), gps: null }),
      geocoder: stubGeocoder({
        forward: async () => ({ lat: 48.85, lng: 2.29 }),
        reverse: async () => 'Paris, France',
      }),
      fetchWeather: async () => null,
      prompt: async () => '',
    });
    expect(out[0].location).toEqual({ lat: 48.85, lng: 2.29, name: 'Paris, France' });
  });

  it('--group-by=day collapses photos taken the same day', async () => {
    const out = await buildMemories(dir, { interactive: false, groupBy: 'day' }, {
      readExif: async () => ({ date: new Date('2026-05-06T12:00:00Z'), gps: null }),
      geocoder: stubGeocoder(),
      fetchWeather: async () => null,
      prompt: async () => '',
    });
    expect(out).toHaveLength(1);
    expect(out[0].photos.sort()).toEqual(['a.jpg', 'b.jpg', 'c.jpg']);
  });

  it('falls back to file mtime when EXIF date missing', async () => {
    const out = await buildMemories(dir, { interactive: false }, {
      readExif: async () => ({ date: null, gps: null }),
      geocoder: stubGeocoder(),
      fetchWeather: async () => null,
      prompt: async () => '',
    });
    expect(out[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('--interactive populates title and caption from prompt', async () => {
    const calls: string[] = [];
    const out = await buildMemories(dir, { interactive: true }, {
      readExif: async () => ({ date: new Date('2026-01-01'), gps: null }),
      geocoder: stubGeocoder(),
      fetchWeather: async () => null,
      prompt: async (q) => { calls.push(q); return q.includes('title') ? 'T' : 'C'; },
    });
    expect(out.every(m => m.title === 'T' && m.caption === 'C')).toBe(true);
    expect(calls.length).toBe(6); // 3 photos × (title + caption)
  });

  it('throws when folder has no media files', async () => {
    rmSync(dir, { recursive: true, force: true });
    dir = mkdtempSync(join(tmpdir(), 'triage-empty-'));
    await expect(buildMemories(dir, { interactive: false }, {
      readExif: async () => ({ date: null, gps: null }),
      geocoder: stubGeocoder(),
      fetchWeather: async () => null,
      prompt: async () => '',
    })).rejects.toThrow(/no.*photo/i);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd tools/triage && bun test tests/triage.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import type { Memory, MemoryType, Location, Weather } from './types';
import type { Geocoder } from './geocode';
import { deriveId } from './id';

const PHOTO_RX = /\.(jpe?g|png)$/i;

export interface BuildOptions {
  interactive: boolean;
  type?: MemoryType;
  address?: string;
  groupBy?: 'day';
}

export interface BuildDeps {
  readExif: (path: string) => Promise<{ date: Date | null; gps: { lat: number; lng: number } | null }>;
  geocoder: Geocoder;
  fetchWeather: (lat: number, lng: number, date: string) => Promise<Weather | null>;
  prompt: (question: string) => Promise<string>;
}

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

interface PhotoInfo {
  filename: string;
  bytes: Uint8Array;
  date: string;
  gps: { lat: number; lng: number } | null;
}

async function scanPhotos(folder: string, readExif: BuildDeps['readExif']): Promise<PhotoInfo[]> {
  const entries = await readdir(folder);
  const photos: PhotoInfo[] = [];
  for (const name of entries.sort()) {
    if (!PHOTO_RX.test(name)) continue;
    const path = join(folder, name);
    const bytes = new Uint8Array(await readFile(path));
    const exif = await readExif(path);
    const date = exif.date ?? (await stat(path)).mtime;
    photos.push({ filename: basename(path), bytes, date: isoDate(date), gps: exif.gps });
  }
  return photos;
}

async function resolveLocation(
  gps: { lat: number; lng: number } | null,
  fallbackAddress: string | undefined,
  geocoder: Geocoder,
): Promise<Location | null> {
  if (gps) {
    const name = await geocoder.reverse(gps.lat, gps.lng) ?? '';
    return { lat: gps.lat, lng: gps.lng, name };
  }
  if (fallbackAddress) {
    const hit = await geocoder.forward(fallbackAddress);
    if (!hit) return { lat: null, lng: null, name: fallbackAddress };
    const name = await geocoder.reverse(hit.lat, hit.lng) ?? fallbackAddress;
    return { lat: hit.lat, lng: hit.lng, name };
  }
  return null;
}

async function buildOne(
  photos: PhotoInfo[],
  opts: BuildOptions,
  deps: BuildDeps,
): Promise<Memory> {
  const head = photos[0];
  const location = await resolveLocation(head.gps, opts.address, deps.geocoder);
  const weather = location && location.lat != null && location.lng != null
    ? await deps.fetchWeather(location.lat, location.lng, head.date)
    : null;

  // Combined hash for grouped entries
  const combined = new Uint8Array(photos.reduce((n, p) => n + p.bytes.length, 0));
  let off = 0;
  for (const p of photos) { combined.set(p.bytes, off); off += p.bytes.length; }
  const id = deriveId(head.filename, head.date, combined);

  let title = '';
  let caption = '';
  if (opts.interactive) {
    title = await deps.prompt(`title for ${head.filename}: `);
    caption = await deps.prompt(`caption for ${head.filename}: `);
  }

  return {
    id,
    date: head.date,
    type: opts.type ?? 'date',
    title,
    caption,
    location,
    photos: photos.map(p => p.filename),
    music: null,
    weather,
    videos: [],
    tags: [],
  };
}

export async function buildMemories(
  folder: string,
  opts: BuildOptions,
  deps: BuildDeps,
): Promise<Memory[]> {
  const photos = await scanPhotos(folder, deps.readExif);
  if (photos.length === 0) throw new Error(`No photo files (jpg/jpeg/png) found in ${folder}`);

  const groups: PhotoInfo[][] = opts.groupBy === 'day'
    ? Object.values(photos.reduce<Record<string, PhotoInfo[]>>((acc, p) => {
        (acc[p.date] ??= []).push(p);
        return acc;
      }, {}))
    : photos.map(p => [p]);

  const out: Memory[] = [];
  for (const g of groups) out.push(await buildOne(g, opts, deps));
  return out;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd tools/triage && bun test tests/triage.test.ts`
Expected: 8 pass.

- [ ] **Step 5: Run all tests**

Run: `cd tools/triage && bun test`
Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add tools/triage/src/triage.ts tools/triage/tests/triage.test.ts
git commit -m "feat(triage): folder->Memory[] pipeline with injectable deps"
```

---

## Task 11: CLI entry wires it all up

**Files:**
- Create: `tools/triage/src/cli.ts`

This is the wire-up; logic is already tested in pieces. Smoke-tested by `Definition of done` step.

- [ ] **Step 1: Implement**

```ts
#!/usr/bin/env bun
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from './args';
import { buildMemories } from './triage';
import { mergeById } from './merge';
import { readExif } from './exif';
import { createGeocoder } from './geocode';
import { fetchWeather } from './weather';
import type { Memory } from './types';

async function promptStdin(question: string): Promise<string> {
  process.stdout.write(question);
  for await (const chunk of Bun.stdin.stream()) {
    return new TextDecoder().decode(chunk).replace(/\r?\n$/, '');
  }
  return '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = args.out ?? join(args.folder, 'memories.json');
  const geocoder = createGeocoder();

  const memories = await buildMemories(args.folder, args, {
    readExif,
    geocoder,
    fetchWeather: (lat, lng, date) => fetchWeather(lat, lng, date),
    prompt: promptStdin,
  });

  let existing: Memory[] = [];
  if (existsSync(outPath)) {
    try { existing = JSON.parse(await readFile(outPath, 'utf-8')); } catch {
      console.error(`Warning: could not parse existing ${outPath}; overwriting`);
    }
  }
  const merged = mergeById(existing, memories);
  await writeFile(outPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`Wrote ${merged.length} entries to ${outPath} (${memories.length} new/updated)`);
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck**

Run: `cd tools/triage && bun run typecheck`
Expected: exit 0.

- [ ] **Step 3: Smoke-test against the existing data folder (no photos so it should fail cleanly)**

Run: `cd tools/triage && bun run src/cli.ts /tmp/nonexistent 2>&1; echo "exit=$?"`
Expected: error message about folder, exit non-zero.

- [ ] **Step 4: Commit**

```bash
git add tools/triage/src/cli.ts
git commit -m "feat(triage): CLI entry wiring all modules"
```

---

## Task 12: README

**Files:**
- Create: `tools/triage/README.md`

- [ ] **Step 1: Write README**

```markdown
# meridian-triage

Standalone CLI that turns a folder of photos into a Meridian-compatible `memories.json`. Extracts EXIF date and GPS, reverse-geocodes via Nominatim, fetches historical weather from Open-Meteo. No API keys needed.

## Install

```sh
cd tools/triage
bun install
```

## Usage

```sh
bun run triage <folder> [options]
```

| Flag                | Effect                                                          |
|---------------------|-----------------------------------------------------------------|
| `--out=<file>`      | Output path. Default: `<folder>/memories.json`.                 |
| `--interactive`     | Prompt for `title` and `caption` per generated entry.           |
| `--type=<type>`     | Override `type` for all entries (`date`/`trip`/`milestone`/`special`). |
| `--address=<addr>`  | Forward-geocode and use for entries without EXIF GPS.           |
| `--group-by=day`    | One entry per calendar day instead of one per photo.            |

## Behaviour

- IDs are deterministic (`<date>-<filename-slug>-<sha8>`); re-running on the same folder produces byte-identical output.
- If `--out` exists, entries are merged by `id` (new appended, same-`id` overwritten).
- Non-photo files are ignored. Per-photo failures emit warnings but don't abort.
- Nominatim calls are throttled to 1 req/s per their usage policy.

## Tests

```sh
bun test
```
```

- [ ] **Step 2: Commit**

```bash
git add tools/triage/README.md
git commit -m "docs(triage): README with install/usage/behaviour"
```

---

## Task 13: Final verification

- [ ] **Step 1: Full test run**

Run: `cd tools/triage && bun test`
Expected: all suites pass.

- [ ] **Step 2: Typecheck**

Run: `cd tools/triage && bun run typecheck`
Expected: exit 0.

- [ ] **Step 3: Confirm no changes outside `tools/triage/` (except the plan/spec docs)**

Run: `git status`
Expected: only `tools/triage/**` and `docs/superpowers/plans/2026-05-06-triage-cli.md` show as new/modified.
