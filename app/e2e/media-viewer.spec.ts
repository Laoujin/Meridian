import { test, expect, type Page } from '@playwright/test';
import { useFixture, waitForMapReady } from './helpers';

const PORTRAIT = { w: 600, h: 1200 }; // 1:2
const LANDSCAPE = { w: 1600, h: 600 }; // 8:3

function svg(w: number, h: number, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${color}"/></svg>`;
}

async function mockPhotos(page: Page) {
  await page.route('**/photos/full/test-portrait.png', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg(PORTRAIT.w, PORTRAIT.h, '#7a3f9a') }),
  );
  await page.route('**/photos/full/test-landscape.png', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg(LANDSCAPE.w, LANDSCAPE.h, '#3a7a5f') }),
  );
  await page.route('**/photos/thumb/test-portrait.png', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg(PORTRAIT.w, PORTRAIT.h, '#7a3f9a') }),
  );
  await page.route('**/photos/thumb/test-landscape.png', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg(LANDSCAPE.w, LANDSCAPE.h, '#3a7a5f') }),
  );
}

async function openModal(page: Page, sectionId: string) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, sectionId);
  // Card overlay needs a frame to render after scroll
  await page.waitForTimeout(300);
  await page.locator('.photo-stack__expand').first().click();
  await expect(page.locator('.media-viewer__img')).toBeVisible();
  // Let the image actually load so its rendered box is final
  await page.locator('.media-viewer__img').evaluate((el: HTMLImageElement) =>
    el.complete ? Promise.resolve() : new Promise((r) => el.addEventListener('load', () => r(null), { once: true })),
  );
}

test.describe('MediaViewer fullscreen sizing', () => {
  test.beforeEach(async ({ page }) => {
    await useFixture(page, 'media-viewer.json');
    await mockPhotos(page);
    await page.goto('/');
    await waitForMapReady(page);
  });

  test('portrait image fills available height', async ({ page }) => {
    await openModal(page, 'section-hold-0');

    const viewport = page.viewportSize()!;
    const imgBox = await page.locator('.media-viewer__img').boundingBox();
    expect(imgBox).not.toBeNull();
    if (!imgBox) return;

    console.log(`Viewport ${viewport.width}x${viewport.height}, portrait image rendered ${Math.round(imgBox.width)}x${Math.round(imgBox.height)} at (${Math.round(imgBox.x)}, ${Math.round(imgBox.y)})`);

    // Image is 1:2 portrait. On a portrait viewport, height should be the
    // limiting dimension and the image should fill ≥85% of viewport height.
    expect(imgBox.height).toBeGreaterThan(viewport.height * 0.85);

    // Top of the image must clear the close button (which sits at top:16, 40px tall).
    expect(imgBox.y).toBeGreaterThanOrEqual(56);

  });

  test('landscape image fills available width', async ({ page }) => {
    await openModal(page, 'section-hold-1');

    const viewport = page.viewportSize()!;
    const imgBox = await page.locator('.media-viewer__img').boundingBox();
    expect(imgBox).not.toBeNull();
    if (!imgBox) return;

    console.log(`Viewport ${viewport.width}x${viewport.height}, landscape image rendered ${Math.round(imgBox.width)}x${Math.round(imgBox.height)} at (${Math.round(imgBox.x)}, ${Math.round(imgBox.y)})`);

    // Image is 8:3 landscape on a portrait viewport — width should be the
    // limiting dimension and image should fill ≥95% of viewport width.
    expect(imgBox.width).toBeGreaterThan(viewport.width * 0.95);

    // Top of the image must clear the close button.
    expect(imgBox.y).toBeGreaterThanOrEqual(56);
  });
});
