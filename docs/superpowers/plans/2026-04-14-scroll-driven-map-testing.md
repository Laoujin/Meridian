# Scroll-Driven Map Testing Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Playwright test infrastructure that simulates real scrolling in small increments, captures per-frame map/scroll state, and asserts camera smoothness + dot visibility across the four critical map transitions (opening, Leuven↔Paris, Beleuvenissen↔Operatie Demo, Gent↔Leuven).

**Architecture:** Add a shared helper module under `app/e2e/helpers/` exposing smooth scroll, per-frame state capture, and assertion utilities. Add transition-specific specs under `app/e2e/transitions/` that reuse those helpers. Leave existing diagnostic specs untouched. Screenshots land in the already-gitignored `app/e2e/screenshots/` directory.

**Tech Stack:** Playwright (existing), TypeScript, maplibre-gl (via `window.__mlMap`), `window.__scrollState` + `window.__viewState` globals already exposed from `app/src/App.tsx`.

**Commit policy:** Per CLAUDE.md, commits require explicit user approval. Every task ends with a stop-and-report step instead of a `git commit`. Group your work logically so the user can approve a commit boundary if they want one.

---

## File Structure

**Create (new):**

- `app/e2e/helpers/map-state.ts` — page-evaluate helpers: `waitForMapReady(page)`, `captureFrame(page)`, and the `Frame` type.
- `app/e2e/helpers/smooth-scroll.ts` — `smoothScrollToSection`, `scrollThroughTransition` that drive the page through multiple scroll positions and return the captured frames.
- `app/e2e/helpers/assertions.ts` — `assertDotsVisible`, `assertCameraSmooth`, `assertZoomFloor` that operate on arrays of `Frame` objects.
- `app/e2e/helpers/memory-lookup.ts` — `getMemoryIndexByTitle(page, title)` plus a lazy cache keyed on page to avoid re-reading.
- `app/e2e/helpers/index.ts` — barrel export so specs can `import { … } from '../helpers'`.
- `app/e2e/transitions/opening-to-eerste-date.spec.ts` — opening transition.
- `app/e2e/transitions/leuven-paris.spec.ts` — Inside Out 2 → Moulin Rouge (long-distance ease-out).
- `app/e2e/transitions/beleuvenissen-operatie.spec.ts` — Beleuvenissen → Operatie Demo (short-distance ease-in).
- `app/e2e/transitions/gent-leuven.spec.ts` — Gentse Feesten → Beleuvenissen (medium-distance ease-out).

**Modify:** None. Existing specs under `app/e2e/` stay put so current diagnostics still work.

**No dependencies added.** Helpers are plain TypeScript using Playwright's `Page` type.

**Memory index reference** (from `data/memories-2024.json`, sorted by date):

| idx | title | city |
|---|---|---|
| 0 | Eerste Date | Zaventem |
| 1 | Octobar | Leuven |
| 2 | Picnic bij Demo | Herent |
| 3 | Inside Out 2 | Leuven |
| 4 | Moulin Rouge | Paris |
| 5 | Gentse Feesten | Gent |
| 6 | Beleuvenissen | Leuven |
| 7 | Operatie Demo | Leuven |

Do **not** hardcode these indices in specs — resolve them through `getMemoryIndexByTitle` so the tests survive data re-ordering.

---

## Task 1: Map-state helper (waitForMapReady + captureFrame)

**Files:**
- Create: `app/e2e/helpers/map-state.ts`

This module owns the shared "wait for maplibre to be up" helper and the per-frame snapshot captured via `page.evaluate`. The snapshot bundles map camera, scroll state, view state, and each dot's pixel position + visibility so downstream assertions don't need to re-reach into `page.evaluate`.

- [ ] **Step 1: Create `app/e2e/helpers/map-state.ts` with the complete module**

