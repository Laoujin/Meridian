import { test, expect } from '@playwright/test';
import {
  waitForMapReady,
  smoothScrollToSection,
  scrollThroughTransition,
  assertCameraSmooth,
  assertDotsVisible,
  captureFrame,
  useFixture,
} from '../helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'fixture-leuven-herent');

const SETTLE_MS = 300;

async function settleAtHold1(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const el = document.getElementById('section-hold-1');
    if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.5, behavior: 'instant' });
  });
  await page.waitForTimeout(SETTLE_MS);
}

test.describe('Fixture: Leuven (Octobar) → Herent (Picknick) — ease-in', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('camera does not jump at transition start, both dots stay visible', async ({ page }) => {
    await useFixture(page, 'test-memories.json');
    await page.goto('/');
    await waitForMapReady(page);

    await settleAtHold1(page);
    const holdFrame = await captureFrame(page, 'hold-1-mid', 10);
    if (!holdFrame) throw new Error('Failed to capture hold-1 frame');
    await page.screenshot({ path: path.join(SHOTS_DIR, '00-hold-1.png') });

    const frames = await scrollThroughTransition(page, 'section-transition-2', {
      steps: 30,
      stepDelay: 60,
      margin: 10,
    });

    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const f = frames[Math.min(frames.length - 1, Math.round((frames.length - 1) * t))];
      if (!f) continue;
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), f.scrollY);
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(SHOTS_DIR, `trans-${Math.round(t * 100)}.png`) });
    }
    fs.writeFileSync(
      path.join(SHOTS_DIR, 'frames.json'),
      JSON.stringify({ holdFrame, frames }, null, 2),
    );

    // Continuity at transition start: hold-1 zoom ≈ transition[0] zoom.
    const first = frames[0];
    const dz = Math.abs(first.map.zoom - holdFrame.map.zoom);
    expect(
      dz,
      `Transition jumped at progress=0: hold-1 zoom=${holdFrame.map.zoom.toFixed(2)} ` +
        `→ transition[0] zoom=${first.map.zoom.toFixed(2)} (Δ=${dz.toFixed(2)})`,
    ).toBeLessThan(0.5);

    // Both dots are visible at the start of this transition (ease-in
    // scenario), and must stay visible throughout — no off-screen excursions.
    assertDotsVisible(frames, 'both');

    // Smoothness across the whole transition.
    assertCameraSmooth(frames, { maxZoomDelta: 0.4, maxCenterPxDelta: 200 });
  });

  test('first scroll-through matches second scroll-through (no stale state)', async ({ page }) => {
    await useFixture(page, 'test-memories.json');
    await page.goto('/');
    await waitForMapReady(page);

    // First pass.
    await settleAtHold1(page);
    const firstRun = await scrollThroughTransition(page, 'section-transition-2', {
      steps: 20,
      stepDelay: 60,
      margin: 10,
    });

    // Scroll back to hold-1 and let the camera resettle.
    await settleAtHold1(page);

    // Second pass through the same transition.
    const secondRun = await scrollThroughTransition(page, 'section-transition-2', {
      steps: 20,
      stepDelay: 60,
      margin: 10,
    });

    fs.writeFileSync(
      path.join(SHOTS_DIR, 'two-passes.json'),
      JSON.stringify({ firstRun, secondRun }, null, 2),
    );

    expect(firstRun.length).toBe(secondRun.length);

    // Per-frame: zoom and center should match across passes within tight
    // tolerance. Differences here mean state from a prior render leaked
    // into the next transition init — exactly the bug the user reports.
    const failures: string[] = [];
    const ZOOM_TOL = 0.15;
    const CENTER_PX_TOL = 60;
    for (let i = 0; i < firstRun.length; i++) {
      const a = firstRun[i];
      const b = secondRun[i];
      const dz = Math.abs(a.map.zoom - b.map.zoom);
      if (dz > ZOOM_TOL) {
        failures.push(
          `frame ${i} (${a.label}): zoom ${a.map.zoom.toFixed(3)} vs ${b.map.zoom.toFixed(3)} (Δ=${dz.toFixed(3)})`,
        );
      }
      const z = Math.min(a.map.zoom, b.map.zoom);
      const avgLat = (a.map.center.lat + b.map.center.lat) / 2;
      const pxPerDegLng =
        ((256 * Math.pow(2, z)) / 360) * Math.cos((avgLat * Math.PI) / 180);
      const pxPerDegLat = (256 * Math.pow(2, z)) / 360;
      const dxPx = Math.abs(a.map.center.lng - b.map.center.lng) * pxPerDegLng;
      const dyPx = Math.abs(a.map.center.lat - b.map.center.lat) * pxPerDegLat;
      const dPx = Math.hypot(dxPx, dyPx);
      if (dPx > CENTER_PX_TOL) {
        failures.push(
          `frame ${i} (${a.label}): center diverged ≈${dPx.toFixed(0)}px ` +
            `(Δlng=${(a.map.center.lng - b.map.center.lng).toFixed(4)}, ` +
            `Δlat=${(a.map.center.lat - b.map.center.lat).toFixed(4)})`,
        );
      }
    }
    expect(
      failures,
      `First and second pass diverged in ${failures.length} frame(s) — stale state suspected:\n` +
        failures.join('\n'),
    ).toEqual([]);
  });
});

// Suppress unused-import warning for the helper that's not directly called
// in describe-level code (used inside test bodies via the shared signature).
void smoothScrollToSection;
