# Task: Set Up Scroll-Driven Map Testing Infrastructure

## Context

This is a birthday app that shows memories on a scroll-driven timeline. As you scroll, cards appear with photos, and a map in the background shows travel lines drawn between locations. The map uses maplibre-gl.

The biggest challenge has been getting the **map camera behavior** right during scroll transitions. We have Playwright set up (`app/playwright.config.ts`, `app/e2e/`) but the current tests use `scrollToSection(sectionId, progress)` which jumps directly to a scroll position. This doesn't replicate the actual scroll experience — it misses intermediate frames and timing issues.

## What We Need

### 1. Smooth Scroll Simulation

Instead of jumping to positions, simulate actual scrolling with small increments (like a user scrolling with a mouse wheel). This reveals issues that snapshot-based testing misses:

```ts
// Instead of:
await scrollToSection(page, 'section-transition-5', 0.5);

// We need:
await smoothScrollToSection(page, 'section-transition-5', 0.5, { 
  steps: 20,        // number of intermediate scroll positions
  stepDelay: 50,    // ms between steps
});
```

### 2. Per-Frame Camera Validation

On every scroll step, capture and validate:
- Map center (lng, lat)
- Map zoom level
- Whether `dotFrom` and `dotTo` are visible in the viewport (use `map.project()` to get pixel coords, check if within bounds)
- The current `phase`, `progress`, `transitionType` from `window.__scrollState`
- The `viewA`, `viewB`, `travelFrom`, `travelTo` from `window.__viewState`

These are already exposed on `window` — see `app/src/App.tsx` and `app/src/components/MapCanvas.tsx` for the `__scrollState`, `__viewState`, and `__mlMap` globals.

### 3. Test Fixture Data

**Do NOT test against the real `data/memories-*.json` files.** Those change as the user adds memories, which breaks tests and shifts indices.

Create a fixture file `app/e2e/fixtures/test-memories.json` with a small, stable set of ~8 memories designed to cover all camera scenarios:

```json
[
  { "id": "test-nearby-a", "title": "Nearby A", "location": { "lat": 50.8798, "lng": 4.7005, "name": "Leuven" }, ... },
  { "id": "test-nearby-b", "title": "Nearby B", "location": { "lat": 50.8985, "lng": 4.6717, "name": "Herent" }, ... },
  { "id": "test-medium-dist", "title": "Medium Distance", "location": { "lat": 51.0538, "lng": 3.7250, "name": "Gent" }, ... },
  { "id": "test-far", "title": "Far Away", "location": { "lat": 48.8566, "lng": 2.3522, "name": "Paris" }, ... },
  { "id": "test-same-loc", "title": "Same Location", "location": { "lat": 50.8798, "lng": 4.7005, "name": "Leuven" }, ... },
  { "id": "test-milestone", "title": "6 Months", "type": "milestone" },
  { "id": "test-after-milestone", "title": "After Milestone", "location": { "lat": 50.8459, "lng": 4.3567, "name": "Brussels" }, ... },
  { "id": "test-return", "title": "Return Close", "location": { "lat": 50.8798, "lng": 4.7005, "name": "Leuven" }, ... }
]
```

This gives us these transitions to test:

| # | From → To | Distance | Scenario | What to verify |
|---|-----------|----------|----------|----------------|
| 0 | Opening → Nearby A | - | Opening | Converging lines, camera eases to show Gent+Herent+dest |
| 1 | Nearby A → Nearby B | ~5km | Ease-in | Both dots visible, gentle zoom in |
| 2 | Nearby B → Medium Distance | ~80km | Ease-out | Smooth zoom out, dots always visible |
| 3 | Medium Distance → Far Away | ~250km | Ease-out (long) | Big zoom out, dots always visible |
| 4 | Far Away → Same Location | ~250km back | Ease-in (from wide) | Zoom in from wide Paris view |
| 5 | Same Location → Same Location | 0km | Same-location | No camera change, card crossfade only |
| 6 | Same Location → Milestone | - | To-milestone | Map dims, no camera change |
| 7 | Milestone → After Milestone | - | From-milestone | Map undims, camera adjusts |
| 8 | After Milestone → Return Close | ~40km | Ease-out (small) | Small zoom out |

The app needs to load this fixture data instead of the real data during e2e tests. Options:
- **Query param**: `http://localhost:5173/?fixture=test` — the data loader checks for this and loads the fixture
- **Intercept**: Playwright intercepts the fetch/import of the JSON files and returns fixture data

The query param approach is simplest. Modify `app/src/data/loader.ts` to check `new URLSearchParams(window.location.search).get('fixture')` and load from a different path. The fixture JSON lives in `app/public/fixtures/test-memories.json` so it's served statically.

Each memory in the fixture needs all required fields (see `app/src/types/memory.ts` for the shape). Use placeholder photos or empty arrays — the camera tests don't need real images.

### 4. Transition-Specific Test Scenarios

For each transition in the fixture data: scroll through the entire transition and assert that **both dots are always visible** (within viewport with margin).

### 4. Visual Regression via Screenshots

At each hold state and at 0%, 25%, 50%, 75%, 100% of each transition, capture a screenshot. Store in `app/e2e/screenshots/` (gitignored). This gives us a visual filmstrip to review.

### 5. Camera Smoothness Assertion

Between consecutive frames, assert that:
- Zoom doesn't change by more than X per step (no jumps)
- Center doesn't teleport (lng/lat delta within reasonable range for the zoom change)

## Technical Details

### Architecture

- `app/src/components/MapCanvas.tsx` — map init, hold camera, opening camera
- `app/src/components/EaseInCamera.tsx` — camera during transitions where both dots are visible (zoom in)
- `app/src/components/EaseOutCamera.tsx` — camera during transitions where destination is not visible (zoom out)
- `app/src/components/OpeningTransition.tsx` — two converging lines from Gent+Herent to first memory
- `app/src/App.tsx` — orchestrates everything, determines which camera scenario applies
- `app/src/utils/camera.ts` — `computeTargetCamera()` and `isPointVisible()` utilities

### Key Globals for Testing

```ts
window.__mlMap        // maplibre Map instance
window.__scrollState  // { activeIndex, phase, progress, transitionType }
window.__viewState    // { viewA, viewB, travelFrom, travelTo, lineProgress }
```

### Scroll System

Uses Lenis smooth scroll + GSAP ScrollTrigger. Scroll sections are div elements with IDs like `section-hold-0`, `section-transition-1`, etc. Each has a height in `vh` units. Progress 0→1 maps to scrolling through one section.

### Existing Test Files

- `app/e2e/smoke.spec.ts` — basic app load test
- `app/e2e/map-scroll.spec.ts` — snapshot-based diagnostic (captures state at specific positions)
- `app/e2e/beleuvenissen.spec.ts` — transition-specific dot visibility test
- `app/e2e/dot-debug.spec.ts`, `dot-closeup.spec.ts`, `camera-compare.spec.ts`, `dots-visible.spec.ts` — various debugging tests

### Running Tests

```bash
cd app
bun run test          # unit tests (vitest)
bun run test:e2e      # playwright tests
bunx playwright test e2e/map-scroll.spec.ts  # specific test
```

The Vite dev server runs separately in Windows (user starts it manually with `bun run dev`). Playwright config has `reuseExistingServer: true`. Do NOT try to kill processes on port 5173.

### Constraints

- Use `bun`/`bunx`, not `npm`/`npx`
- Don't commit, push, or add dependencies without asking
- The `app/e2e/screenshots/` and `app/test-results/` directories are gitignored
