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
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
