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
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
