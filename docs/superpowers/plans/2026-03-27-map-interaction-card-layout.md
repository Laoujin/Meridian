# Map Interaction & Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passive scroll layout with a scroll-driven storytelling experience where scrolling triggers phased transitions: card fade-out, animated travel line on the map, card fade-in at the new location.

**Architecture:** Invisible scroll-track with tall sections drives GSAP ScrollTrigger progress (0-1) per section. All visual elements are `position: fixed`. A central `useScrollTimeline` hook exposes `activeIndex`, `phase`, and `progress` — App distributes these to CardOverlay, MapCanvas, TravelLine, and LocationMarker.

**Tech Stack:** React 19, TypeScript, Maplibre GL, GSAP 3 + ScrollTrigger, Lenis, react-markdown (new), date-fns

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `app/src/utils/geo.ts` | Distance calculation, arc interpolation, line slicing |
| `app/src/utils/transitions.ts` | Determine transition type and section height for a memory pair |
| `app/src/utils/stats.ts` | Compute journey statistics from memories array |
| `app/src/components/CardOverlay.tsx` | Fixed card container, renders active card with GSAP-driven opacity/transform |
| `app/src/components/TravelLine.tsx` | GeoJSON line source + transport marker on map |
| `app/src/components/LocationMarker.tsx` | Pulsing coral dot marker |
| `app/src/components/MilestoneEffect.tsx` | Fireworks/sparkle CSS animation |
| `app/src/components/ClosingSequence.tsx` | Journey overview, stats, gift card |
| `app/src/components/DetailOverlay.tsx` | Full-screen expanded card content with markdown |
| `app/src/styles/milestone-effect.css` | Fireworks particle animation keyframes |
| `app/src/styles/closing.css` | Closing sequence styles |
| `app/src/styles/detail-overlay.css` | Detail overlay styles |
| `app/vitest.config.ts` | Vitest configuration |
| `app/src/utils/__tests__/geo.test.ts` | Tests for geo utilities |
| `app/src/utils/__tests__/transitions.test.ts` | Tests for transition logic |
| `app/src/utils/__tests__/stats.test.ts` | Tests for stats computation |

### Modified Files
| File | Changes |
|------|---------|
| `app/src/hooks/useScrollTimeline.ts` | Rewrite: section-based with progress tracking |
| `app/src/App.tsx` | New scroll-track structure, distribute progress to children |
| `app/src/components/MapCanvas.tsx` | Accept dim/blur prop, expose map ref, remove self-contained opening line logic |
| `app/src/components/MemoryCard.tsx` | Remove self-animation, add Details button |
| `app/src/components/OpeningCard.tsx` | No changes needed (rendered by CardOverlay) |
| `app/src/components/TimelineStrip.tsx` | Progress from section index |
| `app/src/styles/global.css` | Remove scroll-section styles, add card-overlay and location-marker styles |
| `app/package.json` | Add react-markdown, vitest |

---

### Task 1: Set Up Test Infrastructure

**Files:**
- Create: `app/vitest.config.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Install vitest**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun add -d vitest`

- [ ] **Step 2: Create vitest config**

Create `app/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `app/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: "No test files found" (clean exit, no errors)

- [ ] **Step 5: Commit**

```bash
git add app/vitest.config.ts app/package.json app/bun.lock
git commit -m "add vitest test infrastructure"
```

---

### Task 2: Geo Utilities

**Files:**
- Create: `app/src/utils/geo.ts`
- Create: `app/src/utils/__tests__/geo.test.ts`

- [ ] **Step 1: Write failing tests for geo utilities**

Create `app/src/utils/__tests__/geo.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { haversineDistance, interpolateLine, sliceLine, generateArc } from '../geo';

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance([3.75, 51.05], [3.75, 51.05])).toBe(0);
  });

  it('calculates distance between Gent and Herent (~60km)', () => {
    const d = haversineDistance([3.7527, 51.0597], [4.6717, 50.8985]);
    expect(d).toBeGreaterThan(55);
    expect(d).toBeLessThan(70);
  });

  it('calculates distance between Gent and Paris (~260km)', () => {
    const d = haversineDistance([3.7527, 51.0597], [2.3522, 48.8566]);
    expect(d).toBeGreaterThan(240);
    expect(d).toBeLessThan(280);
  });
});

describe('interpolateLine', () => {
  it('returns start point at progress 0', () => {
    const result = interpolateLine([0, 0], [10, 10], 0);
    expect(result).toEqual([0, 0]);
  });

  it('returns end point at progress 1', () => {
    const result = interpolateLine([0, 0], [10, 10], 1);
    expect(result).toEqual([10, 10]);
  });

  it('returns midpoint at progress 0.5', () => {
    const result = interpolateLine([0, 0], [10, 10], 0.5);
    expect(result[0]).toBeCloseTo(5);
    expect(result[1]).toBeCloseTo(5);
  });
});

describe('generateArc', () => {
  it('returns correct number of segments', () => {
    const arc = generateArc([0, 0], [10, 10], 20);
    expect(arc).toHaveLength(21); // segments + 1
  });

  it('starts at start point', () => {
    const arc = generateArc([3, 50], [4, 51], 10);
    expect(arc[0][0]).toBeCloseTo(3);
    expect(arc[0][1]).toBeCloseTo(50);
  });

  it('ends at end point', () => {
    const arc = generateArc([3, 50], [4, 51], 10);
    const last = arc[arc.length - 1];
    expect(last[0]).toBeCloseTo(4);
    expect(last[1]).toBeCloseTo(51);
  });

  it('bows upward at midpoint', () => {
    const arc = generateArc([0, 0], [10, 0], 10, 0.15);
    const mid = arc[5];
    expect(mid[1]).toBeGreaterThan(0); // bowed northward
  });
});

describe('sliceLine', () => {
  it('returns empty array at progress 0', () => {
    const coords: [number, number][] = [[0, 0], [5, 5], [10, 10]];
    expect(sliceLine(coords, 0)).toEqual([[0, 0]]);
  });

  it('returns full line at progress 1', () => {
    const coords: [number, number][] = [[0, 0], [5, 5], [10, 10]];
    expect(sliceLine(coords, 1)).toEqual(coords);
  });

  it('returns partial line at progress 0.5', () => {
    const coords: [number, number][] = [[0, 0], [10, 0]];
    const result = sliceLine(coords, 0.5);
    expect(result).toHaveLength(2);
    expect(result[1][0]).toBeCloseTo(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: FAIL — module `../geo` not found

- [ ] **Step 3: Implement geo utilities**

Create `app/src/utils/geo.ts`:
```typescript
/** Haversine distance in kilometers between two [lng, lat] points. */
export function haversineDistance(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Linearly interpolate between two [lng, lat] points at given progress (0-1). */
export function interpolateLine(
  from: [number, number],
  to: [number, number],
  progress: number,
): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

/** Generate a parabolic arc between two [lng, lat] points. */
export function generateArc(
  start: [number, number],
  end: [number, number],
  segments: number = 50,
  bowAmount: number = 0.15,
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    const bow = bowAmount * Math.sin(t * Math.PI);
    coords.push([lng, lat + bow]);
  }
  return coords;
}

