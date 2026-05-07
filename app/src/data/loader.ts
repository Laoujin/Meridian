import type { Memory } from '../types/memory';
import memories from 'virtual:meridian-memories';
import { story } from './story';

// `virtual:meridian-memories` is synthesized in vite.config.ts: it reads
// every memories*.json under data/ (or under MERIDIAN_DATA when set) and
// exports the concatenated array. Sharding the dataset by year etc. just
// works without code changes.

const DEFAULT_LOCATION = { lat: story.anchor.lat, lng: story.anchor.lng, name: story.anchor.label };

export function loadMemories(): Memory[] {
  // E2E fixture override: Playwright addInitScript can set this before nav.
  const fixture = (globalThis as { __FIXTURE_MEMORIES?: Memory[] }).__FIXTURE_MEMORIES;
  const all = [...(fixture ?? (memories as Memory[]))];

  // Sort chronologically
  all.sort((a, b) => a.date.localeCompare(b.date));

  return all;
}

export function getLocation(memory: Memory): { lat: number; lng: number } {
  if (memory.location && memory.location.lat != null && memory.location.lng != null) {
    return { lat: memory.location.lat, lng: memory.location.lng };
  }
  return DEFAULT_LOCATION;
}

export function getScrollHeight(memory: Memory): number {
  if (memory.type === 'milestone') return 1.2;
  return 1;
}
