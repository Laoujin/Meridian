import type { Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

/**
 * Inject a fixture memory list into `globalThis.__FIXTURE_MEMORIES` before
 * the page loads. `data/loader.ts` checks that global first and uses it
 * instead of the real memories-*.json files. Lets specs run against a
 * stable, hand-curated set of memories so tests don't shift when the
 * real data changes.
 */
export async function useFixture(page: Page, fixtureFile: string): Promise<void> {
  const fullPath = path.join(FIXTURES_DIR, fixtureFile);
  const contents = fs.readFileSync(fullPath, 'utf8');
  // Embedding the JSON literal directly is fine — fixtures are trusted source.
  await page.addInitScript({
    content: `globalThis.__FIXTURE_MEMORIES = ${contents};`,
  });
}
