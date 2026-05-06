# Meridian Triage UI

A browser-based tool for curating Meridian memories from a folder of photos. Auto-extracts EXIF date + GPS, reverse-geocodes via Nominatim, and fetches historical weather from Open-Meteo Archive — no API keys required.

## Setup

```sh
cd tools/triage
bun install
```

## Usage

```sh
bun run triage <photo-folder>
```

Then open <http://localhost:5174>.

`<photo-folder>` is any directory of `.jpg` / `.jpeg` / `.png` / `.mp4` / `.mov` files.

## What it does

- Lists photo days from the source folder, matched against existing memories in any `data/memories*.json` (auto-detects consolidated `memories.json` or sharded `memories-YYYY.json` layout).
- Drag a photo into a memory entry: the file is copied to `app/public/photos/full/`, EXIF is read, GPS is reverse-geocoded, weather is looked up. Empty entry fields auto-fill; user edits stick.
- Reorder photos within an entry by drag-and-drop.
- Click 🔍 on an in-entry photo to view it full size.
- Click "+ Emoji" to pick decorative emojis (rendered on the memory card).
- Edit the entry JSON directly in the right pane for fields not exposed in the UI.
- Save persists each entry back to its source file (or, for new entries, to `memories.json` if it exists, else `memories-{year}.json`). Year buttons reflect the years derived from entry dates.
- Trash button moves a source photo to `<photo-folder>/.trash/` (recoverable).

## Output

Each saved entry is a `Memory` object — see `app/src/types/memory.ts` for the schema.

## Tests

```sh
bun test
```

All tests are offline. No live calls to Nominatim or Open-Meteo in CI.

## Notes

- Nominatim has a 1 req/s usage policy. The geocoder throttles to 1100ms between calls.
- Open-Meteo Archive is free and supports past dates back to 1940.
- Weather lookups need both a date and GPS coordinates. If either is missing, the weather field stays `null` and a toast appears.