/**
 * Return the first `progress` fraction of a coordinate array.
 * At progress 0 returns [first point]. At progress 1 returns the full array.
 * Intermediate values interpolate between existing vertices.
 */
export function sliceLine(
  coords: [number, number][],
  progress: number,
): [number, number][] {
  if (coords.length < 2 || progress <= 0) return [coords[0]];
  if (progress >= 1) return coords;

  const totalSegments = coords.length - 1;
  const exactIndex = progress * totalSegments;
  const segIndex = Math.floor(exactIndex);
  const segProgress = exactIndex - segIndex;

  const result = coords.slice(0, segIndex + 1);
  if (segIndex < totalSegments) {
    result.push(interpolateLine(coords[segIndex], coords[segIndex + 1], segProgress));
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/utils/geo.ts app/src/utils/__tests__/geo.test.ts
git commit -m "add geo utilities: haversine, interpolation, arc generation, line slicing"
```

---

### Task 3: Transition Utilities

**Files:**
- Create: `app/src/utils/transitions.ts`
- Create: `app/src/utils/__tests__/transitions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/src/utils/__tests__/transitions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getTransitionType, getSectionHeight, TRANSITION_HEIGHTS } from '../transitions';
import type { Memory } from '../../types/memory';

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test', date: '2024-06-12', type: 'date', title: 'Test',
    caption: '', location: { lat: 51.05, lng: 3.75, name: 'Gent' },
    photos: [], coverPhoto: null, heroPhoto: null, music: null,
    weather: null, expandedText: '', expandedPhotos: [], videos: [], tags: [],
    ...overrides,
  };
}

describe('getTransitionType', () => {
  it('returns "standard" for different locations', () => {
    const from = makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } });
    const to = makeMemory({ location: { lat: 50.88, lng: 4.47, name: 'Zaventem' } });
    expect(getTransitionType(from, to)).toBe('standard');
  });

  it('returns "same-location" for same coordinates', () => {
    const from = makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } });
    const to = makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } });
    expect(getTransitionType(from, to)).toBe('same-location');
  });

  it('returns "to-milestone" when target is milestone', () => {
    const from = makeMemory();
    const to = makeMemory({ type: 'milestone', location: null });
    expect(getTransitionType(from, to)).toBe('to-milestone');
  });

  it('returns "from-milestone" when source is milestone', () => {
    const from = makeMemory({ type: 'milestone', location: null });
    const to = makeMemory();
    expect(getTransitionType(from, to)).toBe('from-milestone');
  });

  it('returns "opening" when from is null (opening → first memory)', () => {
    const to = makeMemory();
    expect(getTransitionType(null, to)).toBe('opening');
  });
});

