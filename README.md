# Meridian

A self-hosted scroll-driven memory timeline. Cards with photos appear as you scroll; a maplibre map in the background draws travel lines between locations.

## Quickstart

### Start Triage

Point to a folder and start creating **Your Story**!  
Update `triage.config.json` if you need to change folders.

```bash
cd triage
bun install
bun run triage
```


### Start Meridian

See the app in action. If you already did the triage `.env` is already
created to point to your story!

```bash
cd app
bun install
bun run dev             # http://localhost:5173 — reads MERIDIAN_DATA from .env
bun run dev:ny-trip     # http://localhost:5174 — loads data/ny-trip
bun run dev:love-story  # http://localhost:5175 — loads data/love-story
```

Datasets live under `data/<story>/` (e.g. `ny-trip`, `love-story`).
`bun run dev` picks the `MERIDIAN_DATA` set in `.env`.


## Marketing Site

Online at [laoujin.github.io/Meridian](https://laoujin.github.io/Meridian/),
with two live demos: [NY Trip](https://laoujin.github.io/Meridian/NY-Trip/)
and [Love Story](https://laoujin.github.io/Meridian/Love-Story/).

```bash
cd marketing
python3 -m http.server 8080
```
