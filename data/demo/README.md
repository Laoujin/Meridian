# Meridian — Demo Dataset

A fake 5-day NY trip (2024-09-23 → 2024-09-27) used as the public-facing example. Loaded as the default dataset when running the app from a fresh clone.

## Contents

```
memories.json    — Memory[] (10 entries), conforms to app/src/types/memory.ts
build.ts         — re-runs Open-Meteo lookups to refresh the `weather` field
photos/          — 10 watercolour JPGs (stubs ship by default; replace via Midjourney)
MIDJOURNEY.md    — prompts for regenerating the photo set
```

## Regenerating weather

```bash
cd data/demo
bun run build.ts
```

Hits the Open-Meteo Archive API once per entry (~1.5s total). Idempotent — overwrites the `weather` field on every entry.

## Replacing the placeholder images

See [MIDJOURNEY.md](./MIDJOURNEY.md) for ten Midjourney prompts (one per photo). Generate, save the upscales over the matching `photos/<NN>-*.jpg` filenames.

## Schema

See `app/src/types/memory.ts` for the canonical `Memory` interface.

## Tests

```bash
cd data/demo
bun test
```

Validates: 10 entries, chronological order, NYC bounding box, all referenced photos exist on disk, schema conformance.
