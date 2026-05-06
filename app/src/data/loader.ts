import type { Memory } from '../types/memory';
import memories2024 from '../../../data/memories-2024.json';
import memories2025 from '../../../data/memories-2025.json';
import memories2026 from '../../../data/memories-2026.json';

// Default location for entries without coordinates (home in Gent)
const DEFAULT_LOCATION = { lat: 51.0597, lng: 3.7527, name: 'Gent' };

export function loadMemories(): Memory[] {
  // E2E fixture override: Playwright addInitScript can set this before nav.
  const fixture = (globalThis as { __FIXTURE_MEMORIES?: Memory[] }).__FIXTURE_MEMORIES;
  const all = fixture
    ? [...fixture]
    : [
        ...(memories2024 as Memory[]),
        ...(memories2025 as Memory[]),
        ...(memories2026 as Memory[]),
      ];

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