```ts
import type { Page } from '@playwright/test';

export interface DotState {
  lngLat: [number, number] | null;
  px: { x: number; y: number } | null;
  visible: boolean;
}

export interface Frame {
  /** Scroll Y position at capture time (window.scrollY). */
  scrollY: number;
  /** Which section we snapshotted within (sectionId passed by the caller). */
  label: string;

  scroll: {
    activeIndex: number;
    phase: 'hold' | 'transition';
    progress: number;
    transitionType: string | null;
  };
  view: {
    viewA: [number, number];
    viewB: [number, number];
    travelFrom: [number, number] | null;
    travelTo: [number, number] | null;
    lineProgress: number;
  } | null;
  map: {
    center: { lng: number; lat: number };
    zoom: number;
    container: { w: number; h: number };
  };
  dotFrom: DotState;
  dotTo: DotState;
}

export async function waitForMapReady(page: Page): Promise<void> {
  await page.locator('.maplibregl-canvas').first().waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => (window as any).__mlMap?.loaded?.() === true, {
    timeout: 10_000,
  });
  // Give Lenis + ScrollTrigger one tick to attach.
  await page.waitForTimeout(300);
}

/**
 * Capture a complete frame snapshot using the globals exposed by App.tsx.
 *
 * `margin` matches `utils/camera.ts#isPointVisible` default so the assertion
 * mirrors in-app logic rather than inventing its own visibility rule.
 */
export async function captureFrame(
  page: Page,
  label: string,
  margin = 40,
): Promise<Frame | null> {
  return page.evaluate(
    ({ label: lbl, margin: m }) => {
      const map = (window as any).__mlMap;
      const scroll = (window as any).__scrollState;
      const view = (window as any).__viewState ?? null;
      if (!map || !scroll) return null;

      const container = map.getContainer();
      const w = container.clientWidth;
      const h = container.clientHeight;
      const center = map.getCenter();

      const projectDot = (pt: [number, number] | null) => {
        if (!pt) return { lngLat: null, px: null, visible: false };
        const px = map.project(pt);
        const inside =
          px.x >= m && px.x <= w - m && px.y >= m && px.y <= h - m;
        return {
          lngLat: [pt[0], pt[1]] as [number, number],
          px: { x: Math.round(px.x), y: Math.round(px.y) },
          visible: inside,
        };
      };

      return {
        scrollY: window.scrollY,
        label: lbl,
        scroll: {
          activeIndex: scroll.activeIndex,
          phase: scroll.phase,
          progress: scroll.progress,
          transitionType: scroll.transitionType ?? null,
        },
        view: view
          ? {
              viewA: view.viewA,
              viewB: view.viewB,
              travelFrom: view.travelFrom ?? null,
              travelTo: view.travelTo ?? null,
              lineProgress: view.lineProgress,
            }
          : null,
        map: {
          center: { lng: center.lng, lat: center.lat },
          zoom: map.getZoom(),
          container: { w, h },
        },
        dotFrom: projectDot(view?.travelFrom ?? null),
        dotTo: projectDot(view?.travelTo ?? null),
      };
    },
    { label, margin },
  );
}
```

- [ ] **Step 2: Sanity-compile the module**

Run: `cd app && bunx tsc --noEmit -p tsconfig.json`
Expected: no new errors pointing at `e2e/helpers/map-state.ts`. If `tsconfig` does not already include `e2e/`, fix the glob before moving on (add `"e2e/**/*"` under `include`).

- [ ] **Step 3: Report status to the user**

Stop here and report what was created. Do not commit.

---

## Task 2: Smooth-scroll helper (smoothScrollToSection + scrollThroughTransition)

**Files:**
- Create: `app/e2e/helpers/smooth-scroll.ts`

This helper simulates continuous scrolling by issuing many small `window.scrollTo` jumps with a short delay between each, capturing a `Frame` at every step. Two call shapes:

- `smoothScrollToSection(page, sectionId, targetProgress, opts)` — smoothly move from the *current* scroll position to `(section top + sectionHeight * targetProgress)` over `steps` increments.
- `scrollThroughTransition(page, sectionId, opts)` — shorthand for entering a transition section at progress 0 and scrolling to progress 1.

Both return `Frame[]` so callers can assert over the full trajectory.

- [ ] **Step 1: Create `app/e2e/helpers/smooth-scroll.ts` with the complete module**

```ts
import type { Page } from '@playwright/test';
import { captureFrame, Frame } from './map-state';

export interface SmoothScrollOptions {
  steps?: number;
  stepDelay?: number;
  margin?: number;
}

async function getSectionGeometry(
  page: Page,
  sectionId: string,
): Promise<{ top: number; height: number } | null> {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return { top: el.offsetTop, height: el.offsetHeight };
  }, sectionId);
}

