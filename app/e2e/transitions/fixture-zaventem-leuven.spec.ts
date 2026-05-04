import { test, expect } from '@playwright/test';
import {
  waitForMapReady,
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
const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'fixture-zaventem-leuven');

test.describe('Fixture: Zaventem → Leuven (transition continuity from hold-0)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('camera does not jump at transition start — only moves as the line draws', async ({ page }) => {
    await useFixture(page, 'test-memories.json');
    await page.goto('/');
    await waitForMapReady(page);

    // Land on hold-0 and let it settle so the camera reflects the real
    // hold-0 framing (Gent + Herent + Zaventem).
    await page.evaluate(() => {
      const el = document.getElementById('section-hold-0');
      if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.5, behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    const holdFrame = await captureFrame(page, 'hold-0-mid');
    if (!holdFrame) throw new Error('Failed to capture hold-0 frame');
    await page.screenshot({ path: path.join(SHOTS_DIR, '00-hold-0.png') });

    // Scroll through transition-1 (Zaventem → Leuven).
    // margin=10: camera's own fitBounds padding is 40px, so dots placed at
    // the padding boundary register as off-screen at margin=40. 10 keeps the
    // assertion meaningful (catches real off-screen regressions) without
    // tripping on intentional edge-placement.
    const frames = await scrollThroughTransition(page, 'section-transition-1', {
      steps: 30,
      stepDelay: 60,
      margin: 10,
    });

    // Filmstrip for visual review.
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

    // ─── Lock-in: continuity at transition start ────────────────────────────
    // Per docs/map-scroll-behavior.md: "At progress 0: viewA = location of A
    // (same as previous hold — the map hasn't moved yet)". The first
    // transition frame must therefore be ~where hold-0 left off, not a sudden
    // zoom-in on the origin point.
    const first = frames[0];

    const dz = Math.abs(first.map.zoom - holdFrame.map.zoom);
    expect(
      dz,
      `Transition jumped at progress=0: hold-0 zoom=${holdFrame.map.zoom.toFixed(2)} ` +
        `→ transition[0] zoom=${first.map.zoom.toFixed(2)} (Δ=${dz.toFixed(2)}). ` +
        `Camera should only start moving as the line draws.`,
    ).toBeLessThan(0.5);

    const z = Math.min(first.map.zoom, holdFrame.map.zoom);
    const avgLat = (first.map.center.lat + holdFrame.map.center.lat) / 2;
    const pxPerDegLng = ((256 * Math.pow(2, z)) / 360) * Math.cos((avgLat * Math.PI) / 180);
    const pxPerDegLat = (256 * Math.pow(2, z)) / 360;
    const dxPx = Math.abs(first.map.center.lng - holdFrame.map.center.lng) * pxPerDegLng;
    const dyPx = Math.abs(first.map.center.lat - holdFrame.map.center.lat) * pxPerDegLat;
    const dPx = Math.hypot(dxPx, dyPx);
    expect(
      dPx,
      `Transition center jumped at progress=0: ≈${dPx.toFixed(0)}px ` +
        `(zoom=${z.toFixed(2)}, Δlng=${(first.map.center.lng - holdFrame.map.center.lng).toFixed(4)}, ` +
        `Δlat=${(first.map.center.lat - holdFrame.map.center.lat).toFixed(4)})`,
    ).toBeLessThan(80);

    // ─── Smoothness across the rest of the transition ───────────────────────
    assertCameraSmooth(frames, { maxZoomDelta: 0.4, maxCenterPxDelta: 200 });

    // ─── Endpoint dots visible from midway through ──────────────────────────
    // Once the line is half-drawn the camera should have eased to frame both
    // origin (Zaventem) and destination (Leuven).
    const secondHalf = frames.slice(Math.floor(frames.length * 0.5));
    assertDotsVisible(secondHalf, 'both');
  });
});
