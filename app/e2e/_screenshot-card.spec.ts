import { test, expect } from '@playwright/test';

test('weather badge screenshot', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Scroll-driven app: keep wheeling until a memory-card is rendered.
  for (let i = 0; i < 40; i++) {
    if (await page.locator('.memory-card').count() > 0) break;
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(120);
  }
  const card = page.locator('.memory-card').first();
  await expect(card).toBeVisible({ timeout: 5000 });
  await card.screenshot({ path: 'e2e/screenshots/_weather-card.png' });
  // Take a couple more at different scroll depths for variety
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(100);
  }
  const card2 = page.locator('.memory-card').first();
  if (await card2.isVisible()) {
    await card2.screenshot({ path: 'e2e/screenshots/_weather-card-2.png' });
  }
});
