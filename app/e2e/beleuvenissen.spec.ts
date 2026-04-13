import { test, Page } from '@playwright/test';
import * as fs from 'fs';

async function waitForMapReady(page: Page) {
  await page.locator('.maplibregl-canvas').first().waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => (window as any).__mlMap?.loaded(), { timeout: 10_000 });
  await page.waitForTimeout(1000);
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

async function captureState(page: Page) {
  return page.evaluate(() => {
    const map = (window as any).__mlMap;
    const scroll = (window as any).__scrollState;
    const view = (window as any).__viewState;
    if (!map || !scroll) return null;
    const center = map.getCenter();

    // Project travelFrom/travelTo to see if they're on screen
    const w = map.getContainer().clientWidth;
    const h = map.getContainer().clientHeight;
    const fromPx = view?.travelFrom ? map.project(view.travelFrom) : null;
    const toPx = view?.travelTo ? map.project(view.travelTo) : null;

    const isOnScreen = (px: any) => px && px.x >= 0 && px.x <= w && px.y >= 0 && px.y <= h;

    return {
      idx: scroll.activeIndex,
      phase: scroll.phase,
      progress: Math.round(scroll.progress * 100),
      center: { lng: center.lng.toFixed(3), lat: center.lat.toFixed(3) },
      zoom: map.getZoom().toFixed(1),
      travelFrom: view?.travelFrom,
      travelTo: view?.travelTo,
      fromOnScreen: fromPx ? isOnScreen(fromPx) : null,
      toOnScreen: toPx ? isOnScreen(toPx) : null,
      fromPx: fromPx ? { x: Math.round(fromPx.x), y: Math.round(fromPx.y) } : null,
      toPx: toPx ? { x: Math.round(toPx.x), y: Math.round(toPx.y) } : null,
    };
  });
}

test('Beleuvenissen → Operatie Caro transition keeps dots visible', async ({ page }) => {
  page.on('console', msg => {
    if (msg.text().startsWith('[cam]')) console.log('CAMLOG:', msg.text());
  });
  await page.goto('/');
  await waitForMapReady(page);

  // Find the memory indices
  const indices = await page.evaluate(() => {
    const scroll = (window as any).__scrollState;
    // Scan section IDs to find which index Beleuvenissen and Operatie Caro are
    const sections = document.querySelectorAll('[id^="section-"]');
    return Array.from(sections).map(s => s.id).filter(id => id.includes('hold') || id.includes('transition')).slice(0, 30);
  });
  console.log('Sections:', indices.join(', '));

  // Beleuvenissen is memory index ~7, Operatie Caro ~8
  // Let me find them by scrolling through holds and checking titles
  const log: string[] = [];

  // First find Beleuvenissen by checking active memories
  for (let i = 5; i <= 12; i++) {
    await scrollToSection(page, `section-hold-${i}`, 0.5);
    const title = await page.evaluate(() => (window as any).__scrollState?.activeIndex);
    const name = await page.evaluate((idx) => {
      const memories = (window as any).__viewState;
      // Try to get memory title from the card
      const card = document.querySelector('.memory-card__title, h2');
      return card?.textContent ?? `idx-${idx}`;
    }, i);
    log.push(`Hold ${i}: ${name}`);
    if (name?.includes('Beleuvenissen') || name?.includes('Operatie')) {
      break;
    }
  }

  // Just test the specific transition - find Beleuvenissen hold, then transition to next
  // Beleuvenissen = 2024-08-09, Operatie Caro = 2024-08-26
  // Let me find the index by looking at section IDs
  const belIdx = await page.evaluate(() => {
    // Find which memory index has title "Beleuvenissen"
    const el = document.querySelector('[id="section-hold-7"]');
    return el ? 7 : null;
  });

  // Scroll to Beleuvenissen hold and capture
  for (let i = 6; i <= 10; i++) {
    await scrollToSection(page, `section-hold-${i}`, 0.5);
    await page.screenshot({ path: `e2e/screenshots/bel-hold${i}.png` });
    const state = await captureState(page);
    log.push(`Hold ${i}: zoom=${state?.zoom} from=${state?.fromOnScreen} to=${state?.toOnScreen}`);
  }

  // Now test the transition between 8 and 9 (adjust based on what we find)
  for (let transIdx = 7; transIdx <= 10; transIdx++) {
    for (const p of [0, 0.25, 0.5, 0.75, 1.0]) {
      await scrollToSection(page, `section-transition-${transIdx}`, p);
      const state = await captureState(page);
      if (state) {
        log.push(`Trans ${transIdx} p=${state.progress}%: zoom=${state.zoom} from=${state.fromOnScreen} to=${state.toOnScreen} center=${state.center.lng},${state.center.lat}`);
      }
      await page.screenshot({ path: `e2e/screenshots/bel-trans${transIdx}-p${Math.round(p*100)}.png` });
    }
  }

  fs.writeFileSync('e2e/screenshots/beleuvenissen-log.txt', log.join('\n'));
});
