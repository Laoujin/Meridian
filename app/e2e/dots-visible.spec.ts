import { test, expect, Page } from '@playwright/test';

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

test('dots are visible at hold memory 1', async ({ page }) => {
  page.on('console', msg => console.log('PAGE:', msg.text()));
  await page.goto('/');
  // Wait for map to fully load
  await page.locator('.maplibregl-canvas').first().waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => {
    const map = (window as any).__mlMap;
    return map && map.isStyleLoaded() && map.loaded();
  }, { timeout: 10_000 });
  await page.waitForTimeout(1000);

  await scrollToSection(page, 'section-hold-1', 0.5);
  await page.waitForTimeout(1000);

  // Check if our circle layers exist and have data
  const layerInfo = await page.evaluate(() => {
    const map = (window as any).__mlMap;
    if (!map) return { error: 'no map' };

    const style = map.getStyle();
    const layers = style.layers.map((l: any) => ({ id: l.id, type: l.type, source: l.source }));
    const sources = Object.entries(style.sources).map(([id, s]: [string, any]) => ({
      id,
      type: s.type,
    }));

    // Check our specific sources
    const markerSources: any[] = [];
    for (const [id, s] of Object.entries(style.sources)) {
      if (id.startsWith('loc-marker')) {
        const src = map.getSource(id);
        markerSources.push({
          id,
          // Try to get the data
          hasSource: !!src,
        });
      }
    }

    // Also check all layers
    const circleLayers = layers.filter((l: any) => l.type === 'circle');

    return { layers, sources, markerSources, circleLayers };
  });

  console.log('Layer info:', JSON.stringify(layerInfo, null, 2));

  await page.screenshot({ path: 'e2e/screenshots/dots-visible.png' });
});
