import { describe, it, expect } from 'vitest';
import { getTransitionType, getSectionHeight, TRANSITION_HEIGHTS } from '../transitions';
import type { Memory } from '../../types/memory';

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'test', date: '2024-06-12', type: 'date', title: 'Test',
    caption: '', location: { lat: 51.05, lng: 3.75, name: 'Gent' },
    photos: [], coverPhoto: null, heroPhoto: null, music: null,
    weather: null, expandedText: '', expandedPhotos: [], videos: [], tags: [],
    ...overrides,
  };
}

describe('getTransitionType', () => {
  it('returns "standard" for different locations', () => {
    const from = makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } });
    const to = makeMemory({ location: { lat: 50.88, lng: 4.47, name: 'Zaventem' } });
    expect(getTransitionType(from, to)).toBe('standard');
  });

  it('returns "same-location" for same coordinates', () => {
    const from = makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } });
    const to = makeMemory({ location: { lat: 51.05, lng: 3.75, name: 'Gent' } });
    expect(getTransitionType(from, to)).toBe('same-location');
  });

  it('returns "to-milestone" when target is milestone', () => {
    const from = makeMemory();
    const to = makeMemory({ type: 'milestone', location: null });
    expect(getTransitionType(from, to)).toBe('to-milestone');
  });

  it('returns "from-milestone" when source is milestone', () => {
    const from = makeMemory({ type: 'milestone', location: null });
    const to = makeMemory();
    expect(getTransitionType(from, to)).toBe('from-milestone');
  });

  it('returns "opening" when from is null (opening → first memory)', () => {
    const to = makeMemory();
    expect(getTransitionType(null, to)).toBe('opening');
  });
});

describe('getSectionHeight', () => {
  it('returns standard height for different locations', () => {
    expect(getSectionHeight('standard')).toBe(TRANSITION_HEIGHTS.standard);
  });

  it('returns shorter height for same-location', () => {
    expect(getSectionHeight('same-location')).toBe(TRANSITION_HEIGHTS['same-location']);
    expect(getSectionHeight('same-location')).toBeLessThan(getSectionHeight('standard'));
  });

  it('returns milestone height for to-milestone', () => {
    expect(getSectionHeight('to-milestone')).toBe(TRANSITION_HEIGHTS['to-milestone']);
  });
});
