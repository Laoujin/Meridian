# Meridian — Default Dataset

A fake 5-day NY trip (2024-09-23 → 2024-09-27) used as the default dataset when running the app from a fresh clone.

## Contents

```
memories.json    — Memory[] (10 entries), conforms to app/src/types/memory.ts
MIDJOURNEY.md    — prompts for regenerating the photo set
```

Photos for these entries live at `app/public/photos/full/<filename>` (the path the app serves them from).

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
