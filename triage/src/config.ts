import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setEnvVar } from './env';

export interface TriageConfig {
  slug: string;
  photoFolder: string;
}

const SLUG_RX = /^[a-z0-9][a-z0-9_-]*$/i;
const STORY_FILE_RX = /^(memories.*\.json|story\.json)$/;

export function listStories(dataRoot: string): string[] {
  if (!existsSync(dataRoot)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dataRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const inner = readdirSync(join(dataRoot, entry.name));
    if (inner.some(n => STORY_FILE_RX.test(n))) found.push(entry.name);
  }
  return found.sort();
}

export function loadConfig(path: string): TriageConfig | null {
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    if (typeof data?.slug !== 'string' || typeof data?.photoFolder !== 'string') return null;
    return { slug: data.slug, photoFolder: data.photoFolder };
  } catch { return null; }
}

export function saveConfig(path: string, config: TriageConfig): void {
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}

export function scaffoldStory(dataRoot: string, slug: string, appEnvPath?: string): void {
  if (!SLUG_RX.test(slug)) throw new Error(`Invalid slug: ${slug}`);
  const dir = join(dataRoot, slug);
  if (existsSync(dir)) throw new Error(`Story already exists: ${slug}`);
  mkdirSync(dir, { recursive: true });
  for (const sub of ['photos/full', 'photos/thumb', 'music', 'videos']) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  writeFileSync(join(dir, 'memories.json'), '[]\n');
  writeFileSync(join(dir, 'story.json'), JSON.stringify(storyTemplate(slug), null, 2) + '\n');
  if (appEnvPath) setEnvVar(appEnvPath, 'MERIDIAN_DATA', `data/${slug}`);
}

function titleize(slug: string): string {
  return slug.split(/[-_]/).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function storyTemplate(slug: string) {
  return {
    app: {
      title: titleize(slug),
      faviconHref: '/favicons/rings.svg',
      temperatureUnit: 'celsius',
    },
    anchor: { lat: 0, lng: 0, label: 'Set me' },
    opening: {
      welcomeTitle: 'We met on Tinder',
      welcomeSubtitle: 'The story of how we met',
      heroImage: '/start1.jpg',
      card: { icon: '✨', date: '', text: titleize(slug), animate: 'pulse' },
    },
    closing: {
      giftReveal: false,
      giftRevealButton: 'and then... ✨',
      giftRevealIcon: '🎁',
      giftRevealText: 'A Present!?',
    },
  };
}
