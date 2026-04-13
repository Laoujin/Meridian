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

test('compare cameraForBounds vs fitBounds at hold 0', async ({ page }) => {
  await page.goto('/');
  await waitForMapReady(page);
  await scrollToSection(page, 'section-hold-0', 0.5);
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const map = (window as any).__mlMap;
    const view = (window as any).__viewState;
    if (!map || !view) return null;

    const h = map.getContainer().clientHeight;

    // Current camera (from cameraForBounds path)
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    // What fitBounds would give
    const viewA = view.viewA;
    const viewB = view.viewB;
    const minSpread = 0.01;
    const lngSpread = Math.max(Math.abs(viewB[0] - viewA[0]), minSpread);
    const latSpread = Math.max(Math.abs(viewB[1] - viewA[1]), minSpread);
    const cLng = (viewA[0] + viewB[0]) / 2;
    const cLat = (viewA[1] + viewB[1]) / 2;
    const bounds = [[cLng - lngSpread/2, cLat - latSpread/2], [cLng + lngSpread/2, cLat + latSpread/2]];

    const padding = { top: Math.round(h * 0.67), bottom: 40, left: 40, right: 40 };

    const camera = map.cameraForBounds(bounds, { padding, maxZoom: 14 });

    // Also project the viewA/viewB points to see where they end up on screen
    const viewAPx = map.project(viewA);
    const viewBPx = map.project(viewB);

    return {
      screenH: h,
      bottomThirdStart: Math.round(h * 0.67),
      current: { lng: currentCenter.lng.toFixed(4), lat: currentCenter.lat.toFixed(4), zoom: currentZoom.toFixed(2) },
      cameraForBounds: camera ? { lng: camera.center.lng.toFixed(4), lat: camera.center.lat.toFixed(4), zoom: camera.zoom.toFixed(2) } : null,
      viewAPx: { x: Math.round(viewAPx.x), y: Math.round(viewAPx.y) },
      viewBPx: { x: Math.round(viewBPx.x), y: Math.round(viewBPx.y) },
    };
  });

  console.log(JSON.stringify(result, null, 2));
});