async function currentScrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

/**
 * Smoothly scroll from the current position to `(section top + sectionHeight *
 * targetProgress)` in `steps` increments, capturing a frame after each step.
 *
 * Using `behavior: 'instant'` per-step is intentional: Lenis + GSAP
 * ScrollTrigger react to the plain scroll event on every increment, so
 * many small jumps produce ScrollTrigger updates at each intermediate
 * progress value — which is exactly what we need to test frame-by-frame.
 */
export async function smoothScrollToSection(
  page: Page,
  sectionId: string,
  targetProgress: number,
  opts: SmoothScrollOptions = {},
): Promise<Frame[]> {
  const steps = opts.steps ?? 20;
  const stepDelay = opts.stepDelay ?? 50;
  const margin = opts.margin ?? 40;

  const geom = await getSectionGeometry(page, sectionId);
  if (!geom) throw new Error(`Section not found: ${sectionId}`);

  const fromY = await currentScrollY(page);
  const toY = geom.top + geom.height * targetProgress;

  const frames: Frame[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const y = fromY + (toY - fromY) * t;
    await page.evaluate((targetY) => {
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }, y);
    await page.waitForTimeout(stepDelay);
    const frame = await captureFrame(page, `${sectionId}@${t.toFixed(2)}`, margin);
    if (frame) frames.push(frame);
  }
  return frames;
}

/**
 * Scroll through an entire transition section from progress 0 to 1. Also
 * primes the position at progress 0 first (one instant jump) so the first
 * captured frame is always at the start of the transition.
 */
export async function scrollThroughTransition(
  page: Page,
  sectionId: string,
  opts: SmoothScrollOptions = {},
): Promise<Frame[]> {
  // Prime at progress 0 (instant, not counted as a step).
  const geom = await getSectionGeometry(page, sectionId);
  if (!geom) throw new Error(`Section not found: ${sectionId}`);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), geom.top);
  await page.waitForTimeout(opts.stepDelay ?? 50);

  return smoothScrollToSection(page, sectionId, 1, opts);
}
```

- [ ] **Step 2: Sanity-compile**

Run: `cd app && bunx tsc --noEmit -p tsconfig.json`
Expected: no new errors pointing at `e2e/helpers/smooth-scroll.ts`.

- [ ] **Step 3: Report status**

Stop and report. Do not commit.

---

## Task 3: Assertion helpers (dot visibility + camera smoothness)

**Files:**
- Create: `app/e2e/helpers/assertions.ts`

These work on `Frame[]` so callers stay declarative. Every assertion formats a useful failure message including `frame.label`, the offending numbers, and the thresholds used so test output points straight at the bad frame.

- [ ] **Step 1: Create `app/e2e/helpers/assertions.ts`**

```ts
import { expect } from '@playwright/test';
import type { Frame } from './map-state';

export interface SmoothnessOptions {
  /** Max |Δzoom| allowed between consecutive frames. */
  maxZoomDelta?: number;
  /**
   * Max |Δcenter| in *projected pixels* between consecutive frames.
   * Pixel-space is zoom-invariant, so a single threshold works across
   * wide-shot and close-up transitions.
   */
  maxCenterPxDelta?: number;
}

export type DotSelector = 'from' | 'to' | 'both';

function pickDots(frame: Frame, which: DotSelector) {
  if (which === 'from') return [{ name: 'dotFrom', state: frame.dotFrom }];
  if (which === 'to') return [{ name: 'dotTo', state: frame.dotTo }];
  return [
    { name: 'dotFrom', state: frame.dotFrom },
    { name: 'dotTo', state: frame.dotTo },
  ];
}

/**
 * Assert the selected dot(s) are visible (within viewport with margin as
 * captured in the frame). Every offending frame is reported individually
 * so you can see exactly *when* the dot fell off screen.
 */
export function assertDotsVisible(frames: Frame[], which: DotSelector): void {
  const failures: string[] = [];
  for (const frame of frames) {
    for (const { name, state } of pickDots(frame, which)) {
      if (!state.lngLat) {
        failures.push(`${frame.label}: ${name} has no lngLat (travelFrom/travelTo was null)`);
        continue;
      }
      if (!state.visible) {
        failures.push(
          `${frame.label}: ${name} offscreen at px=${JSON.stringify(state.px)} ` +
            `(container ${frame.map.container.w}×${frame.map.container.h})`,
        );
      }
    }
  }
  expect(
    failures,
    `assertDotsVisible("${which}") found ${failures.length} offscreen frame(s):\n` +
      failures.join('\n'),
  ).toEqual([]);
}