describe('getSectionHeight', () => {
  it('returns standard height for different locations', () => {
    expect(getSectionHeight('standard')).toBe(TRANSITION_HEIGHTS.standard);
  });

  it('returns shorter height for same-location', () => {
    expect(getSectionHeight('same-location')).toBe(TRANSITION_HEIGHTS['same-location']);
    expect(getSectionHeight('same-location')).toBeLessThan(getSectionHeight('standard'));
  });

  it('returns milestone height for to-milestone', () => {
    expect(getSectionHeight('to-milestone')).toBe(TRANSITION_HEIGHTS['to-milestone']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: FAIL — module not found

- [ ] **Step 3: Implement transition utilities**

Create `app/src/utils/transitions.ts`:
```typescript
import type { Memory } from '../types/memory';
import { getLocation } from '../data/loader';

export type TransitionType =
  | 'standard'
  | 'same-location'
  | 'to-milestone'
  | 'from-milestone'
  | 'opening';

/** Heights in vh for each transition type. */
export const TRANSITION_HEIGHTS: Record<TransitionType, number> = {
  standard: 300,
  'same-location': 50,
  'to-milestone': 100,
  'from-milestone': 100,
  opening: 300,
};

export const HOLD_HEIGHT_VH = 100;

/**
 * Determine the transition type between two memories.
 * `from` is null for the opening → first memory transition.
 */
export function getTransitionType(from: Memory | null, to: Memory): TransitionType {
  if (from === null) return 'opening';
  if (to.type === 'milestone') return 'to-milestone';
  if (from.type === 'milestone') return 'from-milestone';

  const locA = getLocation(from);
  const locB = getLocation(to);
  if (locA.lat === locB.lat && locA.lng === locB.lng) return 'same-location';

  return 'standard';
}

/** Get transition section height in vh for a given type. */
export function getSectionHeight(type: TransitionType): number {
  return TRANSITION_HEIGHTS[type];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/utils/transitions.ts app/src/utils/__tests__/transitions.test.ts
git commit -m "add transition type detection and section height utilities"
```

---

### Task 4: Stats Utilities

**Files:**
- Create: `app/src/utils/stats.ts`
- Create: `app/src/utils/__tests__/stats.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/src/utils/__tests__/stats.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { computeStats } from '../stats';
import type { Memory } from '../../types/memory';

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test', date: '2024-06-12', type: 'date', title: 'Test',
    caption: '', location: { lat: 51.05, lng: 3.75, name: 'Gent' },
    photos: [], coverPhoto: null, heroPhoto: null, music: null,
    weather: null, expandedText: '', expandedPhotos: [], videos: [], tags: [],
    ...overrides,
  };
}

describe('computeStats', () => {
  it('counts memories by type', () => {
    const memories = [
      makeMemory({ type: 'date' }),
      makeMemory({ type: 'date' }),
      makeMemory({ type: 'trip' }),
      makeMemory({ type: 'milestone' }),
    ];
    const stats = computeStats(memories);
    expect(stats.dates).toBe(2);
    expect(stats.trips).toBe(1);
    expect(stats.milestones).toBe(1);
    expect(stats.total).toBe(4);
  });

  it('counts unique locations', () => {
    const memories = [
      makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } }),
      makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } }),
      makeMemory({ location: { lat: 50.88, lng: 4.47, name: 'Zaventem' } }),
    ];
    const stats = computeStats(memories);
    expect(stats.uniqueLocations).toBe(2);
  });

  it('counts unique countries from location names', () => {
    const memories = [
      makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } }),
      makeMemory({ location: { lat: 48.85, lng: 2.35, name: 'Paris' } }),
    ];
    // Without country data in locations, falls back to unique coordinate clusters
    const stats = computeStats(memories);
    expect(stats.uniqueLocations).toBe(2);
  });

  it('counts total photos', () => {
    const memories = [
      makeMemory({ photos: ['a.jpg', 'b.jpg'] }),
      makeMemory({ photos: ['c.jpg'] }),
    ];
    const stats = computeStats(memories);
    expect(stats.totalPhotos).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: FAIL

- [ ] **Step 3: Implement stats utilities**

Create `app/src/utils/stats.ts`:
```typescript
import type { Memory } from '../types/memory';

export interface JourneyStats {
  total: number;
  dates: number;
  trips: number;
  milestones: number;
  uniqueLocations: number;
  totalPhotos: number;
}

export function computeStats(memories: Memory[]): JourneyStats {
  const locationSet = new Set<string>();
  let totalPhotos = 0;
  let dates = 0;
  let trips = 0;
  let milestones = 0;

  for (const m of memories) {
    if (m.type === 'date' || m.type === 'special') dates++;
    else if (m.type === 'trip') trips++;
    else if (m.type === 'milestone') milestones++;

    if (m.location?.lat != null && m.location?.lng != null) {
      locationSet.add(`${m.location.lat},${m.location.lng}`);
    }

    totalPhotos += m.photos.length + m.expandedPhotos.length;
  }

  return {
    total: memories.length,
    dates,
    trips,
    milestones,
    uniqueLocations: locationSet.size,
    totalPhotos,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add app/src/utils/stats.ts app/src/utils/__tests__/stats.test.ts
git commit -m "add journey stats computation utility"
```

---

### Task 5: Rewrite useScrollTimeline Hook

**Files:**
- Modify: `app/src/hooks/useScrollTimeline.ts`

- [ ] **Step 1: Rewrite the hook**

Replace the entire contents of `app/src/hooks/useScrollTimeline.ts` with:

```typescript
import { useEffect, useRef, useState, useMemo } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Memory } from '../types/memory';
import { getTransitionType, getSectionHeight, HOLD_HEIGHT_VH } from '../utils/transitions';

gsap.registerPlugin(ScrollTrigger);

export type ScrollPhase = 'hold' | 'transition';

export interface ScrollState {
  /** -1 = opening, 0..n = memory index, memories.length = closing */
  activeIndex: number;
  phase: ScrollPhase;
  /** 0-1 progress within the current section */
  progress: number;
  /** The transition type for the current transition section (null during hold) */
  transitionType: string | null;
}

interface SectionDef {
  id: string;
  type: 'hold' | 'transition';
  heightVh: number;
  /** Memory index this section relates to (-1 = opening, memories.length = closing) */
  memoryIndex: number;
  transitionType?: string;
}

export function buildSections(memories: Memory[]): SectionDef[] {
  const sections: SectionDef[] = [];

  // Opening hold
  sections.push({ id: 'section-opening-hold', type: 'hold', heightVh: HOLD_HEIGHT_VH, memoryIndex: -1 });

  // Opening → first memory transition
  if (memories.length > 0) {
    const tType = getTransitionType(null, memories[0]);
    sections.push({
      id: 'section-transition-0',
      type: 'transition',
      heightVh: getSectionHeight(tType),
      memoryIndex: 0,
      transitionType: tType,
    });
    sections.push({ id: 'section-hold-0', type: 'hold', heightVh: HOLD_HEIGHT_VH, memoryIndex: 0 });
  }

  // Memory → memory transitions
  for (let i = 1; i < memories.length; i++) {
    const tType = getTransitionType(memories[i - 1], memories[i]);
    sections.push({
      id: `section-transition-${i}`,
      type: 'transition',
      heightVh: getSectionHeight(tType),
      memoryIndex: i,
      transitionType: tType,
    });
    sections.push({ id: `section-hold-${i}`, type: 'hold', heightVh: HOLD_HEIGHT_VH, memoryIndex: i });
  }

  // Last memory → closing transition
  sections.push({
    id: 'section-transition-closing',
    type: 'transition',
    heightVh: 200,
    memoryIndex: memories.length,
    transitionType: 'closing-overview',
  });
  // Closing phases — tagged with transitionType so App can distinguish them
  sections.push({ id: 'section-closing-overview', type: 'hold', heightVh: 200, memoryIndex: memories.length, transitionType: 'closing-overview' });
  sections.push({ id: 'section-closing-stats', type: 'hold', heightVh: 150, memoryIndex: memories.length, transitionType: 'closing-stats' });
  sections.push({ id: 'section-closing-gift', type: 'hold', heightVh: 100, memoryIndex: memories.length, transitionType: 'closing-gift' });

  return sections;
}

export function useScrollTimeline(memories: Memory[]) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    activeIndex: -1,
    phase: 'hold',
    progress: 0,
    transitionType: null,
  });
  const lenisRef = useRef<Lenis | null>(null);

  const sections = useMemo(() => buildSections(memories), [memories]);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis();
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const rafCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(rafCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(rafCallback);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Create ScrollTriggers for each section
  useEffect(() => {
    ScrollTrigger.getAll().forEach((t) => t.kill());

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (!el) continue;

      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          setScrollState({
            activeIndex: section.memoryIndex,
            phase: section.type,
            progress: self.progress,
            transitionType: section.transitionType ?? null,
          });
        },
      });
    }

    ScrollTrigger.refresh();
  }, [sections]);

  return { ...scrollState, sections, lenisRef };
}
```

- [ ] **Step 2: Verify the app still compiles**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bunx tsc --noEmit 2>&1 | head -20`

Note: This will show type errors in `App.tsx` because it still uses the old `useScrollTimeline(memories.length)` signature. That's expected — we'll fix App.tsx in a later task.

- [ ] **Step 3: Commit**

```bash
git add app/src/hooks/useScrollTimeline.ts
git commit -m "rewrite useScrollTimeline with section-based progress tracking"
```

---

### Task 6: CardOverlay Component

**Files:**
- Create: `app/src/components/CardOverlay.tsx`
- Modify: `app/src/styles/global.css`

- [ ] **Step 1: Add card-overlay styles to global.css**

At the end of `app/src/styles/global.css`, add:

```css
/* ===== Card Overlay ===== */
.card-overlay {
  position: fixed;
  top: 40px;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.card-overlay > * {
  pointer-events: auto;
}
```

- [ ] **Step 2: Remove self-animation from memory-card in global.css**

In `app/src/styles/global.css`, change the `.memory-card` rule — remove `opacity: 0`, `transform: translateY(30px)`, and `animation: cardFadeIn 0.6s ease forwards`. The card's opacity/transform will now be driven by the parent.

Replace:
```css
.memory-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px 24px;
  max-width: 340px;
  width: 90vw;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  opacity: 0;
  transform: translateY(30px);
  animation: cardFadeIn 0.6s ease forwards;
}

@keyframes cardFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

With:
```css
.memory-card {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px 24px;
  max-width: 340px;
  width: 90vw;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
}
```

- [ ] **Step 3: Create CardOverlay component**

Create `app/src/components/CardOverlay.tsx`:
```typescript
import { useMemo } from 'react';
import type { Memory } from '../types/memory';
import type { ScrollPhase } from '../hooks/useScrollTimeline';
import OpeningCard from './OpeningCard';
import MemoryCard from './MemoryCard';

