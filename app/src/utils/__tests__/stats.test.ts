import { describe, it, expect } from 'vitest';
import { computeStats } from '../stats';
import type { Memory } from '../../types/memory';

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test', date: '2024-06-12', type: 'date', title: 'Test',
    caption: '', location: { lat: 51.05, lng: 3.75, name: 'Gent' },
    photos: [], coverPhoto: null, music: null,
    weather: null, expandedText: '', expandedPhotos: [], videos: [], tags: [],
    ...overrides,
  };
}

describe('computeStats', () => {
  it('counts memories by type', () => {
    const memories = [
      makeMemory({ type: 'date' }),
      makeMemory({ type: 'date' }),
      makeMemory({ type: 'trip' }),
      makeMemory({ type: 'milestone' }),
    ];
    const stats = computeStats(memories);
    expect(stats.dates).toBe(2);
    expect(stats.trips).toBe(1);
    expect(stats.milestones).toBe(1);
    expect(stats.total).toBe(4);
  });

  it('counts unique locations', () => {
    const memories = [
      makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } }),
      makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } }),
      makeMemory({ location: { lat: 50.88, lng: 4.47, name: 'Zaventem' } }),
    ];
    const stats = computeStats(memories);
    expect(stats.uniqueLocations).toBe(2);
  });

  it('counts total photos', () => {
    const memories = [
      makeMemory({ photos: ['a.jpg', 'b.jpg'] }),
      makeMemory({ photos: ['c.jpg'] }),
    ];
    const stats = computeStats(memories);
    expect(stats.totalPhotos).toBe(3);
  });
});
