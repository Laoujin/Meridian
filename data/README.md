# Meridian — Default Dataset

A fake 5-day NY trip (2024-09-23 → 2024-09-27) used as the default dataset when running the app from a fresh clone.

## Contents

```
memories.json    — Memory[] (10 entries), conforms to app/src/types/memory.ts
build.ts         — re-runs Open-Meteo lookups to refresh the `weather` field
MIDJOURNEY.md    — prompts for regenerating the photo set
```

Photos for these entries live at `app/public/photos/full/<filename>` (the path the app serves them from).

## Regenerating weather

```bash
cd data
bun run build.ts
```

Hits the Open-Meteo Archive API once per entry (~1.5s total). Idempotent — overwrites the `weather` field on every entry.

## Replacing the photos

See [MIDJOURNEY.md](./MIDJOURNEY.md) for ten Midjourney prompts (one per photo). Save the upscales as `app/public/photos/full/<NN>-*.jpg` (filenames must match `photos[]` references in `memories.json`).

## Schema

See `app/src/types/memory.ts` for the canonical `Memory` interface.

## Tests

```bash
cd data
bun test
```

Validates: 10 entries, chronological order, NYC bounding box, all referenced photos exist on disk, schema conformance.
