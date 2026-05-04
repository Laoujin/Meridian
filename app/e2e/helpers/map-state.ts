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
  // Dismiss the Welcome screen if present — the map only mounts after the
  // user clicks "Let's start".
  const startBtn = page.locator('button.welcome__btn');
  if (await startBtn.count()) {
    await startBtn.click();
  }
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
