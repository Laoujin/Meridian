import { readFile, writeFile } from 'node:fs/promises';
import type { Story, StoryPlace } from '../../../app/src/types/story';
import type { TransportMode } from '../../../app/src/types/memory';

const TRANSPORT_MODES = ['car', 'plane', 'train', 'metro', 'walking', 'boat', 'bike', 'bus'] as const;
const ANIMATE_MODES = ['heartbeat', 'bounce', 'pulse'] as const;
const TEMP_UNITS = ['celsius', 'fahrenheit'] as const;

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

function parsePlace(p: unknown, where: string): StoryPlace {
  if (!p || typeof p !== 'object') throw new Error(`${where}: expected object`);
  const o = p as Record<string, unknown>;
  if (!isNum(o.lat)) throw new Error(`${where}.lat: expected number`);
  if (!isNum(o.lng)) throw new Error(`${where}.lng: expected number`);
  if (!isStr(o.label)) throw new Error(`${where}.label: expected string`);
  return { lat: o.lat, lng: o.lng, label: o.label };
}

function parseEnum<T extends string>(v: unknown, allowed: readonly T[], where: string): T {
  if (!isStr(v) || !(allowed as readonly string[]).includes(v)) {
    throw new Error(`${where}: expected one of ${allowed.join(', ')}`);
  }
  return v as T;
}

export function parseStory(input: unknown): Story {
  if (!input || typeof input !== 'object') throw new Error('story: expected object');
  const o = input as Record<string, unknown>;

  const appIn = o.app as Record<string, unknown> | undefined;
  if (!appIn || !isStr(appIn.title)) throw new Error('app.title: expected string');
  const app: Story['app'] = { title: appIn.title };
  if (appIn.faviconHref !== undefined) {
    if (!isStr(appIn.faviconHref)) throw new Error('app.faviconHref: expected string');
    app.faviconHref = appIn.faviconHref;
  }
  if (appIn.temperatureUnit !== undefined) {
    app.temperatureUnit = parseEnum(appIn.temperatureUnit, TEMP_UNITS, 'app.temperatureUnit');
  }

  const anchor = parsePlace(o.anchor, 'anchor');

  const openIn = o.opening as Record<string, unknown> | undefined;
  if (!openIn || !isStr(openIn.welcomeTitle)) throw new Error('opening.welcomeTitle: expected string');
  const opening: Story['opening'] = { welcomeTitle: openIn.welcomeTitle };
  if (openIn.welcomeSubtitle !== undefined) {
    if (!isStr(openIn.welcomeSubtitle)) throw new Error('opening.welcomeSubtitle: expected string');
    opening.welcomeSubtitle = openIn.welcomeSubtitle;
  }
  if (openIn.heroImage !== undefined) {
    if (!isStr(openIn.heroImage)) throw new Error('opening.heroImage: expected string');
    opening.heroImage = openIn.heroImage;
  }
  if (openIn.arcOrigin !== undefined) {
    opening.arcOrigin = parsePlace(openIn.arcOrigin, 'opening.arcOrigin');
  }
  if (openIn.anchorTransport !== undefined) {
    opening.anchorTransport = parseEnum<TransportMode>(openIn.anchorTransport, TRANSPORT_MODES, 'opening.anchorTransport');
  }
  if (openIn.card !== undefined) {
    const c = openIn.card as Record<string, unknown>;
    const card: NonNullable<Story['opening']['card']> = {};
    if (c.icon !== undefined) {
      if (!isStr(c.icon)) throw new Error('opening.card.icon: expected string');
      card.icon = c.icon;
    }
    if (c.date !== undefined) {
      if (!isStr(c.date)) throw new Error('opening.card.date: expected string');
      card.date = c.date;
    }
    if (c.text !== undefined) {
      if (!isStr(c.text)) throw new Error('opening.card.text: expected string');
      card.text = c.text;
    }
    if (c.animate !== undefined) {
      card.animate = parseEnum(c.animate, ANIMATE_MODES, 'opening.card.animate');
    }
    opening.card = card;
  }

  const closeIn = o.closing as Record<string, unknown> | undefined;
  if (!closeIn || !isBool(closeIn.giftReveal)) throw new Error('closing.giftReveal: expected boolean');
  const closing: Story['closing'] = { giftReveal: closeIn.giftReveal };
  for (const k of ['giftRevealButton', 'giftRevealIcon', 'giftRevealText'] as const) {
    if (closeIn[k] !== undefined) {
      if (!isStr(closeIn[k])) throw new Error(`closing.${k}: expected string`);
      closing[k] = closeIn[k] as string;
    }
  }

  return { app, anchor, opening, closing };
}

export async function loadStory(path: string): Promise<Story> {
  return parseStory(JSON.parse(await readFile(path, 'utf-8')));
}

export async function saveStory(path: string, story: Story): Promise<void> {
  const validated = parseStory(story);
  await writeFile(path, JSON.stringify(validated, null, 2) + '\n');
}
