# Claude B — Triage UI v2

**Status:** Spec drafted 2026-05-06 from brainstorm. Awaiting review before plan-writing.
**Lane:** Independent. Touches only `scripts/`/`tools/` and writes to `data/`. Coordinates with Claude A on schema + repo rebrand.
**Supersedes:** [`2026-05-06-claude-b-triage-cli.md`](./2026-05-06-claude-b-triage-cli.md).

## Project context

Meridian is a scroll-driven memory timeline app (React + Vite + TS, maplibre-gl). It launched 2026-05-06 as a personal birthday gift and is now being open-sourced. Three Claude agents are running in parallel:

- **Claude A** — sanitizing the repo, applying the `Meridian` rebrand, publishing data/config contracts.
- **Claude B (you)** — this brief.
- **Claude C** — fake NY-trip demo content + marketing landing page.

Background: read `docs/open-source-brainstorm.md` and `README.md`. Schema authority: `app/src/types/memory.ts`.

## Goal

Take the existing `scripts/triage-server.ts` + `scripts/triage.html` (a personal browser-based curation tool with hardcoded source folders and year tabs) and turn it into something an OSS user who clones the repo can point at their own photo folder and use to build a `data/memories-YYYY.json` file.

Adds three substantive new capabilities the existing tool lacks: EXIF/GPS auto-extraction, reverse geocoding via Nominatim, and historical weather via Open-Meteo Archive — all triggered automatically when a photo is added to an entry.

## In scope

- Move `scripts/triage-server.ts` → `tools/triage/server.ts` and `scripts/triage.html` → `tools/triage/public/index.html`.
- Genericize the server: source folder via CLI arg, dynamic year detection, drop multi-source filter, drop dead `days[]` sub-day support.
- New server-side modules: `exif.ts`, `geocode.ts`, `weather.ts`, `memories.ts`, `photo-copy.ts`.
- New UI features: EXIF auto-fill on photo add, emoji picker (`emoji-picker-element`), drag-to-reorder photos within an entry, bigger thumbnails + click-to-expand lightbox, error toasts when geocode/weather fails.
- Unit tests for the new modules. No tests for the UI (existing tool has none; out of scope here).
- README at `tools/triage/README.md`.

## Out of scope

