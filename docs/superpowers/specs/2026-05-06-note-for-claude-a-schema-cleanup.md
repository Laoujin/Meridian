# Note for Claude A — schema cleanup candidates

**From:** Claude B (triage UI rebuild)
**Date:** 2026-05-06
**Action required:** None automatic — your call. Three flagged items in `app/src/types/memory.ts`.

## Findings (verified against current `app/`, `data/`, and grep)

### 1. `MemoryType = 'special'` — dead

| Where defined | Usage |
|---------------|-------|
| `app/src/types/memory.ts:36` (in `type` union) | declared |
| `app/src/utils/stats.ts:20` (counted as "date") | counted but never returned |
| `data/memories-{2024,2025,2026}.json` | **0 entries** |
| `app/src/components/MemoryCard.tsx` | no styling, no rendering branch |

**Recommendation:** remove from the `MemoryType` union and from `stats.ts`. Pure dead code.

### 2. `Memory.linkedTo?: string` — dead

| Where defined | Usage |
|---------------|-------|
| `app/src/types/memory.ts:51` | declared |
| Anywhere else | **0 references** |

**Recommendation:** remove. Schema-only, no data, no consumers.

### 3. `MemoryType = 'trip'` — alive, but Wouter floated removing it

| Where defined | Usage |
|---------------|-------|
| `app/src/types/memory.ts:36` | declared |
| `data/memories-*.json` | **61 entries** |
| `app/src/components/MemoryCard.tsx:17` | adds `memory-card--trip` class |
| `app/src/styles/global.css:213` | `.memory-card--trip { border-left: 4px solid #4a9eff; }` |
| `app/src/utils/stats.ts:21` | counted as `trips++` |

**Wouter quote (2026-05-06):** *"we're going to remove trip"*

**Recommendation:** discuss with Wouter before acting. This is a non-trivial removal: 61 data entries to retype (likely all → `'date'`), CSS to delete, styling tests to update, stats display to revisit. Worth a decision conversation, not a silent cleanup.

## Other minor

- `Memory.relatedNote?: string` — 1 entry uses it ("Valentijn 2026"). Probably keep; it's a real escape hatch field.
- `Memory.attachments?: string[]` — 1 entry uses it. Same.
- `Memory.emojis?: string[]` — used by `MemoryCard.tsx:31-39` for decorative corner emojis. Triage UI now has a picker for this field.

## My constraint

Triage UI imports types via tsconfig path:
```
"paths": { "@meridian/schema": ["../../app/src/types/memory.ts"] }
```

So renames in `memory.ts` will break my typecheck loudly — exactly what I want. Removing `'special'` is a one-line breakage I'll pick up immediately. Removing `'trip'` would touch my UI's "type override" if I had one (I don't anymore — dropped during brainstorm), so it's a clean change for me.

Ping me if you change the schema mid-flight.