interface CardOverlayProps {
  activeIndex: number;
  memories: Memory[];
  phase: ScrollPhase;
  progress: number;
  transitionType: string | null;
}

/**
 * Compute card opacity and translateY based on scroll phase and progress.
 *
 * During hold: card is fully visible (opacity 1, translateY 0).
 * During transition:
 *   0.00–0.25: outgoing card fades out (opacity 1→0, translateY 0→-30)
 *   0.25–0.75: no card visible (between locations)
 *   0.75–1.00: incoming card fades in (opacity 0→1, translateY 30→0)
 */
function getCardStyle(phase: ScrollPhase, progress: number): React.CSSProperties {
  if (phase === 'hold') {
    return { opacity: 1, transform: 'translateY(0px)' };
  }

  // Transition: fade out phase (0–0.25)
  if (progress <= 0.25) {
    const p = progress / 0.25; // 0→1
    return {
      opacity: 1 - p,
      transform: `translateY(${-30 * p}px)`,
    };
  }

  // Transition: travel phase (0.25–0.75) — card hidden
  if (progress < 0.75) {
    return { opacity: 0, transform: 'translateY(30px)' };
  }

  // Transition: fade in phase (0.75–1.0)
  const p = (progress - 0.75) / 0.25; // 0→1
  return {
    opacity: p,
    transform: `translateY(${30 * (1 - p)}px)`,
  };
}