- Anything inside `app/src/` (Claude A's lane).
- Schema changes (`app/src/types/memory.ts`). Note for Claude A about dead fields written separately.
- Image manipulation (resize, thumbnails). Claude A owns thumbs.
- Music / YouTube download. Deferred to subsystem C.
- Docker packaging. Deferred until subsystem C arrives (then triage joins the compose file too).
- Replacing `data/memories-YYYY.json` with a single file. That touches `app/src/data/loader.ts` (Claude A's territory).
- E2E / UI tests. Existing tool ships with none; testing infra is parked work (`TestingInfrastructureSetupPrompt.md`).
- Migrating existing `scripts/geocode-memories.ts` and `scripts/backfill-weather.ts` users — those scripts stay as one-off backfill tools.

## Prior art (reuse)

- **`scripts/geocode-memories.ts`** — working Nominatim client, 1100ms throttle, in-process cache, correct `User-Agent`. Lift the `geocode()` shape into `tools/triage/src/geocode.ts`. Generalize to also do reverse lookup.
- **`scripts/backfill-weather.ts`** — working Open-Meteo Archive client + WMO-code → icon mapping. Copy the WMO map verbatim into `tools/triage/src/weather.ts`.
- **`scripts/triage.html`** — current UI; preserve the 3-pane layout, the day matching/orphan badging, the JSON textarea editor, the auto-apply-on-blur behavior. Strip year hardcoding, source filter, and `days[]` UI.
- **`scripts/triage-server.ts`** — current server; preserve API shape (`/api/state`, `/api/save`, `/api/copy`, `/api/trash`, `/media`, `/photo`). Strip multi-source. Add `/api/geocode` and `/api/weather` for manual re-trigger.

## Key design decisions (from brainstorm)

| Question | Decision | Why |
|----------|----------|-----|
| Source folder selection | CLI arg: `bun run triage <folder>`. Print usage and exit 1 if omitted. | Simpler than browser file picker; works in all browsers; one source per session matches the OSS user's "I have one folder" mental model. |
| Type sharing app/ ↔ tools/ | tsconfig path `@meridian/schema` → `../../app/src/types/memory.ts`. | Types are TS-only and erased at runtime. Single source of truth; schema rename in app/ breaks triage typecheck loudly. |
| Year scoping | Dynamic: server globs `data/memories-*.json` and exposes `years[]`. UI generates year buttons from this. | Hardcoded `2024/2025/2026` is the single biggest OSS blocker. Fork+install for a different year is broken without this. |
| Multi-source folders | Drop. Single folder per server instance. Restart with different arg to switch. | Multi-source is Wouter-specific (caro+wouter); makes config much heavier; OSS user has one folder. |
| Sub-day `days[]` | Delete UI + server logic. Field is not in `Memory`, not in data, not used by the app — pure leftover. | Dead code. `scripts/convert-trip-days.ts` already migrated this away. |
| EXIF auto-fill timing | Automatic — on photo-add, server returns extracted metadata in same response, UI pre-fills. | The whole point of the feature. A button defeats the purpose. Fields stay editable. |
| Emoji picker | `emoji-picker-element` web component. Single `<emoji-picker>` tag, full Unicode coverage, no framework dep. | Vanilla input is bad UX (typing emojis is OS-dependent); curated set fights against the open-ended nature of `emojis[]`. |
| Geocode/weather failure | Visible: toast on the affected entry, "weather lookup failed — retry?" with a retry button calling `/api/geocode` or `/api/weather`. | Silent null is a debugging trap. These calls fail occasionally (rate-limit, missing data). |
| Tests | TDD on new server modules (exif/geocode/weather/memories/photo-copy). UI: no tests this round. | CLAUDE.md mandates TDD for new code. UI tests need infra that's parked work. |
| Existing scripts | Coexist. `triage-server.ts` + `triage.html` get **moved** to `tools/triage/`, not duplicated. The other `scripts/` (geocode-memories, backfill-weather, convert-trip-days, migrate-transport) stay put — they're one-off data migrations. | "Keep the existing tool" means keep its functionality, not its file path. The new home signals "OSS-supported". |

## Architecture

### File structure

```
tools/triage/
├── README.md                # install + usage
├── package.json             # name: meridian-triage; deps: exifr; scripts: triage, test, typecheck
├── tsconfig.json            # paths: @meridian/schema → ../../app/src/types/memory.ts
├── server.ts                # Bun.serve entry; CLI arg parsing; orchestrates modules
├── public/
│   └── index.html           # UI (vanilla JS, no build step)
├── src/
│   ├── exif.ts              # readExif(path) → { date?, gps? }
│   ├── geocode.ts           # createGeocoder() → { forward, reverse } with 1100ms throttle + cache
│   ├── weather.ts           # fetchWeather(lat, lng, date) → Weather | null
│   ├── memories.ts          # listYears(dataDir), readYear(dataDir, year), writeYear(dataDir, year, memories)
│   ├── photo-copy.ts        # copyToPhotosFull(srcFolder, name, photosDir) — atomic, idempotent
│   └── wmo.ts               # WMO_ICON map (lifted verbatim from scripts/backfill-weather.ts)
└── tests/
    ├── exif.test.ts         # mocks exifr
    ├── geocode.test.ts      # mocks fetch
    ├── weather.test.ts      # mocks fetch
    ├── memories.test.ts     # uses tmpdir for fs
    ├── photo-copy.test.ts   # uses tmpdir for fs
    └── wmo.test.ts          # pure
```

### Server API

| Route                | Method | Body / Query                  | Returns / Effect                                                                                              |
|----------------------|--------|-------------------------------|---------------------------------------------------------------------------------------------------------------|
| `GET /`              | GET    |                               | serves `public/index.html`                                                                                    |
| `GET /api/state`     | GET    |                               | `{ memories: { [year]: Memory[] }, files: string[], years: string[] }`. `files` = filenames in source folder. |
| `POST /api/save`     | POST   | `{ year, memories }`          | writes `data/memories-<year>.json`. Validates year matches `\d{4}`.                                           |
| `POST /api/copy`     | POST   | `{ name }`                    | copies `<source>/<name>` → `app/public/photos/full/<name>`. Returns `{ ok, exif: { date?, gps? }, geocoded?: { name }, weather?: Weather }`. EXIF/geocode/weather errors are reported but don't fail the copy. |
| `POST /api/trash`    | POST   | `{ name }`                    | moves `<source>/<name>` → `<source>/.trash/<name>`. Creates `.trash/` if needed.                              |
| `POST /api/geocode`  | POST   | `{ lat, lng }` or `{ address }` | manual re-trigger. Returns `{ name }` or `{ lat, lng, name }`.                                              |
| `POST /api/weather`  | POST   | `{ lat, lng, date }`          | manual re-trigger. Returns `Weather` or `{ error }`.                                                          |
| `GET /media`         | GET    | `?name=<filename>`            | serves file from source folder. Validates name (no `/`, no `..`).                                             |
| `GET /photo`         | GET    | `?name=<filename>`            | serves from `app/public/photos/full/`. Validates name.                                                        |

### CLI

```
Usage: bun run tools/triage/server.ts <photo-folder>

Starts the Meridian triage UI on http://localhost:5174.
<photo-folder> is a directory of JPEG/PNG/MP4/MOV files to triage into memories.
```

If `<photo-folder>` missing or doesn't exist: print usage to stderr, exit 1.

### UI changes vs. existing `triage.html`

**Remove:**
- `<header>` source-filter checkboxes (`#src-meridian`, `#src-wouter`)
- `state.srcFilter` and all references
- Hardcoded `<button class="year">` for 2024/2025/2026 — generate from `state.years`
- `add-day-btn` button + `addSubDay()` function + sub-day rendering in days pane
- `flattenForYear`'s sub-day flattening (just `[{date, entry, path: [i]}, ...]`)

**Modify:**
- `selectIntoEntry` calls `POST /api/copy` and on response, if `entry.date` is empty/default, applies `exif.date`; if `entry.location` is empty, applies geocoded `{lat, lng, name}`; if `entry.weather` is null, applies `weather`. Toast on per-field failure.
- Photo grid: `.photo img/video` height `160px → 220px`; `.photos` grid `minmax(160px, 1fr) → minmax(240px, 1fr)`.
- Click on `.photo.selected` (in-entry) opens lightbox modal showing full-size image. Click anywhere outside to close.

**Add:**
- Drag-to-reorder for `.photo.selected` items: HTML5 `draggable=true`, on drop reorder `entry.photos` (or `entry.videos`), call `markDirty`, render. Cross-list reorder (moving a photo between photos and videos) not supported — they're separate fields.
- Emoji picker: button "+ Emoji" in JSON-editor toolbar opens a popup with `<emoji-picker>` web component (loaded via CDN `<script type=module src="https://cdn.jsdelivr.net/npm/emoji-picker-element@^1/index.js">`). Click adds to `entry.emojis` (creates array if absent), marks dirty, re-renders.
- Toast component (top-right corner, auto-dismiss after 4s, click-to-dismiss, retry button when applicable).
- Lightbox modal (full-viewport overlay, image centered, click outside or Escape closes).

### Type sharing

`tools/triage/tsconfig.json`:
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
    "paths": {
      "@meridian/schema": ["../../app/src/types/memory.ts"]
    }
  },
  "include": ["src", "tests", "server.ts"]
}
```

All triage code imports `Memory`, `Weather`, `WeatherIcon`, etc. from `@meridian/schema`.

### Tests

- `wmo.test.ts` — pure lookup table, ~6 tests
- `exif.test.ts` — mock exifr, test date/gps extraction + missing-tag fallbacks
- `geocode.test.ts` — inject fake fetch, test forward + reverse + caching + 1100ms throttle (use `throttleMs: 0` for speed)
- `weather.test.ts` — inject fake fetch, test happy path + missing-data null + HTTP error throw + URL construction
- `memories.test.ts` — tmpdir, write `memories-2024.json`, listYears returns `["2024"]`, readYear roundtrips, writeYear creates file with trailing newline matching existing convention
- `photo-copy.test.ts` — tmpdir, copy preserves bytes, second call is no-op (idempotent)

No tests against live Nominatim/Open-Meteo. No tests for server routes or UI this round.

## Acceptance criteria

- `bun run tools/triage/server.ts ~/photos` starts server, prints `Triage UI: http://localhost:5174` and the source folder path. No source folder → usage to stderr, exit 1.
- Browser at the URL: year buttons reflect actual `data/memories-*.json` files (works for 2024-only, works for 2024+2025+2026, works for 2030 if file exists).
- Drop a JPEG with EXIF GPS into a new entry → entry pre-fills with `date`, `location: {lat, lng, name: <reverse-geocoded>}`, `weather: {icon, tempC}`.
- Drop a JPEG without EXIF GPS → entry pre-fills `date` only; `location`/`weather` stay null; toast says "no GPS in EXIF".
- Reorder two photos in an entry by drag → `entry.photos` order changes, dirty badge appears, save persists.
- Click a photo in the in-entry section → lightbox opens at full size; Escape or click-outside closes.
- Emoji picker button → click emoji 💕 → appears in `entry.emojis`, dirty badge appears, save persists.
- Force a Nominatim 503 (e.g. by stubbing fetch in test, or naturally during use) → toast "geocode failed — retry?", click retry → calls `/api/geocode`.
- `bun test` (in `tools/triage/`) — all unit suites pass, no network calls.
- `bun run typecheck` (in `tools/triage/`) — exit 0.