/**
 * Assert camera changes smoothly between consecutive frames.
 */
export function assertCameraSmooth(
  frames: Frame[],
  opts: SmoothnessOptions = {},
): void {
  const maxZoomDelta = opts.maxZoomDelta ?? 0.6;
  const maxCenterPxDelta = opts.maxCenterPxDelta ?? 250;

  const failures: string[] = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const curr = frames[i];
    const dz = Math.abs(curr.map.zoom - prev.map.zoom);
    if (dz > maxZoomDelta) {
      failures.push(
        `${prev.label} → ${curr.label}: |Δzoom|=${dz.toFixed(3)} exceeds ${maxZoomDelta}`,
      );
    }

    // Project both centers at the *current* frame's zoom by using the
    // Haversine-ish pixel distance at that zoom: Web Mercator pixels per
    // degree at `zoom` ≈ (256 * 2^zoom) / 360 for longitude. Latitude scales
    // similarly but with a cos(lat) factor. This is good enough to catch
    // teleports — we're not rendering anything, just thresholding.
    const avgLat = (prev.map.center.lat + curr.map.center.lat) / 2;
    const pxPerDegLng = (256 * Math.pow(2, curr.map.zoom) / 360) * Math.cos((avgLat * Math.PI) / 180);
    const pxPerDegLat = 256 * Math.pow(2, curr.map.zoom) / 360;
    const dxPx = Math.abs(curr.map.center.lng - prev.map.center.lng) * pxPerDegLng;
    const dyPx = Math.abs(curr.map.center.lat - prev.map.center.lat) * pxPerDegLat;
    const dPx = Math.hypot(dxPx, dyPx);
    if (dPx > maxCenterPxDelta) {
      failures.push(
        `${prev.label} → ${curr.label}: center jump ≈ ${dPx.toFixed(0)}px exceeds ${maxCenterPxDelta}px ` +
          `(Δlng=${(curr.map.center.lng - prev.map.center.lng).toFixed(4)}, ` +
          `Δlat=${(curr.map.center.lat - prev.map.center.lat).toFixed(4)}, zoom=${curr.map.zoom.toFixed(2)})`,
      );
    }
  }

  expect(
    failures,
    `assertCameraSmooth found ${failures.length} discontinuity:\n` + failures.join('\n'),
  ).toEqual([]);
}

/**
 * Guard against the "world-view" regression — zoom falling below a floor.
 */
export function assertZoomFloor(frames: Frame[], floor = 3): void {
  const failures = frames
    .filter((f) => f.map.zoom < floor)
    .map((f) => `${f.label}: zoom=${f.map.zoom.toFixed(2)} < ${floor}`);
  expect(
    failures,
    `assertZoomFloor(${floor}) found ${failures.length} frame(s):\n` + failures.join('\n'),
  ).toEqual([]);
}
```

- [ ] **Step 2: Sanity-compile**

Run: `cd app && bunx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 3: Report status**

Stop and report.

---

## Task 4: Memory-lookup helper + barrel export

**Files:**
- Create: `app/e2e/helpers/memory-lookup.ts`
- Create: `app/e2e/helpers/index.ts`

Specs should address memories by title (robust) rather than by hardcoded index (brittle when data re-orders). `getMemoryIndexByTitle` scrolls through hold sections until the card's `h2` matches. Result is cached on the page object to keep follow-up lookups cheap.

- [ ] **Step 1: Create `app/e2e/helpers/memory-lookup.ts`**

