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

test('close-up of destination dot alignment', async ({ page }) => {
  await page.goto('/');
  await waitForMapReady(page);

  // Go to hold memory 1 (Zaventem→Leuven line)
  await scrollToSection(page, 'section-hold-1', 0.5);
  await page.waitForTimeout(500);

  // Add a blue crosshair at the exact projected pixel position of dest
  await page.evaluate(() => {
    const map = (window as any).__mlMap;
    const view = (window as any).__viewState;
    if (!map || !view?.travelTo) return;

    const px = map.project(view.travelTo);
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:${px.x - 20}px;top:${px.y - 20}px;width:40px;height:40px;border:2px solid blue;border-radius:50%;pointer-events:none;z-index:9999;box-sizing:border-box;`;
    const h = document.createElement('div');
    h.style.cssText = 'position:absolute;top:50%;left:0;right:0;height:1px;background:blue;transform:translateY(-50%)';
    const v = document.createElement('div');
    v.style.cssText = 'position:absolute;left:50%;top:0;bottom:0;width:1px;background:blue;transform:translateX(-50%)';
    el.appendChild(h);
    el.appendChild(v);
    document.body.appendChild(el);
  });
  await page.waitForTimeout(100);

  // Get pixel position of destination and capture a close-up clip
  const destInfo = await page.evaluate(() => {
    const map = (window as any).__mlMap;
    const view = (window as any).__viewState;
    if (!map || !view) return null;

    const destPx = map.project(view.travelTo);
    const fromPx = map.project(view.travelFrom);

    // Measure the actual .location-marker dots (not the wrapper)
    const dots = document.querySelectorAll('.location-marker');
    const markerRects = Array.from(dots).map(d => {
      const r = (d as HTMLElement).getBoundingClientRect();
      const wrapperR = (d as HTMLElement).closest('.maplibregl-marker')?.getBoundingClientRect();
      const wrapperTransform = ((d as HTMLElement).closest('.maplibregl-marker') as HTMLElement)?.style.transform;
      const wrapperComputed = window.getComputedStyle((d as HTMLElement).closest('.maplibregl-marker')!);
      return {
        dot: { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 },
        wrapper: wrapperR ? { x: wrapperR.x, y: wrapperR.y, w: wrapperR.width, h: wrapperR.height } : null,
        wrapperTransform,
        wrapperDisplay: wrapperComputed.display,
        wrapperWidth: wrapperComputed.width,
        wrapperHeight: wrapperComputed.height,
      };
    });

    return {
      destPx: { x: destPx.x, y: destPx.y },
      fromPx: { x: fromPx.x, y: fromPx.y },
      markers: markerRects,
    };
  });

  console.log('Destination pixel position:', JSON.stringify(destInfo, null, 2));

  if (destInfo) {
    // Clip a 200x200 region centered on the destination
    const cx = destInfo.destPx.x;
    const cy = destInfo.destPx.y;
    await page.screenshot({
      path: 'e2e/screenshots/dest-closeup.png',
      clip: {
        x: Math.max(0, cx - 100),
        y: Math.max(0, cy - 100),
        width: 200,
        height: 200,
      },
    });
  }

  // Also full screenshot for reference
  await page.screenshot({ path: 'e2e/screenshots/dest-full.png' });
});
