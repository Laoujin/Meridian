import { test, expect } from '@playwright/test';
import {
  waitForMapReady,
  scrollThroughTransition,
  assertCameraSmooth,
  assertZoomFloor,
  useFixture,
} from '../helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'fixture-opening');

// Memory 0 in test-memories.json — Zaventem (sits inside the Gent ↔ Herent
// frame, which is what the opening camera was designed for).
const MEM0_LNGLAT: [number, number] = [4.4720, 50.8847];

// Mirrors src/components/OpeningArc.tsx — kept local so the test fails
// loudly if the app ever moves these constants.
const GENT: [number, number] = [3.7527, 51.0597];
const HERENT: [number, number] = [4.6717, 50.8985];

test.describe('Fixture: Opening → Memory 0 (converging arcs to Zaventem)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('arcs draw smoothly and end frame contains Gent + Herent + destination', async ({ page }) => {
    await useFixture(page, 'test-memories.json');
    await page.goto('/');
    await waitForMapReady(page);

    // Prime opening hold so the transition begins from the real
    // Gent-Herent arc camera, not whatever stale state was left over.
    await page.evaluate(() => {
      const el = document.getElementById('section-opening-hold');
      if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.5, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS_DIR, '00-hold.png') });

    const frames = await scrollThroughTransition(page, 'section-transition-0', {
      steps: 20,
      stepDelay: 60,
    });

    // Filmstrip at 0/25/50/75/100% for visual review.
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const f = frames[Math.min(frames.length - 1, Math.round((frames.length - 1) * t))];
      if (!f) continue;
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), f.scrollY);
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(SHOTS_DIR, `trans-${Math.round(t * 100)}.png`) });
    }

    fs.writeFileSync(path.join(SHOTS_DIR, 'frames.json'), JSON.stringify(frames, null, 2));

    // Camera invariants throughout the opening transition.
    assertZoomFloor(frames, 5);
    assertCameraSmooth(frames, { maxZoomDelta: 0.7, maxCenterPxDelta: 320 });

    // Settle on hold-0 and verify the three opening anchors are all on screen.
    await page.evaluate(() => {
      const el = document.getElementById('section-hold-0');
      if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.5, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS_DIR, '99-hold-0.png') });

    const visibility = await page.evaluate(
      ({ gent, herent, mem0, margin }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = (window as any).__mlMap;
        const c = map.getContainer();
        const w = c.clientWidth;
        const h = c.clientHeight;
        const check = (pt: [number, number]) => {
          const px = map.project(pt);
          return {
            visible: px.x >= margin && px.x <= w - margin && px.y >= margin && px.y <= h - margin,
            px: { x: Math.round(px.x), y: Math.round(px.y) },
          };
        };
        return { gent: check(gent), herent: check(herent), mem0: check(mem0) };
      },
      // Margin must be < the camera's own fitBounds padding (40px), otherwise
      // dots placed at the padding boundary register as "off screen" by half a
      // subpixel. 10px tolerates projection rounding while still catching real
      // regressions.
      { gent: GENT, herent: HERENT, mem0: MEM0_LNGLAT, margin: 10 },
    );

    expect(
      visibility.gent.visible,
      `Gent off-screen at hold-0: px=${JSON.stringify(visibility.gent.px)}`,
    ).toBe(true);
    expect(
      visibility.herent.visible,
      `Herent off-screen at hold-0: px=${JSON.stringify(visibility.herent.px)}`,
    ).toBe(true);
    expect(
      visibility.mem0.visible,
      `Memory 0 (Zaventem) off-screen at hold-0: px=${JSON.stringify(visibility.mem0.px)}`,
    ).toBe(true);
  });
});