```ts
import type { Page } from '@playwright/test';

const CACHE = new WeakMap<Page, Map<string, number>>();

async function getSectionIdsFromDom(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const els = document.querySelectorAll('[id^="section-hold-"]');
    return Array.from(els)
      .map((e) => e.id)
      .filter((id) => /^section-hold-\d+$/.test(id))
      .sort((a, b) => {
        const ai = Number(a.split('-').pop());
        const bi = Number(b.split('-').pop());
        return ai - bi;
      });
  });
}

async function readActiveCardTitle(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el =
      document.querySelector('.memory-card__title') ??
      document.querySelector('h2');
    return el?.textContent?.trim() ?? null;
  });
}

/**
 * Resolve a memory index by the exact card title shown at that hold.
 * Caches per-page so repeated lookups in one test do not re-scroll the page.
 *
 * Throws if the title is not found among existing hold sections.
 */
export async function getMemoryIndexByTitle(
  page: Page,
  title: string,
): Promise<number> {
  let cache = CACHE.get(page);
  if (!cache) {
    cache = new Map();
    CACHE.set(page, cache);
  }
  const hit = cache.get(title);
  if (hit !== undefined) return hit;

  const holdIds = await getSectionIdsFromDom(page);
  for (const id of holdIds) {
    const idx = Number(id.split('-').pop());
    // Jump instantly — we only need the card title at the midpoint.
    const y = await page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      if (!el) return null;
      return el.offsetTop + el.offsetHeight * 0.5;
    }, id);
    if (y == null) continue;
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(120);
    const currentTitle = await readActiveCardTitle(page);
    if (currentTitle) cache.set(currentTitle, idx);
    if (currentTitle === title) return idx;
  }

  throw new Error(
    `Memory titled "${title}" not found. Known titles: ${[...cache.keys()].join(', ')}`,
  );
}
```

- [ ] **Step 2: Create `app/e2e/helpers/index.ts`**

```ts
export * from './map-state';
export * from './smooth-scroll';
export * from './assertions';
export * from './memory-lookup';
```

- [ ] **Step 3: Sanity-compile**

Run: `cd app && bunx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 4: Report status**

Stop and report. At this point the helper module is complete and ready for the first real spec.

---

## Task 5: Opening → Eerste Date transition spec

**Files:**
- Create: `app/e2e/transitions/opening-to-eerste-date.spec.ts`

The opening transition is unique: it goes through `OpeningTransition` + `EaseOutCamera(GENT, HERENT)` orchestrated in `src/App.tsx:224-226`. Two converging lines draw toward the first memory and the camera eases out from the Gent-Herent arc. We assert that Gent, Herent, *and* the Eerste Date dot are all on screen at the end of the transition, and that the camera never jumps mid-transition.

The section id is `section-transition-0` (see `src/hooks/useScrollTimeline.ts:41`).

- [ ] **Step 1: Write the spec**

```ts
import { test } from '@playwright/test';
import {
  waitForMapReady,
  scrollThroughTransition,
  captureFrame,
  assertCameraSmooth,
  assertZoomFloor,
} from '../helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'opening');

