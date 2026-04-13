import type { Memory } from '../types/memory';
import memories2024 from '../../../data/memories-2024.json';
import memories2025 from '../../../data/memories-2025.json';
import memories2026 from '../../../data/memories-2026.json';

// Default location for entries without coordinates (home in Gent)
const DEFAULT_LOCATION = { lat: 51.0597, lng: 3.7527, name: 'Gent' };

export function loadMemories(): Memory[] {
  const all = [
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

/**
 * Extract a short city label from a free-form location name.
 * Takes the last comma-separated segment (or second-to-last if a country tail exists),
 * stripping leading postcodes like "9000 Gent" → "Gent" or "3084 BD Rotterdam" → "Rotterdam".
 */
export function getCityLabel(name: string | undefined): string {
  if (!name) return '';
  const parts = name.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  const candidate = parts.length >= 3 ? parts[parts.length - 2] : parts[parts.length - 1];
  return candidate.replace(/^\d+\s*[A-Z]{0,3}\s+/, '');
}

export function getScrollHeight(memory: Memory): number {
  // Return relative scroll height multiplier based on type
  if (memory.type === 'trip' && memory.days) {
    return 1 + memory.days.length * 0.8;
  }
  if (memory.type === 'milestone') {
    return 1.2;
  }
  return 1;
}
