import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadStory, saveStory, parseStory } from '../src/story';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'story-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const minimalStory = {
  app: { title: 'X' },
  anchor: { lat: 1, lng: 2, label: 'A' },
  opening: { welcomeTitle: 'Hi' },
  closing: { giftReveal: false },
};

describe('parseStory', () => {
  it('accepts a minimal valid story', () => {
    const s = parseStory(minimalStory);
    expect(s.app.title).toBe('X');
    expect(s.anchor.lat).toBe(1);
  });

  it('preserves optional fields when present', () => {
    const s = parseStory({
      ...minimalStory,
      app: { ...minimalStory.app, temperatureUnit: 'celsius' },
      opening: {
        ...minimalStory.opening,
        arcOrigin: { lat: 0, lng: 0, label: 'O' },
        anchorTransport: 'train',
        card: { icon: '✨', date: '2026', text: 't', animate: 'pulse' },
      },
      closing: { giftReveal: true, giftRevealButton: 'b', giftRevealIcon: 'i', giftRevealText: 't' },
    });
    expect(s.app.temperatureUnit).toBe('celsius');
    expect(s.opening.anchorTransport).toBe('train');
    expect(s.opening.card?.animate).toBe('pulse');
    expect(s.closing.giftRevealButton).toBe('b');
  });

  it('rejects missing required fields', () => {
    expect(() => parseStory({})).toThrow();
    expect(() => parseStory({ app: {} })).toThrow(/title/);
    expect(() => parseStory({ ...minimalStory, anchor: { lat: 1, lng: 2 } })).toThrow(/label/);
    expect(() => parseStory({ ...minimalStory, closing: {} })).toThrow(/giftReveal/);
  });

  it('rejects wrong types', () => {
    expect(() => parseStory({ ...minimalStory, anchor: { lat: 'x', lng: 0, label: 'A' } })).toThrow();
    expect(() => parseStory({ ...minimalStory, closing: { giftReveal: 'yes' } })).toThrow();
  });

  it('rejects invalid enum values', () => {
    expect(() => parseStory({
      ...minimalStory,
      app: { ...minimalStory.app, temperatureUnit: 'kelvin' },
    })).toThrow(/temperatureUnit/);
    expect(() => parseStory({
      ...minimalStory,
      opening: { ...minimalStory.opening, anchorTransport: 'rocket' },
    })).toThrow(/anchorTransport/);
    expect(() => parseStory({
      ...minimalStory,
      opening: { ...minimalStory.opening, card: { animate: 'spin' } },
    })).toThrow(/animate/);
  });

  it('strips unknown top-level keys', () => {
    const s = parseStory({ ...minimalStory, extra: 'nope' } as never);
    expect((s as unknown as Record<string, unknown>).extra).toBeUndefined();
  });
});

describe('loadStory / saveStory', () => {
  it('round-trips through disk', async () => {
    const path = join(dir, 'story.json');
    writeFileSync(path, JSON.stringify(minimalStory));
    const s = await loadStory(path);
    s.app.title = 'edited';
    await saveStory(path, s);
    const reloaded = JSON.parse(readFileSync(path, 'utf-8'));
    expect(reloaded.app.title).toBe('edited');
  });

  it('writes pretty-printed JSON with trailing newline', async () => {
    const path = join(dir, 'story.json');
    await saveStory(path, parseStory(minimalStory));
    const text = readFileSync(path, 'utf-8');
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('  "app"');
  });

  it('rejects invalid input on save', async () => {
    const path = join(dir, 'story.json');
    await expect(saveStory(path, { app: {} } as never)).rejects.toThrow();
    expect(existsSync(path)).toBe(false);
  });
});