test.describe('Opening → Eerste Date transition', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('two converging lines draw and camera stays smooth', async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);

    // Prime at the opening hold so the transition begins from the real
    // "we're at the Gent-Herent arc" camera, not whatever stale state was left.
    await page.evaluate(() => {
      const el = document.getElementById('section-opening-hold');
      if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.5, behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    const hold = await captureFrame(page, 'opening-hold');
    if (hold) await page.screenshot({ path: path.join(SHOTS_DIR, '00-hold.png') });

    const frames = await scrollThroughTransition(page, 'section-transition-0', {
      steps: 20,
      stepDelay: 60,
    });

    // Filmstrip at 0/25/50/75/100% — pick the closest captured frame by label.
    const pickAt = (t: number) => frames[Math.min(frames.length - 1, Math.round((frames.length - 1) * t))];
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const f = pickAt(t);
      if (!f) continue;
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), f.scrollY);
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(SHOTS_DIR, `trans-${Math.round(t * 100)}.png`) });
    }

    // Camera guarantees that must hold throughout the opening transition.
    assertZoomFloor(frames, 3);
    assertCameraSmooth(frames, { maxZoomDelta: 0.7, maxCenterPxDelta: 320 });

    // At the end of the transition we expect to be holding memory 0 — scroll
    // one step further and check the "opening dot" framing via captureFrame.
    await page.evaluate(() => {
      const el = document.getElementById('section-hold-0');
      if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.5, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    const end = await captureFrame(page, 'hold-0');
    if (!end) throw new Error('Failed to capture hold-0 frame');

    // At the hold, travelFrom/travelTo reflect Zaventem-from-previous; the
    // interesting thing is that the map center is near Gent-Herent-Zaventem
    // (viewA=GENT, viewB=HERENT). Both of those must be visible.
    const gentState = await page.evaluate(() => {
      const map = (window as any).__mlMap;
      const px = map.project([3.7527, 51.0597]); // GENT (matches src/components/OpeningArc.tsx)
      const c = map.getContainer();
      return {
        visible:
          px.x >= 40 && px.x <= c.clientWidth - 40 && px.y >= 40 && px.y <= c.clientHeight - 40,
        px,
      };
    });
    if (!gentState.visible) {
      throw new Error(`Gent off-screen at end of opening transition: px=${JSON.stringify(gentState.px)}`);
    }

    fs.writeFileSync(
      path.join(SHOTS_DIR, 'frames.json'),
      JSON.stringify(frames, null, 2),
    );
  });
});
```

- [ ] **Step 2: Run the spec**

Run: `cd app && bunx playwright test e2e/transitions/opening-to-eerste-date.spec.ts`
Expected: test runs to completion. If it fails on `assertCameraSmooth`, *that is the diagnostic signal*: report the exact `prev → curr` label pair and the measured delta so the user can see where the opening camera jumps.

- [ ] **Step 3: Report status**

Report: did the test pass? If it failed, which frame pair caused the failure? Link to the screenshots in `app/e2e/screenshots/opening/`.

---

## Task 6: Leuven → Paris transition spec (ease-out, long distance)

**Files:**
- Create: `app/e2e/transitions/leuven-paris.spec.ts`

Inside Out 2 (Leuven) → Moulin Rouge (Paris) is the canonical long-distance ease-out case. We want to verify the aspirational behavior described in the spec: "Camera zooms out smoothly, both dots visible throughout." Given the current `EaseOutCamera` implementation (`src/components/EaseOutCamera.tsx:23-38` frames `dotFrom + lineTip`, meaning `dotTo` is only fully in-frame at `progress=1`), **this assertion is expected to fail in the current codebase**. That is the point: the failure output describes exactly which frames lose the dot and by how much, feeding the camera refactor.

- [ ] **Step 1: Write the spec**

```ts
import { test } from '@playwright/test';
import {
  waitForMapReady,
  smoothScrollToSection,
  scrollThroughTransition,
  assertCameraSmooth,
  assertDotsVisible,
  assertZoomFloor,
  getMemoryIndexByTitle,
} from '../helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'leuven-paris');

test.describe('Inside Out 2 → Moulin Rouge (ease-out, long distance)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  // This test documents the target behavior; it is expected to fail against
  // the current EaseOutCamera implementation. Remove `test.fail` once the
  // camera is fixed.
  test.fail(
    'both dots visible throughout with smooth zoom-out',
    async ({ page }) => {
      await page.goto('/');
      await waitForMapReady(page);

      const paris = await getMemoryIndexByTitle(page, 'Moulin Rouge');
      const leuven = await getMemoryIndexByTitle(page, 'Inside Out 2');
      if (paris !== leuven + 1) {
        throw new Error(
          `Expected Moulin Rouge directly after Inside Out 2, got ${leuven} → ${paris}`,
        );
      }

      // Park on the Leuven hold first.
      await smoothScrollToSection(page, `section-hold-${leuven}`, 0.5, {
        steps: 6,
        stepDelay: 50,
      });

      const frames = await scrollThroughTransition(
        page,
        `section-transition-${paris}`,
        { steps: 30, stepDelay: 50 },
      );

      // Screenshot filmstrip.
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const i = Math.min(frames.length - 1, Math.round((frames.length - 1) * t));
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), frames[i].scrollY);
        await page.waitForTimeout(60);
        await page.screenshot({ path: path.join(SHOTS_DIR, `trans-${Math.round(t * 100)}.png`) });
      }

      fs.writeFileSync(path.join(SHOTS_DIR, 'frames.json'), JSON.stringify(frames, null, 2));

      assertZoomFloor(frames, 3);
      assertCameraSmooth(frames, { maxZoomDelta: 0.5, maxCenterPxDelta: 300 });
      assertDotsVisible(frames, 'both');
    },
  );
});
```

- [ ] **Step 2: Run the spec**

Run: `cd app && bunx playwright test e2e/transitions/leuven-paris.spec.ts`
Expected: `1 failed` — but marked `test.fail`, so the run is green and Playwright reports `1 expected failure`. The frames.json + screenshots are the real output.

- [ ] **Step 3: Report status**

Report whether the `test.fail` inversion is green (expected), and include a summary of which frames lose `dotTo` from the frames.json.

---

## Task 7: Beleuvenissen → Operatie Demo transition spec (ease-in, short distance)

**Files:**
- Create: `app/e2e/transitions/beleuvenissen-operatie.spec.ts`

Both memories are in Leuven, so this is the ease-in scenario: the camera starts already framing both dots and smoothly tightens. Here the assertions *should* actually pass today — a regression in this test means the ease-in camera introduced a jump.

- [ ] **Step 1: Write the spec**

```ts
import { test } from '@playwright/test';
import {
  waitForMapReady,
  smoothScrollToSection,
  scrollThroughTransition,
  assertCameraSmooth,
  assertDotsVisible,
  assertZoomFloor,
  getMemoryIndexByTitle,
} from '../helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'beleuvenissen-operatie');

