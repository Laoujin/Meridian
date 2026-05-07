import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listStories, loadConfig, saveConfig, scaffoldStory } from '../src/config';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'triage-cfg-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('listStories', () => {
  it('returns subdirs containing memories*.json', () => {
    mkdirSync(join(dir, 'ny-trip'));
    writeFileSync(join(dir, 'ny-trip', 'memories.json'), '[]');
    mkdirSync(join(dir, 'love-story'));
    writeFileSync(join(dir, 'love-story', 'memories-2025.json'), '[]');
    expect(listStories(dir).sort()).toEqual(['love-story', 'ny-trip']);
  });

  it('returns subdirs containing only story.json', () => {
    mkdirSync(join(dir, 'fresh'));
    writeFileSync(join(dir, 'fresh', 'story.json'), '{}');
    expect(listStories(dir)).toEqual(['fresh']);
  });

  it('skips dirs without memories or story', () => {
    mkdirSync(join(dir, 'empty'));
    mkdirSync(join(dir, 'photos-only'));
    mkdirSync(join(dir, 'photos-only', 'photos'));
    expect(listStories(dir)).toEqual([]);
  });

  it('returns empty when dataRoot missing', () => {
    expect(listStories(join(dir, 'nope'))).toEqual([]);
  });
});

describe('loadConfig / saveConfig', () => {
  it('returns null when missing', () => {
    expect(loadConfig(join(dir, 'no.json'))).toBeNull();
  });

  it('round-trips slug and photoFolder', () => {
    const path = join(dir, 'triage.config.json');
    saveConfig(path, { slug: 'love-story', photoFolder: '/some/folder' });
    expect(loadConfig(path)).toEqual({ slug: 'love-story', photoFolder: '/some/folder' });
  });

  it('rejects malformed config', () => {
    const path = join(dir, 'triage.config.json');
    writeFileSync(path, '{"slug":"x"}');
    expect(loadConfig(path)).toBeNull();
  });
});

describe('scaffoldStory', () => {
  it('creates memories.json and story.json under data/<slug>/', () => {
    scaffoldStory(dir, 'our-story');
    expect(existsSync(join(dir, 'our-story', 'memories.json'))).toBe(true);
    expect(existsSync(join(dir, 'our-story', 'story.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'our-story', 'memories.json'), 'utf-8'))).toEqual([]);
    const story = JSON.parse(readFileSync(join(dir, 'our-story', 'story.json'), 'utf-8'));
    expect(story.app?.title).toBe('Our Story');
    expect(typeof story.anchor?.lat).toBe('number');
  });

  it('refuses to overwrite an existing story dir', () => {
    mkdirSync(join(dir, 'taken'));
    writeFileSync(join(dir, 'taken', 'story.json'), '{}');
    expect(() => scaffoldStory(dir, 'taken')).toThrow(/exists/i);
  });

  it('rejects unsafe slugs', () => {
    expect(() => scaffoldStory(dir, '../escape')).toThrow();
    expect(() => scaffoldStory(dir, 'has space')).toThrow();
    expect(() => scaffoldStory(dir, '')).toThrow();
  });
});