## Definition of done

- `tools/triage/README.md` documents install, CLI usage, browser URL, and the auto-fill behavior.
- `git mv scripts/triage-server.ts tools/triage/server.ts` and `git mv scripts/triage.html tools/triage/public/index.html` are clean (history preserved).
- No changes outside `tools/triage/` and `docs/superpowers/`. Specifically: no edits to `app/`, no edits to `data/`, no edits to root config files.
- Old `scripts/triage-server.ts` is gone (moved, not duplicated).

## Coordination notes

- **Claude A:** Schema authority is `app/src/types/memory.ts`. If you rename that file or any field, my tsconfig path will break — please ping me. Conversely, if you publish a `docs/oss/CONTRACTS.md`, I may need a one-line update in the triage README.
- **Claude A:** Separate note (`docs/superpowers/specs/2026-05-06-note-for-claude-a-schema-cleanup.md`) flagging dead schema fields (`type: 'special'` — 0 entries; `Memory.linkedTo` — 0 references) and Wouter's mention of considering removing `type: 'trip'` (61 entries, has CSS — non-trivial).
- **Claude C:** No coordination needed — different lane.
- Repo files Claude A might rename mid-flight: top-level `README.md`, `package.json` "name" field. Don't rely on those names.
- If you need to add a workspace entry to the root `package.json`, ask first — that file is contested with Claude A.
