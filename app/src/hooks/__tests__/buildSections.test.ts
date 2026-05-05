import { describe, it, expect } from 'vitest';
import { buildSections } from '../useScrollTimeline';
import type { Memory } from '../../types/memory';

function mem(id: string, type: Memory['type'] = 'date'): Memory {
  return {
    id,
    date: id,
    type,
    title: id,
    caption: '',
    location: { lat: 0, lng: 0, name: '' },
    photos: [],
    music: null,
    weather: null,
    videos: [],
    tags: [],
  };
}

describe('buildSections — closing-overview scroll lock', () => {
  // The closing overview is intended as the final scrollable position: once
  // the user reaches it, scrolling further must do nothing. The lock is the
  // natural page bottom — so closing-overview must be the LAST section.
  it('places closing-overview as the very last section', () => {
    const sections = buildSections([mem('a'), mem('b'), mem('c')]);
    const last = sections[sections.length - 1];
    expect(last.id).toBe('section-closing-overview');
    expect(last.transitionType).toBe('closing-overview');
    expect(last.type).toBe('hold');
  });

  it('has no scroll sections after closing-overview', () => {
    const sections = buildSections([mem('a'), mem('b')]);
    const overviewIdx = sections.findIndex((s) => s.id === 'section-closing-overview');
    expect(overviewIdx).toBeGreaterThanOrEqual(0);
    expect(overviewIdx).toBe(sections.length - 1);
  });

  it('still includes the transition section that brings us into closing-overview', () => {
    const sections = buildSections([mem('a')]);
    const transitionIdx = sections.findIndex((s) => s.id === 'section-transition-closing');
    const overviewIdx = sections.findIndex((s) => s.id === 'section-closing-overview');
    expect(transitionIdx).toBeGreaterThanOrEqual(0);
    expect(overviewIdx).toBe(transitionIdx + 1);
  });
});
