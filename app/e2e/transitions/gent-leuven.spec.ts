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
