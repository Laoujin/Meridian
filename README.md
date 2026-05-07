# Meridian

A self-hosted scroll-driven memory timeline. Cards with photos appear as you scroll; a maplibre map in the background draws travel lines between locations.

## Quickstart

```bash
cd app
bun install
bun run dev          # http://localhost:5173
```

Memories are loaded from `data/memories-*.json` by `app/src/data/loader.ts`, sorted chronologically, then rendered as a vertical scroll timeline in `App.tsx`.

## Marketing Site

Online at [laoujin.github.io/Meridian](https://laoujin.github.io/Meridian/),
with two live demos: [NY Trip](https://laoujin.github.io/Meridian/NY-Trip/)
and [Love Story](https://laoujin.github.io/Meridian/Love-Story/).

```bash
cd marketing
python3 -m http.server 8080
```
