import type { Page } from '@playwright/test';

const CACHE = new WeakMap<Page, Map<string, number>>();

async function getSectionIdsFromDom(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const els = document.querySelectorAll('[id^="section-hold-"]');
    return Array.from(els)
      .map((e) => e.id)
      .filter((id) => /^section-hold-\d+$/.test(id))
      .sort((a, b) => {
        const ai = Number(a.split('-').pop());
        const bi = Number(b.split('-').pop());
        return ai - bi;
      });
  });
}

async function readActiveCardTitle(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el =
      document.querySelector('.memory-card__title') ??
      document.querySelector('h2');
    return el?.textContent?.trim() ?? null;
  });
}

/**
 * Resolve a memory index by the exact card title shown at that hold.
 * Caches per-page so repeated lookups in one test do not re-scroll the page.
 *
 * Throws if the title is not found among existing hold sections.
 */
export async function getMemoryIndexByTitle(
  page: Page,
  title: string,
): Promise<number> {
  let cache = CACHE.get(page);
  if (!cache) {
    cache = new Map();
    CACHE.set(page, cache);
  }
  const hit = cache.get(title);
  if (hit !== undefined) return hit;

  const holdIds = await getSectionIdsFromDom(page);
  for (const id of holdIds) {
    const idx = Number(id.split('-').pop());
    // Jump instantly — we only need the card title at the midpoint.
    const y = await page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      if (!el) return null;
      return el.offsetTop + el.offsetHeight * 0.5;
    }, id);
    if (y == null) continue;
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(120);
    const currentTitle = await readActiveCardTitle(page);
    if (currentTitle) cache.set(currentTitle, idx);
    if (currentTitle === title) return idx;
  }

  throw new Error(
    `Memory titled "${title}" not found. Known titles: ${[...cache.keys()].join(', ')}`,
  );
}
