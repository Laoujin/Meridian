# Meridian

A scroll-driven memory timeline. Cards with photos appear as you scroll; a maplibre map in the background draws travel lines between locations.

## Quickstart

```bash
cd app
bun install
bun run dev          # http://localhost:5173
```

Memories are loaded from `data/memories-*.json` by `app/src/data/loader.ts`, sorted chronologically, then rendered as a vertical scroll timeline in `App.tsx`.

## Run camera scenario tests (watch them play)

```bash
cd app && bunx playwright test e2e/transitions/fixture-*.spec.ts --headed
```

Screenshots and frame dumps land in `app/e2e/screenshots/fixture-<scenario>/`.