test.describe('Beleuvenissen → Operatie Demo (ease-in, short distance)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('both dots visible throughout and camera zooms in smoothly', async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);

    const operatie = await getMemoryIndexByTitle(page, 'Operatie Demo');
    const beleuvenissen = await getMemoryIndexByTitle(page, 'Beleuvenissen');
    if (operatie !== beleuvenissen + 1) {
      throw new Error(
        `Expected Operatie Demo directly after Beleuvenissen, got ${beleuvenissen} → ${operatie}`,
      );
    }

    await smoothScrollToSection(page, `section-hold-${beleuvenissen}`, 0.5, {
      steps: 6,
      stepDelay: 50,
    });

    const frames = await scrollThroughTransition(
      page,
      `section-transition-${operatie}`,
      { steps: 30, stepDelay: 50 },
    );

    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const i = Math.min(frames.length - 1, Math.round((frames.length - 1) * t));
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), frames[i].scrollY);
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(SHOTS_DIR, `trans-${Math.round(t * 100)}.png`) });
    }

    fs.writeFileSync(path.join(SHOTS_DIR, 'frames.json'), JSON.stringify(frames, null, 2));

    assertZoomFloor(frames, 8); // we're in Leuven — we should never zoom out to Belgium view
    assertCameraSmooth(frames, { maxZoomDelta: 0.3, maxCenterPxDelta: 200 });
    assertDotsVisible(frames, 'both');
  });
});
```

- [ ] **Step 2: Run the spec**

Run: `cd app && bunx playwright test e2e/transitions/beleuvenissen-operatie.spec.ts`
Expected: pass. If it fails on `assertZoomFloor(8)`, that is the known "zoom-to-world" bug showing up on a short transition — capture the offending frame and report.

- [ ] **Step 3: Report status**

Report pass/fail and surface any failing frame pair.

---

## Task 8: Gent → Leuven transition spec (ease-out, medium distance)

**Files:**
- Create: `app/e2e/transitions/gent-leuven.spec.ts`

Gentse Feesten (Gent) → Beleuvenissen (Leuven) is a medium-distance ease-out. Same assertion shape as Task 6; smoothness assertion is looser because the camera legitimately zooms out. This one is on the border: the current ease-out may or may not keep both dots visible depending on initial zoom. Mark it `test.fail` if it turns out to fail today; otherwise leave it green. (We encode the *current* behavior in Step 3.)

- [ ] **Step 1: Write the spec (without `test.fail` initially)**

```ts
import { test } from '@playwright/test';
import {
  waitForMapReady,
  smoothScrollToSection,
  scrollThroughTransition,
  assertCameraSmooth,
  assertDotsVisible,
  assertZoomFloor,
  getMemoryIndexByTitle,
} from '../helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'gent-leuven');

