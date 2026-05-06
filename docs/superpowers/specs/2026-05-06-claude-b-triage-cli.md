# Claude B — Triage CLI v2

**Status:** Spec drafted 2026-05-06. Awaiting review before implementation.
**Lane:** Independent. Can start as soon as Claude A publishes the rebrand name.

## Project context

Meridian is a scroll-driven memory timeline app (React + Vite + TS, maplibre-gl). It launched 2026-05-06 as a personal birthday gift and is now being open-sourced. Three Claude agents are running in parallel:

- **Claude A** — sanitizing the repo, applying the `Meridian` rebrand, publishing data/config contracts.
- **Claude B (you)** — this brief.
- **Claude C** — fake NY-trip demo content + marketing landing page.

Background: read `docs/open-source-brainstorm.md` and `README.md`. Schema authority: `app/src/types/memory.ts`. Existing memory examples: `data/memories-2024.json`.

## Goal

A standalone CLI: `meridian-triage <folder>` that ingests a folder of photos and produces a JSON file matching the `Memory` schema. Anyone forking Meridian can point it at their own photos and get a working timeline.

## In scope

- New package at `tools/triage/` (TypeScript, runs on Bun).
- EXIF date + GPS extraction from JPEG/PNG via `exifr`.
- Forward geocoding (address string → lat/lng) and reverse geocoding (lat/lng → place name) via Nominatim. Respect the 1 req/s rate limit.
- Historical weather via Open-Meteo Archive API (free, no key, accepts past dates). Map WMO codes → `WeatherIcon` enum.
- CLI flags + `--interactive` mode that prompts only for `title` and `caption` per photo. Everything else is auto-extracted.
- Output: writes a JSON file of `Memory[]`. If output file exists, merge by `id` (new entries appended, same-`id` entries overwritten).
- Idempotency: re-running on the same folder produces the same `id` per photo (use filename + content hash).

## Out of scope

- The legacy `scripts/triage-server.ts` / `triage.html` browser tool. Coexist; don't replace.
- Anything inside `app/src/`. Don't touch the consuming app.
- Image manipulation (resize, thumbnail generation). Claude A owns thumbs.
- Photo storage / copying. CLI emits JSON referencing photo filenames; placing photos under `data/photos/` is the user's job.

## Prior art (reuse, don't reinvent)

- **`scripts/geocode-memories.ts`** — working Nominatim client with the right `User-Agent` and 1100ms throttle. Lift the `geocode()` function pattern.
- **`scripts/backfill-weather.ts`** — working Open-Meteo Archive client with the WMO-code → icon mapping table. Copy the mapping verbatim.
- **`scripts/triage-server.ts`** — older curation tool. Read for context only; don't extend.

## Schema (the contract)

Match `app/src/types/memory.ts` exactly:

```ts
export interface Memory {
  id: string;
  date: string;          // ISO YYYY-MM-DD
  type: 'date' | 'trip' | 'milestone' | 'special';
  title: string;
  caption: string;
  location: { lat: number | null; lng: number | null; name: string; text?: string } | null;
  photos: string[];      // filenames, no path
  music: { track: string; artist: string; title: string } | null;
  weather: { icon: WeatherIcon; tempC: number; note?: string } | null;
  videos: string[];
  tags: string[];
  emojis?: string[];
  transport?: 'car' | 'plane' | 'train' | 'metro' | 'walking' | 'boat' | 'bike' | 'bus';
  linkedTo?: string;
  relatedNote?: string;
  attachments?: string[];
}
```

Default extraction behavior per photo:

| Field        | Source                                                                                                  |
|--------------|---------------------------------------------------------------------------------------------------------|
| `id`         | `<dateSlug>-<filenameSlug>-<sha8(content)>`. Deterministic.                                             |
| `date`       | EXIF `DateTimeOriginal`. Fallback: file mtime. ISO `YYYY-MM-DD` only.                                   |
| `type`       | `'date'`. Override via `--type`.                                                                        |
| `title`      | Empty; populated only with `--interactive`.                                                             |
| `caption`    | Empty; populated only with `--interactive`.                                                             |
| `location`   | EXIF GPS → `{lat, lng}` then reverse-geocode for `name`. Or `--address` → forward-geocode. Else `null`. |
| `photos`     | The photo filename(s) the entry was generated from.                                                     |
| `weather`    | Open-Meteo Archive given `date` + `location`. If either missing, `null`.                                |
| `videos`     | `[]`.                                                                                                   |
| `music`      | `null`.                                                                                                 |
| `tags`       | `[]`.                                                                                                   |
| `emojis`     | Omit.                                                                                                   |
| `transport`  | Omit (app defaults to `'car'`).                                                                         |
| Other fields | Omit.                                                                                                   |

## CLI surface

```
meridian-triage <folder> [--out=<file>] [--interactive] [--type=<type>] [--address=<addr>] [--group-by=day]
```

| Flag             | Effect                                                                                       |
|------------------|----------------------------------------------------------------------------------------------|
| `--out=<file>`   | Output path. Default: `<folder>/memories.json`.                                              |
| `--interactive`  | Prompt for `title` and `caption` per generated entry.                                        |
| `--type=<type>`  | Override `type` field for all entries.                                                       |
| `--address=<addr>` | Forward-geocode and apply to entries lacking EXIF GPS.                                     |
| `--group-by=day` | One `Memory` per calendar day (multiple photos → one entry). Default: one entry per photo.   |

Exit codes: non-zero on hard failures (unreadable folder, no media files). Zero with warnings on per-photo failures.

## Acceptance criteria

- Running on a folder of 3 photos with EXIF GPS → 3 valid `Memory` entries with `location`, `date`, `weather` populated.
- Re-running produces byte-identical output (same `id`s, no dupes).
- One photo without EXIF GPS + `--address="Eiffel Tower, Paris"` → entry with geocoded location + weather.
- `--group-by=day` collapses 3 photos taken the same day into 1 entry with `photos: ['a.jpg','b.jpg','c.jpg']`.
- Unit tests cover: deterministic id derivation, WMO mapping, schema shape, the merge-by-id update path.
- No tests against live Nominatim/Open-Meteo in CI. Mock or skip those.
- README at `tools/triage/README.md` explains install, usage, and that no API keys are needed.

## Definition of done

- `bun run --cwd tools/triage triage <fixture-folder>` works and emits a valid JSON file.
- `bun run --cwd tools/triage test` passes.
- `tools/triage/README.md` is complete.
- No changes outside `tools/triage/`.

## Coordination notes

- Schema authority is `app/src/types/memory.ts`. If Claude A publishes `docs/oss/CONTRACTS.md` and renames anything, you may need a one-line update.
- Repo files Claude A might rename mid-flight: top-level `README.md`, `package.json` "name" field. Don't rely on those names.
- If you need to add a workspace entry to the root `package.json`, ask first — that file is contested with Claude A.
