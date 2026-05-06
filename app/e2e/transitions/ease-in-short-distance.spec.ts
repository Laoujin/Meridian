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
const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'ease-in-short-distance');

test.describe('(ease-in, short distance)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('both dots visible throughout and camera zooms in smoothly', async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);

    const endPos = await getMemoryIndexByTitle(page, 'endPos');
    const startPos = await getMemoryIndexByTitle(page, 'startPos');
    if (endPos !== startPos + 1) {
      throw new Error(
        `Expected endPos directly after startPos, got ${startPos} → ${endPos}`,
      );
    }

    await smoothScrollToSection(page, `section-hold-${startPos}`, 0.5, {
      steps: 6,
      stepDelay: 50,
    });

    const frames = await scrollThroughTransition(
      page,
      `section-transition-${endPos}`,
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
