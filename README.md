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
cd app && bun run test:e2e e2e/transitions/fixture-opening.spec.ts --headed
```

Use `bun run test:e2e`, **not** `bunx playwright`. On Windows the latter runs Bun as the runtime and Playwright workers as Node, which trips a misleading "two versions of @playwright/test" error.

Screenshots and frame dumps land in `app/e2e/screenshots/fixture-<scenario>/`.
