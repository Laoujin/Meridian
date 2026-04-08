import { test, expect } from '@playwright/test';

test('app loads and map renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.mapboxgl-canvas, .maplibregl-canvas').first()).toBeVisible({ timeout: 10_000 });
});
