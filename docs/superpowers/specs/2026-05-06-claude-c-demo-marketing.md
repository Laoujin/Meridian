# Claude C — Demo content + marketing site

**Status:** Spec drafted 2026-05-06. Awaiting review before implementation.
**Lane:** Independent of Claude B. Depends on Claude A's published rebrand name.

## Project context

Meridian is a scroll-driven memory timeline app (React + Vite + TS, maplibre-gl). It launched 2026-05-06 as a personal birthday gift and is now being open-sourced. Three Claude agents are running in parallel:

- **Claude A** — sanitizing the repo, applying the `Meridian` rebrand, publishing data/config contracts.
- **Claude B** — `meridian-triage` CLI: photos folder → `Memory[]` JSON.
- **Claude C (you)** — this brief.

Background: read `docs/open-source-brainstorm.md` and `README.md`. Schema authority: `app/src/types/memory.ts`. Look at `data/memories-2024.json` for examples of well-formed entries.

## Goal

Two deliverables that together turn a clone of the Meridian repo into something a stranger can immediately understand and try:

1. **Demo content** — a fake 5-day NY trip, ~10 memories, watercolour images, no human likenesses. Ships as the default dataset.
2. **Marketing site** — single-page landing at `marketing/`, deployable via GitHub Pages.

## Deliverable 1 — Demo content

### Memory beats (target ~10 entries)

Pick a real 5-day window (e.g. 2024-09-23 → 2024-09-27) and stick with it so historical weather is consistent.

| #  | Day | Title (suggested)         | Location                          | Transport |
|----|-----|---------------------------|-----------------------------------|-----------|
| 1  | 1   | "Wheels down at JFK"      | JFK Airport                       | plane     |
| 2  | 1   | "Hotel check-in"          | Any well-known Manhattan hotel    | car       |
| 3  | 1   | "First night dinner"      | A real restaurant in Manhattan    | walking   |
| 4  | 2   | "Liberty by boat"         | Statue of Liberty                 | boat      |
| 5  | 2   | "Times Square"            | Times Square                      | metro     |
| 6  | 3   | "Central Park afternoon"  | Central Park                      | walking   |
| 7  | 3   | "Brooklyn Bridge crossing"| Brooklyn Bridge                   | walking   |
| 8  | 4   | "MoMA"                    | Museum of Modern Art              | metro     |
| 9  | 4   | "Final dinner"            | A real restaurant                 | walking   |
| 10 | 5   | "Wheels up"               | JFK Airport                       | plane     |

Real coordinates, real historical weather (Open-Meteo Archive — see `scripts/backfill-weather.ts` for the integration pattern), short evocative `caption` text, fake first-name pronouns only ("we" / "they"), no real people referenced.

### Output structure

```
data/demo/
  memories.json         # Memory[] matching app/src/types/memory.ts
  photos/               # one watercolour image per memory
    01-jfk-arrival.jpg
    02-hotel.jpg
    ...
  README.md             # what this is, image generation prompt(s)
```

### Watercolour image set

- One image per memory entry. Filenames in `photos[]` arrays match files in `data/demo/photos/`.
- AI-generated, watercolour style, **landmarks/scenes/food only — no human likenesses**. Reduces licensing exposure.
- Consistent palette across all 10 so they read as a set.
- Roughly match dimensions of `app/public/photos/full/` (check existing files for size).
- Format: web-optimized JPG.
- Document the generation prompt(s) used in `data/demo/README.md` so a fork can regenerate or restyle.

## Deliverable 2 — Marketing site

Single-page static landing page at `marketing/`. Goal: a GitHub visitor understands what Meridian is in <30 seconds and clicks "fork" or "demo".

### Required sections

1. **Hero** — title (use `Meridian` from Claude A's rebrand), tagline, ambient hero animation OR a screen recording of the demo running.
2. **What is this** — 2 sentences max.
3. **How it works** — 3-step illustration: drop in photos → run `meridian-triage` → host.
4. **Live demo** — link to the deployed demo (using `data/demo/`).
5. **Install snippet** — `git clone … && bun install && bun run dev`.
6. **Footer** — GitHub repo link, MIT license.

### Tech

- Plain HTML/CSS/JS at `marketing/index.html`. No framework. No build step.
- Reuse fonts/colors from the app where they exist (peek `app/src/styles/global.css`).
- Mobile-friendly.
- Deployable as a GitHub Pages source directory.

### Out of scope

- Multi-page site, blog, docs subsite.
- Analytics, signup forms, newsletters.
- Translations (Claude A owns i18n machinery for the app; marketing stays English).

## Acceptance criteria

- `data/demo/memories.json` parses as `Memory[]` and the app renders all 10 without errors.
- All entries have populated `location`, `weather`, `date`, `title`, `caption`, `photos`, `transport`.
- `data/demo/photos/` contains ≥10 watercolour images matching `photos[]` references. Manual visual check: no human likenesses.
- `marketing/index.html` opens in a browser with no console errors. Hero, three-step section, install command, demo link, footer all render correctly.
- `marketing/` is self-contained and works as a GitHub Pages source.
- `data/demo/README.md` documents the image-generation prompt(s) used.

## Definition of done

- App run with `data/demo/memories.json` as the active dataset plays through all 10 entries cleanly.
- `marketing/` deploys to a local static server (`bun --bun serve marketing/` or any equivalent) and renders correctly.
- No changes outside `data/demo/` and `marketing/`.

## Coordination notes

- The rebrand name (likely `Meridian`) appears in marketing copy and demo `README.md`. Until Claude A confirms, use `Meridian` as a working assumption.
- Do not modify:
  - `app/src/` (Claude A's territory — i18n, theming, components)
  - `tools/triage/` (Claude B's territory)
  - `data/memories-{2024,2025,2026}.json` (Claude A is removing these — they contain personal data)
- The demo can be generated *using* Claude B's CLI as dogfood — but B may not be ready in time. If so, hand-author `memories.json` referencing real coordinates + Open-Meteo weather lookups, matching what B would have produced.
