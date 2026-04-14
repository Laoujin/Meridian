import type { Page } from '@playwright/test';
import { captureFrame, Frame } from './map-state';

export interface SmoothScrollOptions {
  steps?: number;
  stepDelay?: number;
  margin?: number;
}

async function getSectionGeometry(
  page: Page,
  sectionId: string,
): Promise<{ top: number; height: number } | null> {
  return page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    return { top: el.offsetTop, height: el.offsetHeight };
  }, sectionId);
}

async function currentScrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

/**
 * Smoothly scroll from the current position to `(section top + sectionHeight *
 * targetProgress)` in `steps` increments, capturing a frame after each step.
 *
 * Using `behavior: 'instant'` per-step is intentional: Lenis + GSAP
 * ScrollTrigger react to the plain scroll event on every increment, so
 * many small jumps produce ScrollTrigger updates at each intermediate
 * progress value — which is exactly what we need to test frame-by-frame.
 */
export async function smoothScrollToSection(
  page: Page,
  sectionId: string,
  targetProgress: number,
  opts: SmoothScrollOptions = {},
): Promise<Frame[]> {
  const steps = opts.steps ?? 20;
  const stepDelay = opts.stepDelay ?? 50;
  const margin = opts.margin ?? 40;

  const geom = await getSectionGeometry(page, sectionId);
  if (!geom) throw new Error(`Section not found: ${sectionId}`);

  const fromY = await currentScrollY(page);
  const toY = geom.top + geom.height * targetProgress;

  const frames: Frame[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const y = fromY + (toY - fromY) * t;
    await page.evaluate((targetY) => {
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }, y);
    await page.waitForTimeout(stepDelay);
    const frame = await captureFrame(page, `${sectionId}@${t.toFixed(2)}`, margin);
    if (frame) frames.push(frame);
  }
  return frames;
}

/**
 * Scroll through an entire transition section from progress 0 to 1. Also
 * primes the position at progress 0 first (one instant jump) so the first
 * captured frame is always at the start of the transition.
 */
export async function scrollThroughTransition(
  page: Page,
  sectionId: string,
  opts: SmoothScrollOptions = {},
): Promise<Frame[]> {
  // Prime at progress 0 (instant, not counted as a step).
  const geom = await getSectionGeometry(page, sectionId);
  if (!geom) throw new Error(`Section not found: ${sectionId}`);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), geom.top);
  await page.waitForTimeout(opts.stepDelay ?? 50);

  return smoothScrollToSection(page, sectionId, 1, opts);
}
