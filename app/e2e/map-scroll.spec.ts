import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

/**
 * Diagnostic test: scroll through memories and capture map + scroll state
 * to identify positioning bugs (world zoom, jumps, etc).
 */

async function waitForMapReady(page: Page) {
  await page.locator('.maplibregl-canvas').first().waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => (window as any).__mlMap?.loaded(), { timeout: 10_000 });
  await page.waitForTimeout(500);
}

async function scrollToSection(page: Page, sectionId: string, progress = 0.5) {
  const pos = await page.evaluate(({ id, p }) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const top = el.offsetTop;
    const height = el.offsetHeight;
    return top + height * p;
  }, { id: sectionId, p: progress });

  if (pos !== null) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), pos);
    // Let Lenis + GSAP ScrollTrigger process
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
    const zoom = map.getZoom();
    const bounds = map.getBounds();

    return {
      scroll: {
        activeIndex: scroll.activeIndex,
        phase: scroll.phase,
        progress: Math.round(scroll.progress * 100) / 100,
        transitionType: scroll.transitionType,
      },
      view: view ? {
        viewA: view.viewA.map((v: number) => Math.round(v * 10000) / 10000),
        viewB: view.viewB.map((v: number) => Math.round(v * 10000) / 10000),
        travelFrom: view.travelFrom?.map((v: number) => Math.round(v * 10000) / 10000) ?? null,
        travelTo: view.travelTo?.map((v: number) => Math.round(v * 10000) / 10000) ?? null,
        lineProgress: Math.round(view.lineProgress * 100) / 100,
      } : null,
      map: {
        center: { lng: Math.round(center.lng * 10000) / 10000, lat: Math.round(center.lat * 10000) / 10000 },
        zoom: Math.round(zoom * 100) / 100,
        boundsSpanLng: Math.round((bounds.getEast() - bounds.getWest()) * 1000) / 1000,
        boundsSpanLat: Math.round((bounds.getNorth() - bounds.getSouth()) * 1000) / 1000,
      },
    };
  });
}

test.describe('Map scroll behavior diagnostics', () => {
  test('capture state at each hold and transition for first 6 memories', async ({ page }) => {
    await page.goto('/');
    await waitForMapReady(page);

    const log: string[] = [];
    const logState = async (label: string) => {
      const state = await captureState(page);
      const line = `${label}: ${JSON.stringify(state, null, 2)}`;
      log.push(line);
      log.push('---');
    };

    // Opening
    await scrollToSection(page, 'section-opening-hold', 0.5);
    await page.screenshot({ path: 'e2e/screenshots/00-opening.png' });
    await logState('Opening hold');

    // Transition to memory 0
    for (const p of [0, 0.5, 1.0]) {
      await scrollToSection(page, 'section-transition-0', p);
      await page.screenshot({ path: `e2e/screenshots/01-trans0-p${Math.round(p * 100)}.png` });
      await logState(`Transition→0 p=${p}`);
    }

    // Hold memory 0
    await scrollToSection(page, 'section-hold-0', 0.5);
    await page.screenshot({ path: 'e2e/screenshots/02-hold0.png' });
    await logState('Hold memory 0 (Zaventem)');

    // Transition 0→1
    for (const p of [0, 0.5, 1.0]) {
      await scrollToSection(page, 'section-transition-1', p);
      await page.screenshot({ path: `e2e/screenshots/03-trans1-p${Math.round(p * 100)}.png` });
      await logState(`Transition 0→1 p=${p}`);
    }

    // Hold memory 1
    await scrollToSection(page, 'section-hold-1', 0.5);
    await page.screenshot({ path: 'e2e/screenshots/04-hold1.png' });
    await logState('Hold memory 1 (Leuven)');

    // Skip ahead to memory 5 (Stichelen — bigger distance)
    // First go through transitions 2,3,4,5
    for (let i = 2; i <= 5; i++) {
      await scrollToSection(page, `section-hold-${i}`, 0.5);
      await page.screenshot({ path: `e2e/screenshots/05-hold${i}.png` });
      await logState(`Hold memory ${i}`);
    }

    // Transition 5→6
    for (const p of [0, 0.5, 1.0]) {
      await scrollToSection(page, 'section-transition-6', p);
      await page.screenshot({ path: `e2e/screenshots/06-trans6-p${Math.round(p * 100)}.png` });
      await logState(`Transition 5→6 p=${p}`);
    }

    // Write the full log
    fs.writeFileSync('e2e/screenshots/diagnostic-log.txt', log.join('\n'));

    // Basic sanity: zoom should never drop below 3 (world view)
    for (const line of log) {
      const zoomMatch = line.match(/"zoom":\s*([\d.]+)/);
      if (zoomMatch) {
        const zoom = parseFloat(zoomMatch[1]);
        expect(zoom, `Zoom too low (world view): ${zoom} in: ${line.substring(0, 80)}`).toBeGreaterThan(3);
      }
    }
  });
});
