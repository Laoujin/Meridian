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
const SHOTS_DIR = path.join(__dirname, '..', 'screenshots', 'fixture-milestone');

// Coordinates from test-memories.json — kept local so the test fails loudly
// if the fixture is changed without updating the assertions.
const MILESTONE_LNGLAT: [number, number] = [4.7060, 50.9056]; // Memory 3 — milestone
const NEXT_LNGLAT: [number, number] = [3.7250, 51.0538]; // Memory 4 — Verrassingsbord (Gent)

test.describe('Fixture: Milestone — dim repositions, line draws from milestone', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  });

  test('milestone hold pre-frames [milestone, next] and post-milestone line starts from milestone', async ({
    page,
  }) => {
    await useFixture(page, 'test-memories.json');
    await page.goto('/');
    await waitForMapReady(page);

    // Land in the middle of the milestone hold (memory 3).
    await page.evaluate(() => {
      const el = document.getElementById('section-hold-3');
      if (el) window.scrollTo({ top: el.offsetTop + el.offsetHeight * 0.5, behavior: 'instant' });
    });
    await page.waitForTimeout(400);

    const milestoneFrame = await captureFrame(page, 'milestone-hold-mid', 10);
    if (!milestoneFrame) throw new Error('Failed to capture milestone hold frame');
    await page.screenshot({ path: path.join(SHOTS_DIR, '00-milestone-hold.png') });

    // Lock-in #1: the milestone hold's viewA/viewB ARE the milestone's
    // location and the next-located memory's location — the camera is
    // already framing the line that's about to be drawn.
    expect(milestoneFrame.view).not.toBeNull();
    expect(milestoneFrame.view!.viewA[0]).toBeCloseTo(MILESTONE_LNGLAT[0], 4);
    expect(milestoneFrame.view!.viewA[1]).toBeCloseTo(MILESTONE_LNGLAT[1], 4);
    expect(milestoneFrame.view!.viewB[0]).toBeCloseTo(NEXT_LNGLAT[0], 4);
    expect(milestoneFrame.view!.viewB[1]).toBeCloseTo(NEXT_LNGLAT[1], 4);

    // Lock-in #2: both anchors of the upcoming line are visible at the
    // milestone hold (despite the dim — the geometry is right).
    const milestoneAnchorVisibility = await page.evaluate(
      ({ from, to, margin }) => {
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
        return { milestone: check(from), next: check(to) };
      },
      { from: MILESTONE_LNGLAT, to: NEXT_LNGLAT, margin: 10 },
    );
    expect(
      milestoneAnchorVisibility.milestone.visible,
      `Milestone off-screen at hold-3: ${JSON.stringify(milestoneAnchorVisibility.milestone.px)}`,
    ).toBe(true);
    expect(
      milestoneAnchorVisibility.next.visible,
      `Next memory off-screen at hold-3: ${JSON.stringify(milestoneAnchorVisibility.next.px)}`,
    ).toBe(true);

    // Now scroll through the transition out of the milestone (transition-4).
    const frames = await scrollThroughTransition(page, 'section-transition-4', {
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
      JSON.stringify({ milestoneFrame, frames }, null, 2),
    );

    const first = frames[0];

    // Lock-in #3: the post-milestone line starts AT the milestone's location
    // (lineOriginAt no longer skips milestones-with-locations).
    expect(first.view).not.toBeNull();
    expect(first.view!.travelFrom).not.toBeNull();
    expect(first.view!.travelFrom![0]).toBeCloseTo(MILESTONE_LNGLAT[0], 4);
    expect(first.view!.travelFrom![1]).toBeCloseTo(MILESTONE_LNGLAT[1], 4);
    expect(first.view!.travelTo![0]).toBeCloseTo(NEXT_LNGLAT[0], 4);
    expect(first.view!.travelTo![1]).toBeCloseTo(NEXT_LNGLAT[1], 4);

    // Lock-in #4: continuity at transition start — the camera must NOT jump
    // when the dim lifts; the milestone hold already framed the new line.
    const dz = Math.abs(first.map.zoom - milestoneFrame.map.zoom);
    expect(
      dz,
      `Transition jumped at progress=0: milestone-hold zoom=${milestoneFrame.map.zoom.toFixed(2)} ` +
        `→ transition[0] zoom=${first.map.zoom.toFixed(2)} (Δ=${dz.toFixed(2)})`,
    ).toBeLessThan(0.5);

    // Lock-in #5: smoothness across the transition AND both endpoints stay
    // visible. Because priorView == new hold target, the camera is essentially
    // motionless throughout; the line just draws.
    assertCameraSmooth(frames, { maxZoomDelta: 0.4, maxCenterPxDelta: 200 });
    assertDotsVisible(frames, 'both');
  });
});