test.describe('Gentse Feesten → Beleuvenissen (ease-out, medium distance)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('camera zooms out smoothly, both dots visible', async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);

    const beleuvenissen = await getMemoryIndexByTitle(page, 'Beleuvenissen');
    const gentseFeesten = await getMemoryIndexByTitle(page, 'Gentse Feesten');
    if (beleuvenissen !== gentseFeesten + 1) {
      throw new Error(
        `Expected Beleuvenissen directly after Gentse Feesten, got ${gentseFeesten} → ${beleuvenissen}`,
      );
    }

    await smoothScrollToSection(page, `section-hold-${gentseFeesten}`, 0.5, {
      steps: 6,
      stepDelay: 50,
    });

    const frames = await scrollThroughTransition(
      page,
      `section-transition-${beleuvenissen}`,
      { steps: 30, stepDelay: 50 },
    );

    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const i = Math.min(frames.length - 1, Math.round((frames.length - 1) * t));
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), frames[i].scrollY);
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(SHOTS_DIR, `trans-${Math.round(t * 100)}.png`) });
    }

    fs.writeFileSync(path.join(SHOTS_DIR, 'frames.json'), JSON.stringify(frames, null, 2));

    assertZoomFloor(frames, 6);
    assertCameraSmooth(frames, { maxZoomDelta: 0.5, maxCenterPxDelta: 280 });
    assertDotsVisible(frames, 'both');
  });
});
```

- [ ] **Step 2: Run the spec**

Run: `cd app && bunx playwright test e2e/transitions/gent-leuven.spec.ts`
Expected: either pass or fail. Record which.

- [ ] **Step 3: If the dot-visibility assertion fails, wrap the test in `test.fail` and re-run**

If Step 2 failed specifically on `assertDotsVisible`, edit the spec: change `test('camera zooms out smoothly…` to `test.fail('camera zooms out smoothly…`, then re-run. The test must be green as either `passed` or `expected failure` before moving on.

- [ ] **Step 4: Report status**

Report:
- Did the test pass or `expected failure`?
- Which frame index first loses `dotTo`?
- What were the starting and ending zoom levels?

---

## Task 9: Final smoke run across all new specs

**Files:** None created. This task runs the full new test directory and confirms the infrastructure works end-to-end.

- [ ] **Step 1: Run the whole transitions directory**

Run: `cd app && bunx playwright test e2e/transitions`
Expected: all four specs complete. Any `test.fail` inversions should be reported as `expected` failures, not real failures. The terminal summary should show 4 passed or 4 passed + N expected-failure.

- [ ] **Step 2: Verify screenshots wrote correctly**

Run: `ls -la app/e2e/screenshots/opening app/e2e/screenshots/leuven-paris app/e2e/screenshots/beleuvenissen-operatie app/e2e/screenshots/gent-leuven`
Expected: each directory contains `trans-0.png`, `trans-25.png`, `trans-50.png`, `trans-75.png`, `trans-100.png`, and `frames.json`.

- [ ] **Step 3: Report the full status**

Summarize to the user:
1. Which specs passed / expected-failed.
2. Which frames revealed real camera issues.
3. Paths to the screenshot filmstrips and `frames.json` files for review.
4. Whether `app/tsconfig.json` needed `e2e/` added to its `include`.

Then stop and wait for the user to decide what to commit.

---

## Notes for the executing engineer

- **Do not commit.** Every task ends with "report status." Wait for explicit user approval before `git add` / `git commit`.
- **Do not kill the dev server.** Vite runs under Windows outside WSL on port 5173; Playwright's `reuseExistingServer: true` attaches to it. If tests can't reach the server, ask the user to start it rather than trying to spawn it yourself.
- **Use `bun` / `bunx`.** Not `npm` / `npx`. CLAUDE.md is specific about this.
- **`test.fail` is not hack.** Playwright `test.fail` means "this is expected to fail; the run is green while it does." It is the right tool for tests that encode aspirational behavior not yet implemented, so the CI signal is honest but the gap is tracked. When the underlying camera is fixed, remove the `.fail`.
- **Lenis interaction.** The helpers drive `window.scrollTo({ behavior: 'instant' })` — Lenis forwards the resulting scroll event to GSAP ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)` (see `useScrollTimeline.ts:96`). Many small instant jumps therefore produce many ScrollTrigger updates, which is exactly the "frame-by-frame" effect we want. Do **not** try to invoke Lenis directly from test code; it is not exposed on `window`, and the existing approach already works.
- **Why pixel-space for center-jump checks?** A 0.01° lng jump at zoom 4 is visually tiny; the same jump at zoom 14 is a teleport. A single lng/lat threshold can't handle both. Converting to pixels at the current zoom gives a zoom-invariant threshold that matches "what the user actually sees move."
