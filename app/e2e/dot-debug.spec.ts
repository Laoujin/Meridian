import { test, Page } from '@playwright/test';

async function waitForMapReady(page: Page) {
  await page.locator('.maplibregl-canvas').first().waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => (window as any).__mlMap?.loaded(), { timeout: 10_000 });
  await page.waitForTimeout(500);
}

async function scrollToSection(page: Page, sectionId: string, progress = 0.5) {
  const pos = await page.evaluate(({ id, p }) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return el.offsetTop + el.offsetHeight * p;
  }, { id: sectionId, p: progress });
  if (pos !== null) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), pos);
    await page.waitForTimeout(600);
  }
}

test('dot positions during hold and mid-transition', async ({ page }) => {
  await page.goto('/');
  await waitForMapReady(page);

  // Collect all visible markers and their pixel positions at various stages
  const captureMarkers = async (label: string) => {
    const info = await page.evaluate(() => {
      const map = (window as any).__mlMap;
      const view = (window as any).__viewState;
      const scroll = (window as any).__scrollState;

      // Find all marker elements on the map
      const markers = document.querySelectorAll('.maplibregl-marker');
      const markerData = Array.from(markers).map((m, i) => {
        const el = m as HTMLElement;
        const transform = el.style.transform;
        const classes = Array.from(el.children[0]?.classList ?? []);
        const text = el.textContent?.trim() ?? '';
        const rect = el.getBoundingClientRect();
        return {
          index: i,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          classes,
          text,
          visible: el.style.display !== 'none' && el.style.opacity !== '0',
        };
      });

      // Project the key coordinates to pixels
      const projectPoint = (coord: [number, number] | null) => {
        if (!coord || !map) return null;
        const px = map.project(coord);
        return { x: Math.round(px.x), y: Math.round(px.y) };
      };

      return {
        scroll: { idx: scroll?.activeIndex, phase: scroll?.phase, progress: scroll?.progress?.toFixed(2) },
        travelFrom: view?.travelFrom,
        travelTo: view?.travelTo,
        travelFromPx: projectPoint(view?.travelFrom),
        travelToPx: projectPoint(view?.travelTo),
        viewA: view?.viewA,
        viewB: view?.viewB,
        viewAPx: projectPoint(view?.viewA),
        viewBPx: projectPoint(view?.viewB),
        markers: markerData,
      };
    });

    console.log(`\n=== ${label} ===`);
    console.log(JSON.stringify(info, null, 2));
  };

  // Hold at memory 0
  await scrollToSection(page, 'section-hold-0', 0.5);
  await captureMarkers('Hold memory 0');
  await page.screenshot({ path: 'e2e/screenshots/dot-hold0.png' });

  // Mid-transition 0→1
  await scrollToSection(page, 'section-transition-1', 0.5);
  await captureMarkers('Mid-transition 0→1');
  await page.screenshot({ path: 'e2e/screenshots/dot-trans1-p50.png' });

  // Hold at memory 1
  await scrollToSection(page, 'section-hold-1', 0.5);
  await captureMarkers('Hold memory 1');
  await page.screenshot({ path: 'e2e/screenshots/dot-hold1.png' });
});