export default function CardOverlay({ activeIndex, memories, phase, progress, transitionType }: CardOverlayProps) {
  // During a transition, before progress 0.25 we show the outgoing card,
  // after 0.75 we show the incoming card. The incoming card index is activeIndex.
  const displayIndex = useMemo(() => {
    if (phase === 'hold') return activeIndex;
    // During transition, show outgoing before midpoint, incoming after
    if (progress < 0.25) return activeIndex - 1;
    return activeIndex;
  }, [activeIndex, phase, progress]);

  const style = getCardStyle(phase, progress);
  const isClosing = displayIndex >= memories.length;

  // Don't render card during closing sequence
  if (isClosing) return null;

  return (
    <div className="card-overlay">
      <div style={style}>
        {displayIndex < 0 ? (
          <OpeningCard />
        ) : (
          <MemoryCard memory={memories[displayIndex]} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify no type errors in new file**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bunx tsc --noEmit 2>&1 | grep CardOverlay`
Expected: No errors related to CardOverlay

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CardOverlay.tsx app/src/styles/global.css
git commit -m "add CardOverlay component with scroll-driven opacity and transform"
```

---

### Task 7: LocationMarker Component

**Files:**
- Create: `app/src/components/LocationMarker.tsx`
- Modify: `app/src/styles/global.css`

- [ ] **Step 1: Add location marker styles to global.css**

At the end of `app/src/styles/global.css`, add:
```css
/* ===== Location Marker ===== */
.location-marker {
  width: 12px;
  height: 12px;
  background: #e8836b;
  border-radius: 50%;
  position: relative;
}

.location-marker--pulse::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  background: #e8836b;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: markerPulse 0.6s ease-out 3;
}

@keyframes markerPulse {
  0% {
    width: 12px;
    height: 12px;
    opacity: 0.8;
  }
  100% {
    width: 30px;
    height: 30px;
    opacity: 0;
  }
}
```

- [ ] **Step 2: Create LocationMarker component**

Create `app/src/components/LocationMarker.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface LocationMarkerProps {
  map: maplibregl.Map | null;
  coordinates: [number, number] | null; // [lng, lat]
  pulse: boolean;
}

export default function LocationMarker({ map, coordinates, pulse }: LocationMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const el = document.createElement('div');
    el.className = 'location-marker';
    elRef.current = el;

    const marker = new maplibregl.Marker({ element: el });
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
      elRef.current = null;
    };
  }, [map]);

  // Update position
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !map || !coordinates) {
      markerRef.current?.remove();
      return;
    }
    marker.setLngLat(coordinates).addTo(map);
  }, [map, coordinates]);

  // Toggle pulse class
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (pulse) {
      el.classList.add('location-marker--pulse');
    } else {
      el.classList.remove('location-marker--pulse');
    }
  }, [pulse]);

  return null; // Renders via Maplibre markers, not React DOM
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/LocationMarker.tsx app/src/styles/global.css
git commit -m "add LocationMarker component with pulsing animation"
```

---

### Task 8: TravelLine Component

**Files:**
- Create: `app/src/components/TravelLine.tsx`

- [ ] **Step 1: Create TravelLine component**

Create `app/src/components/TravelLine.tsx`:
```typescript
import { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import type { Transport } from '../types/memory';
import { haversineDistance, generateArc, sliceLine, interpolateLine } from '../utils/geo';

const TRANSPORT_ICONS: Record<string, string> = {
  car: '\u{1F697}',
  plane: '\u{2708}\u{FE0F}',
  train: '\u{1F686}',
  bus: '\u{1F68C}',
  boat: '\u{26F5}',
  walk: '\u{1F6B6}',
  bike: '\u{1F6B2}',
};

const SOURCE_ID = 'travel-line-source';
const LAYER_ID = 'travel-line-layer';

interface TravelLineProps {
  map: maplibregl.Map | null;
  from: [number, number] | null; // [lng, lat]
  to: [number, number] | null;   // [lng, lat]
  progress: number; // 0-1, where the line should be drawn to
  transport: Transport | null;
  visible: boolean;
  /** 0-1 fade out progress during hold section (0 = fully visible, 1 = invisible) */
  fadeOutProgress: number;
}

export default function TravelLine({ map, from, to, progress, transport, visible, fadeOutProgress }: TravelLineProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const sourceAddedRef = useRef(false);

  // Generate the full line path
  const fullPath = useMemo<[number, number][]>(() => {
    if (!from || !to) return [];
    const dist = haversineDistance(from, to);
    if (dist > 100) {
      return generateArc(from, to, 50, 0.1);
    }
    // Straight line with a few intermediate points for smooth slicing
    const points: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      points.push(interpolateLine(from, to, i / 20));
    }
    return points;
  }, [from, to]);

  // Add/update the GeoJSON source and layer
  useEffect(() => {
    if (!map) return;

    const setupSource = () => {
      if (map.getSource(SOURCE_ID)) {
        sourceAddedRef.current = true;
        return;
      }

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });

      map.addLayer({
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#e8836b',
          'line-width': 2,
          'line-opacity': 1,
        },
      });

      sourceAddedRef.current = true;
    };

    if (map.isStyleLoaded()) {
      setupSource();
    } else {
      map.on('load', setupSource);
    }

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      sourceAddedRef.current = false;
    };
  }, [map]);

  // Update the line geometry based on progress
  useEffect(() => {
    if (!map || !sourceAddedRef.current || fullPath.length < 2) return;

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!visible || progress <= 0) {
      source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      return;
    }

    const sliced = sliceLine(fullPath, progress);
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: sliced },
    });

    // Apply fade-out opacity
    const opacity = Math.max(0, 1 - fadeOutProgress);
    try {
      map.setPaintProperty(LAYER_ID, 'line-opacity', opacity);
    } catch {
      // Layer might not exist yet
    }
  }, [map, fullPath, progress, visible, fadeOutProgress]);

  // Transport icon marker at the line tip
  useEffect(() => {
    if (!map) return;

    // Create marker element
    const el = document.createElement('div');
    el.style.fontSize = '20px';
    el.style.lineHeight = '1';

    const iconText = transport?.mode ? TRANSPORT_ICONS[transport.mode] : null;
    if (iconText) {
      el.textContent = iconText;
    } else {
      // Default: coral dot
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.background = '#e8836b';
      el.style.borderRadius = '50%';
    }

    const marker = new maplibregl.Marker({ element: el });
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, transport]);

  // Position the transport marker at the line tip
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !map || !visible || fullPath.length < 2 || progress <= 0) {
      markerRef.current?.remove();
      return;
    }

    const sliced = sliceLine(fullPath, progress);
    const tip = sliced[sliced.length - 1];
    marker.setLngLat(tip).addTo(map);

    // Fade out with line
    const el = marker.getElement();
    el.style.opacity = `${Math.max(0, 1 - fadeOutProgress)}`;

    // Rotate icon towards direction of travel
    if (sliced.length >= 2) {
      const prev = sliced[sliced.length - 2];
      const angle = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]) * (180 / Math.PI);
      el.style.transform = `rotate(${-angle + 90}deg)`;
    }
  }, [map, fullPath, progress, visible, fadeOutProgress]);

  return null;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bunx tsc --noEmit 2>&1 | grep TravelLine`
Expected: No errors related to TravelLine

- [ ] **Step 3: Commit**

```bash
git add app/src/components/TravelLine.tsx
git commit -m "add TravelLine component with scroll-driven line drawing and transport icons"
```

---

### Task 9: MilestoneEffect Component

**Files:**
- Create: `app/src/components/MilestoneEffect.tsx`
- Create: `app/src/styles/milestone-effect.css`

- [ ] **Step 1: Create milestone effect styles**

Create `app/src/styles/milestone-effect.css`:
```css
.milestone-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px;
  height: 300px;
  pointer-events: none;
  z-index: -1;
}

.milestone-effect__particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: sparkle 1.2s ease-out forwards;
}

@keyframes sparkle {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(-50% + var(--dx)),
      calc(-50% + var(--dy))
    ) scale(0.5);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Create MilestoneEffect component**

Create `app/src/components/MilestoneEffect.tsx`:
```typescript
import { useMemo } from 'react';
import '../styles/milestone-effect.css';

const PARTICLE_COUNT = 16;
const COLORS = ['#e8836b', '#f5c242', '#4a9eff', '#e060e0', '#60e090'];

interface MilestoneEffectProps {
  active: boolean;
}

export default function MilestoneEffect({ active }: MilestoneEffectProps) {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
      const radius = 80 + Math.random() * 60;
      return {
        dx: `${Math.cos(angle) * radius}px`,
        dy: `${Math.sin(angle) * radius}px`,
        color: COLORS[i % COLORS.length],
        delay: `${Math.random() * 0.4}s`,
        size: 4 + Math.random() * 4,
      };
    });
  }, []);

  if (!active) return null;

  return (
    <div className="milestone-effect">
      {particles.map((p, i) => (
        <div
          key={i}
          className="milestone-effect__particle"
          style={{
            '--dx': p.dx,
            '--dy': p.dy,
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/MilestoneEffect.tsx app/src/styles/milestone-effect.css
git commit -m "add MilestoneEffect sparkle animation component"
```

---

### Task 10: Update MapCanvas for Dim/Blur and Ref

**Files:**
- Modify: `app/src/components/MapCanvas.tsx`

- [ ] **Step 1: Update MapCanvas**

The MapCanvas needs to:
1. Accept a `dimmed` prop for milestone blur/dim
2. Expose the map instance via a callback prop instead of forwardRef (simpler for App to pass to child components)
3. Keep the opening line logic (still used during opening hold)

In `app/src/components/MapCanvas.tsx`, make these changes:

Add `dimmed` prop to the interface:
```typescript
interface MapCanvasProps {
  center: [number, number];
  zoom: number;
  showOpeningLine?: boolean;
  dimmed?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
}
```

Change the component signature from `forwardRef` to a regular function:
```typescript
export default function MapCanvas({ center, zoom, showOpeningLine, dimmed, onMapReady }: MapCanvasProps) {
```

Remove the `forwardRef` wrapper, `useImperativeHandle`, and `MapCanvasHandle` export.

In the `useEffect` that creates the map, add after `mapRef.current = map;`:
```typescript
map.on('load', () => {
  onMapReady?.(map);
  // ... rest of the load handler
});
```

Add a new `useEffect` for the dim/blur filter:
```typescript
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;
  container.style.transition = 'filter 300ms ease';
  container.style.filter = dimmed ? 'brightness(0.4) blur(8px)' : 'none';
}, [dimmed]);
```

Update the return to add `style` with the filter support:
```typescript
return (
  <div
    ref={containerRef}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
    }}
  />
);
```

- [ ] **Step 2: Verify compilation**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bunx tsc --noEmit 2>&1 | head -20`
Note: App.tsx will still have errors (uses old API) — that's expected.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/MapCanvas.tsx
git commit -m "update MapCanvas with dimmed prop and onMapReady callback"
```

---

### Task 11: Add Details Button to MemoryCard

**Files:**
- Modify: `app/src/components/MemoryCard.tsx`
- Modify: `app/src/styles/global.css`

- [ ] **Step 1: Add details button style to global.css**

At the end of `app/src/styles/global.css`, add:
```css
/* ===== Details Button ===== */
.memory-card__details-btn {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 16px;
  font-family: 'Caveat', cursive;
  font-size: 16px;
  color: #e8836b;
  background: none;
  border: 1px solid #e8836b;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.memory-card__details-btn:hover {
  background: #e8836b;
  color: #fff;
}
```

- [ ] **Step 2: Update MemoryCard to accept onShowDetails and show button**

In `app/src/components/MemoryCard.tsx`, update the interface and add the button:

```typescript
interface MemoryCardProps {
  memory: Memory;
  onShowDetails?: () => void;
}

export default function MemoryCard({ memory, onShowDetails }: MemoryCardProps) {
```

Add after the location div, before the closing `</div>`:
```typescript
{(memory.expandedText || memory.expandedPhotos.length > 0) && onShowDetails && (
  <button className="memory-card__details-btn" onClick={onShowDetails}>
    Meer details
  </button>
)}
```

Also remove the unused `useRef` import and `cardRef` — they're no longer needed since animation is driven by parent.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/MemoryCard.tsx app/src/styles/global.css
git commit -m "add details button to MemoryCard for expanded content"
```

---

### Task 12: DetailOverlay Component

**Files:**
- Create: `app/src/components/DetailOverlay.tsx`
- Create: `app/src/styles/detail-overlay.css`

- [ ] **Step 1: Install react-markdown**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun add react-markdown`

- [ ] **Step 2: Create detail overlay styles**

Create `app/src/styles/detail-overlay.css`:
```css
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  animation: detailSlideUp 0.3s ease-out;
}

@keyframes detailSlideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.detail-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
}

.detail-overlay__content {
  position: relative;
  margin-top: 40px;
  flex: 1;
  overflow-y: auto;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 24px 20px 40px;
}

.detail-overlay__close {
  position: absolute;
  top: 52px;
  right: 16px;
  z-index: 210;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-overlay__header {
  margin-bottom: 20px;
}

.detail-overlay__date {
  font-family: 'Caveat', cursive;
  font-size: 16px;
  color: #999;
}

.detail-overlay__title {
  font-family: 'Caveat', cursive;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.detail-overlay__body img {
  width: 100%;
  border-radius: 12px;
  margin: 12px 0;
}

.detail-overlay__body p {
  font-size: 15px;
  line-height: 1.6;
  color: #444;
  margin: 8px 0;
}

.detail-overlay__day {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.detail-overlay__day-title {
  font-family: 'Caveat', cursive;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}
```

- [ ] **Step 3: Create DetailOverlay component**

Create `app/src/components/DetailOverlay.tsx`:
```typescript
import type { Memory } from '../types/memory';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import Markdown from 'react-markdown';
import '../styles/detail-overlay.css';

interface DetailOverlayProps {
  memory: Memory;
  onClose: () => void;
}

/** Rewrite relative image paths to /photos/full/ */
function resolveImageSrc(src: string | undefined): string {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('/')) return src;
  return `/photos/full/${src}`;
}

export default function DetailOverlay({ memory, onClose }: DetailOverlayProps) {
  const dateStr = format(parseISO(memory.date), 'd MMMM yyyy', { locale: nl });

  return (
    <div className="detail-overlay">
      <div className="detail-overlay__backdrop" onClick={onClose} />
      <button className="detail-overlay__close" onClick={onClose}>✕</button>
      <div className="detail-overlay__content">
        <div className="detail-overlay__header">
          <div className="detail-overlay__date">{dateStr}</div>
          <h2 className="detail-overlay__title">{memory.title}</h2>
        </div>

        {memory.expandedText && (
          <div className="detail-overlay__body">
            <Markdown
              components={{
                img: ({ src, alt }) => (
                  <img src={resolveImageSrc(src)} alt={alt ?? ''} loading="lazy" />
                ),
              }}
            >
              {memory.expandedText}
            </Markdown>
          </div>
        )}

        {memory.days?.map((day, i) => (
          <div key={i} className="detail-overlay__day">
            <div className="detail-overlay__date">
              {format(parseISO(day.date), 'd MMMM yyyy', { locale: nl })}
            </div>
            <div className="detail-overlay__day-title">{day.title}</div>
            <p>{day.caption}</p>
            {day.photos.map((photo, j) => (
              <img
                key={j}
                src={`/photos/full/${photo}`}
                alt=""
                loading="lazy"
                style={{ width: '100%', borderRadius: 12, margin: '12px 0' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/DetailOverlay.tsx app/src/styles/detail-overlay.css app/package.json app/bun.lock
git commit -m "add DetailOverlay component with markdown rendering"
```

---

### Task 13: ClosingSequence Component

**Files:**
- Create: `app/src/components/ClosingSequence.tsx`
- Create: `app/src/styles/closing.css`

- [ ] **Step 1: Create closing sequence styles**

Create `app/src/styles/closing.css`:
```css
.closing-sequence {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.closing-stats {
  text-align: center;
  max-width: 400px;
  padding: 0 20px;
}

.closing-stats__item {
  margin: 16px 0;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.closing-stats__item--visible {
  opacity: 1;
  transform: translateY(0);
}

.closing-stats__number {
  font-family: 'Caveat', cursive;
  font-size: 48px;
  font-weight: 700;
  color: #e8836b;
  line-height: 1;
}

.closing-stats__label {
  font-family: 'Caveat', cursive;
  font-size: 22px;
  color: #666;
}

.closing-gift {
  text-align: center;
  pointer-events: auto;
}

.closing-gift__btn {
  padding: 16px 40px;
  font-family: 'Caveat', cursive;
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  background: #e8836b;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(232, 131, 107, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.closing-gift__btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(232, 131, 107, 0.5);
}
```

- [ ] **Step 2: Create ClosingSequence component**

Create `app/src/components/ClosingSequence.tsx`:
```typescript
import { useMemo } from 'react';
import type { Memory } from '../types/memory';
import { computeStats } from '../utils/stats';
import type { JourneyStats } from '../utils/stats';
import '../styles/closing.css';

type ClosingPhase = 'overview' | 'stats' | 'gift';

interface ClosingSequenceProps {
  memories: Memory[];
  phase: ClosingPhase;
  progress: number; // 0-1 within the current closing section
}

interface StatDisplay {
  number: string;
  label: string;
}

function buildStatDisplays(stats: JourneyStats): StatDisplay[] {
  return [
    { number: `${stats.total}`, label: 'herinneringen' },
    { number: `${stats.dates}`, label: 'dates' },
    { number: `${stats.trips}`, label: 'reizen' },
    { number: `${stats.milestones}`, label: 'milestones' },
    { number: `${stats.uniqueLocations}`, label: 'unieke plekken' },
    { number: `${stats.totalPhotos}+`, label: "foto's" },
    { number: '∞', label: 'cocktails' },
  ];
}

export default function ClosingSequence({ memories, phase, progress }: ClosingSequenceProps) {
  const stats = useMemo(() => computeStats(memories), [memories]);
  const displays = useMemo(() => buildStatDisplays(stats), [stats]);

  if (phase === 'overview') {
    // The map handles the overview visuals (zoom out, country highlights).
    // We just show a fade-out of the last card (handled by CardOverlay).
    return null;
  }

  if (phase === 'stats') {
    // Each stat becomes visible based on scroll progress
    const visibleCount = Math.floor(progress * (displays.length + 1));

    return (
      <div className="closing-sequence">
        <div className="closing-stats">
          {displays.map((stat, i) => (
            <div
              key={i}
              className={`closing-stats__item ${i < visibleCount ? 'closing-stats__item--visible' : ''}`}
            >
              <div className="closing-stats__number">{stat.number}</div>
              <div className="closing-stats__label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'gift') {
    return (
      <div className="closing-sequence">
        <div className="closing-gift">
          <button className="closing-gift__btn">
            Open je cadeau 🎁
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/ClosingSequence.tsx app/src/styles/closing.css
git commit -m "add ClosingSequence component with stats display and gift card"
```

---

### Task 14: Wire Everything Together in App.tsx

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/styles/global.css`

- [ ] **Step 1: Update global.css scroll styles**

In `app/src/styles/global.css`, replace the scroll container and scroll section rules:

```css
/* ===== Scroll Container ===== */
.scroll-container {
  position: relative;
  z-index: 10;
  pointer-events: none;
}

.scroll-section {
  height: 100vh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 60px;
  pointer-events: auto;
}

.scroll-section--opening {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

With:

```css
/* ===== Scroll Track ===== */
.scroll-track {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.scroll-track__section {
  /* height set inline via style */
}
```

- [ ] **Step 2: Rewrite App.tsx**

Replace the entire contents of `app/src/App.tsx`:

```typescript
import { useMemo, useState, useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { loadMemories, getLocation } from './data/loader';
import { useScrollTimeline } from './hooks/useScrollTimeline';
import { getTransitionType } from './utils/transitions';
import MapCanvas, { ARC_APEX } from './components/MapCanvas';
import TimelineStrip from './components/TimelineStrip';
import CardOverlay from './components/CardOverlay';
import TravelLine from './components/TravelLine';
import LocationMarker from './components/LocationMarker';
import MilestoneEffect from './components/MilestoneEffect';
import ClosingSequence from './components/ClosingSequence';
import DetailOverlay from './components/DetailOverlay';
import './styles/global.css';

/** Default location (Gent) for memories without coordinates. */
const DEFAULT_LOC: [number, number] = [3.7527, 51.0597];

function memoryLngLat(memories: ReturnType<typeof loadMemories>, index: number): [number, number] {
  if (index < 0 || index >= memories.length) return [ARC_APEX[0], ARC_APEX[1]];
  const loc = getLocation(memories[index]);
  return [loc.lng, loc.lat];
}

/**
 * Find the last located memory index before `index`.
 * Skips milestones (which have no location).
 */
function lastLocatedIndex(memories: ReturnType<typeof loadMemories>, index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    if (memories[i].type !== 'milestone') return i;
  }
  return -1; // opening
}

export default function App() {
  const memories = useMemo(() => loadMemories(), []);
  const { activeIndex, phase, progress, transitionType, sections } = useScrollTimeline(memories);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [detailMemory, setDetailMemory] = useState<ReturnType<typeof loadMemories>[number] | null>(null);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  // --- Map center/zoom ---
  const isOpening = activeIndex < 0;
  const isClosing = activeIndex >= memories.length;
  const activeMemory = activeIndex >= 0 && activeIndex < memories.length ? memories[activeIndex] : null;

  const mapCenter = useMemo<[number, number]>(() => {
    if (isOpening) return [ARC_APEX[0], ARC_APEX[1]];
    if (isClosing) return DEFAULT_LOC;
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeIndex, memories]);

  const mapZoom = useMemo(() => {
    if (isOpening) return 9;
    if (isClosing) return 4;
    if (!activeMemory) return 11;
    if (activeMemory.type === 'trip') return 6;
    const loc = getLocation(activeMemory);
    if (loc.lat === 51.0597 && loc.lng === 3.7527) return 13;
    return 11;
  }, [isOpening, isClosing, activeMemory]);

  // --- Milestone dimming ---
  const isDimmed = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Travel line ---
  const travelFrom = useMemo<[number, number] | null>(() => {
    if (phase !== 'transition') return null;
    if (transitionType === 'same-location' || transitionType === 'to-milestone') return null;

    if (transitionType === 'opening') return [ARC_APEX[0], ARC_APEX[1]];

    if (transitionType === 'from-milestone') {
      const prevIdx = lastLocatedIndex(memories, activeIndex);
      return memoryLngLat(memories, prevIdx);
    }

    // Standard: previous memory location
    return memoryLngLat(memories, activeIndex - 1);
  }, [phase, transitionType, activeIndex, memories]);

  const travelTo = useMemo<[number, number] | null>(() => {
    if (phase !== 'transition') return null;
    if (transitionType === 'same-location' || transitionType === 'to-milestone') return null;
    return memoryLngLat(memories, activeIndex);
  }, [phase, transitionType, activeIndex, memories]);

  // Travel line progress: map the 0.25–0.75 transition range to 0–1
  const lineProgress = phase === 'transition' && progress >= 0.25 && progress <= 0.75
    ? (progress - 0.25) / 0.5
    : phase === 'transition' && progress > 0.75 ? 1 : 0;

  // Line fade-out during hold: fade over first 20% of hold
  const lineFadeOut = phase === 'hold' ? Math.min(1, progress / 0.2) : 0;

  const travelVisible = phase === 'transition' && travelFrom !== null && travelTo !== null;

  // Transport for current transition
  const travelTransport = activeMemory?.transport?.[0] ?? null;

  // --- Location marker ---
  const markerCoords = useMemo<[number, number] | null>(() => {
    if (isOpening || isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeMemory, activeIndex, memories]);

  const markerPulse = phase === 'transition' && progress >= 0.75;

  // --- Milestone effect ---
  const showMilestoneEffect = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Closing phases ---
  // Closing phase is determined by transitionType set by useScrollTimeline.
  // The closing hold sections use IDs: section-closing-overview, section-closing-stats, section-closing-gift
  // We need to track which closing section is active. Since all closing sections have
  // memoryIndex = memories.length, we distinguish by checking which section ID last triggered.
  // For this, we extend the scroll state to include the section ID.
  //
  // IMPLEMENTATION NOTE: In useScrollTimeline, set transitionType to the section.id for closing
  // hold sections so App can determine the closing phase from transitionType:
  // - 'closing-overview' → overview phase
  // - 'section-closing-stats' → stats phase
  // - 'section-closing-gift' → gift phase

  // --- Detail overlay ---
  const handleShowDetails = useCallback((memoryIndex: number) => {
    setDetailMemory(memories[memoryIndex]);
  }, [memories]);

  // --- Timeline progress ---
  const timelineIndex = Math.max(0, Math.min(activeIndex, memories.length - 1));

  return (
    <>
      <MapCanvas
        center={mapCenter}
        zoom={mapZoom}
        showOpeningLine={isOpening}
        dimmed={isDimmed}
        onMapReady={handleMapReady}
      />

      <TravelLine
        map={mapInstance}
        from={travelFrom}
        to={travelTo}
        progress={lineProgress}
        transport={travelTransport}
        visible={travelVisible}
        fadeOutProgress={lineFadeOut}
      />

      <LocationMarker
        map={mapInstance}
        coordinates={markerCoords}
        pulse={markerPulse}
      />

      <TimelineStrip memories={memories} activeIndex={timelineIndex} />

      <CardOverlay
        activeIndex={activeIndex}
        memories={memories}
        phase={phase}
        progress={progress}
        transitionType={transitionType}
      />

      {showMilestoneEffect && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 49, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <MilestoneEffect active />
        </div>
      )}

      {isClosing && transitionType && transitionType.startsWith('closing-') && (
        <ClosingSequence
          memories={memories}
          phase={
            transitionType === 'closing-overview' ? 'overview'
            : transitionType === 'closing-stats' ? 'stats'
            : 'gift'
          }
          progress={progress}
        />
      )}

      {/* Scroll track: invisible sections that drive all animations */}
      <div className="scroll-track">
        {sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="scroll-track__section"
            style={{ height: `${section.heightVh}vh` }}
          />
        ))}
      </div>

      {detailMemory && (
        <DetailOverlay
          memory={detailMemory}
          onClose={() => setDetailMemory(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bunx tsc --noEmit`
Expected: Clean compilation (no errors)

If there are errors, fix them before proceeding.

- [ ] **Step 4: Start dev server and verify basic rendering**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun dev`

Verify:
- Map renders as background
- Opening card appears at the top
- Scrolling triggers transitions (cards fade, map moves)
- Timeline strip shows progress

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx app/src/styles/global.css
git commit -m "wire up scroll-driven transitions in App with all new components"
```

---

### Task 15: Update TimelineStrip for Section-Based Progress

**Files:**
- Modify: `app/src/components/TimelineStrip.tsx`

- [ ] **Step 1: Update TimelineStrip**

The current TimelineStrip calculates progress from `activeIndex / (memories.length - 1)`. This still works correctly since `activeIndex` maps to memory indices. No code change is needed — the existing implementation handles the new `activeIndex` range correctly.

Verify this by checking the dev server: the timeline progress bar should advance as you scroll through memories.

- [ ] **Step 2: Commit (skip if no changes needed)**

If no changes were needed, skip this commit.

---

### Task 16: Closing Sequence — Journey Overview Map Layer

**Files:**
- Modify: `app/src/components/MapCanvas.tsx`

The closing sequence needs the map to zoom out and show all visited locations. This requires:
1. A prop to trigger the overview mode
2. Adding pin markers for all locations

- [ ] **Step 1: Add overview props to MapCanvas**

Add to the MapCanvasProps interface:
```typescript
/** When set, map fitBounds to show both points (used during travel transitions). */
travelBounds?: [[number, number], [number, number]] | null;
overviewLocations?: [number, number][]; // All visited [lng, lat] points for closing sequence
showOverview?: boolean;
```

Add an effect for travel bounds:
```typescript
useEffect(() => {
  const map = mapRef.current;
  if (!map || !travelBounds) return;
  const [a, b] = travelBounds;
  map.fitBounds([a, b], { padding: 80, duration: 0 }); // duration 0: scroll drives the timing
}, [travelBounds]);
```

In `App.tsx`, compute and pass `travelBounds`:
```typescript
const travelBounds = useMemo(() => {
  if (!travelVisible || !travelFrom || !travelTo) return null;
  return [travelFrom, travelTo] as [[number, number], [number, number]];
}, [travelVisible, travelFrom, travelTo]);
```

Add to MapCanvas JSX: `travelBounds={travelBounds}`

- [ ] **Step 2: Add effect for overview mode**

Add a new `useEffect` in MapCanvas:
```typescript
const overviewMarkersRef = useRef<maplibregl.Marker[]>([]);

useEffect(() => {
  const map = mapRef.current;
  if (!map || !showOverview || !overviewLocations?.length) {
    // Remove existing markers
    overviewMarkersRef.current.forEach(m => m.remove());
    overviewMarkersRef.current = [];
    return;
  }

  // Fit bounds to show all locations
  const bounds = new maplibregl.LngLatBounds();
  for (const [lng, lat] of overviewLocations) {
    bounds.extend([lng, lat]);
  }
  map.fitBounds(bounds, { padding: 60, duration: 1500 });

  // Add pin markers with staggered animation
  overviewLocations.forEach(([lng, lat], i) => {
    const el = document.createElement('div');
    el.className = 'location-marker location-marker--pulse';
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);

    setTimeout(() => {
      el.style.opacity = '1';
    }, i * 100);

    overviewMarkersRef.current.push(marker);
  });

  return () => {
    overviewMarkersRef.current.forEach(m => m.remove());
    overviewMarkersRef.current = [];
  };
}, [showOverview, overviewLocations]);
```

- [ ] **Step 3: Pass overview props from App.tsx**

In `App.tsx`, compute the unique locations list:
```typescript
const allLocations = useMemo<[number, number][]>(() => {
  const seen = new Set<string>();
  const locs: [number, number][] = [];
  for (const m of memories) {
    if (m.location?.lat != null && m.location?.lng != null) {
      const key = `${m.location.lat},${m.location.lng}`;
      if (!seen.has(key)) {
        seen.add(key);
        locs.push([m.location.lng, m.location.lat]);
      }
    }
  }
  return locs;
}, [memories]);
```

Add to the MapCanvas JSX:
```typescript
overviewLocations={allLocations}
showOverview={isClosing && transitionType === 'closing-overview'}
```

- [ ] **Step 4: Verify closing overview in dev server**

Scroll to the very end. The map should zoom out to show all locations with pins appearing sequentially.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/MapCanvas.tsx app/src/App.tsx
git commit -m "add journey overview map mode for closing sequence"
```

---

### Task 17: Run All Tests and Fix Issues

**Files:**
- Various

- [ ] **Step 1: Run all tests**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun test`
Expected: All tests pass

- [ ] **Step 2: Run linter**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun lint`
Expected: No warnings or errors

- [ ] **Step 3: Run type check**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bunx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Fix any issues found in steps 1-3**

Address all test failures, lint warnings, and type errors.

- [ ] **Step 5: Commit fixes if any**

```bash
git add -A
git commit -m "fix lint and type errors"
```

---

### Task 18: Manual Integration Test

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `cd /mnt/c/users/woute/Dropbox/Personal/Programming/UnixCode/projects/demo/app && bun dev`

- [ ] **Step 2: Verify opening card**

- Opening card appears centered below timeline
- Map shows Herent-Gent arc
- Heart pulses

- [ ] **Step 3: Verify standard transitions**

- Scroll down: opening card fades out and slides up
- Travel line draws from arc apex to first memory location
- Transport dot moves along line
- First memory card fades in
- Pulsing marker appears at location
- Scroll between memories with different locations: travel line draws between them

- [ ] **Step 4: Verify same-location transitions**

- Find two consecutive Gent memories
- Scroll: card crossfades without map travel

- [ ] **Step 5: Verify milestone transitions**

- Scroll to a milestone memory
- Map dims and blurs
- Fireworks effect appears
- Next memory: map un-dims, travel resumes from pre-milestone location

- [ ] **Step 6: Verify scroll reversal**

- Scroll back up through any transition
- Line retracts, cards reverse, everything scrubs smoothly

- [ ] **Step 7: Verify closing sequence**

- Scroll past last memory
- Map zooms out showing all locations with pins
- Stats appear one by one
- Gift button appears

- [ ] **Step 8: Verify detail overlay**

- Find a memory with expandedText
- Tap "Meer details" button
- Overlay slides up with markdown content
- Dismiss with X button
- Timeline position unchanged

- [ ] **Step 9: Document any issues found**

Note issues for follow-up. Fix critical bugs immediately.
