import { describe, it, expect } from 'vitest';
import { haversineDistance, interpolateLine, sliceLine, generateArc } from '../geo';

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    expect(haversineDistance([3.75, 51.05], [3.75, 51.05])).toBe(0);
  });

  it('calculates ~60km between two nearby points', () => {
    const d = haversineDistance([3.7527, 51.0597], [4.6717, 50.8985]);
    expect(d).toBeGreaterThan(55);
    expect(d).toBeLessThan(70);
  });

  it('calculates ~260km between distant points', () => {
    const d = haversineDistance([3.7527, 51.0597], [2.3522, 48.8566]);
    expect(d).toBeGreaterThan(240);
    expect(d).toBeLessThan(280);
  });
});

describe('interpolateLine', () => {
  it('returns start point at progress 0', () => {
    const result = interpolateLine([0, 0], [10, 10], 0);
    expect(result).toEqual([0, 0]);
  });

  it('returns end point at progress 1', () => {
    const result = interpolateLine([0, 0], [10, 10], 1);
    expect(result).toEqual([10, 10]);
  });

  it('returns midpoint at progress 0.5', () => {
    const result = interpolateLine([0, 0], [10, 10], 0.5);
    expect(result[0]).toBeCloseTo(5);
    expect(result[1]).toBeCloseTo(5);
  });
});

describe('generateArc', () => {
  it('returns correct number of segments', () => {
    const arc = generateArc([0, 0], [10, 10], 20);
    expect(arc).toHaveLength(21);
  });

  it('starts at start point', () => {
    const arc = generateArc([3, 50], [4, 51], 10);
    expect(arc[0][0]).toBeCloseTo(3);
    expect(arc[0][1]).toBeCloseTo(50);
  });

  it('ends at end point', () => {
    const arc = generateArc([3, 50], [4, 51], 10);
    const last = arc[arc.length - 1];
    expect(last[0]).toBeCloseTo(4);
    expect(last[1]).toBeCloseTo(51);
  });

  it('bows upward at midpoint', () => {
    const arc = generateArc([0, 0], [10, 0], 10, 0.15);
    const mid = arc[5];
    expect(mid[1]).toBeGreaterThan(0);
  });

  it('returns single point when start equals end', () => {
    const arc = generateArc([3.75, 51.05], [3.75, 51.05], 50, 0.15);
    expect(arc).toHaveLength(1);
    expect(arc[0]).toEqual([3.75, 51.05]);
  });
});

describe('sliceLine', () => {
  it('returns empty array at progress 0', () => {
    const coords: [number, number][] = [[0, 0], [5, 5], [10, 10]];
    expect(sliceLine(coords, 0)).toEqual([[0, 0]]);
  });

  it('returns full line at progress 1', () => {
    const coords: [number, number][] = [[0, 0], [5, 5], [10, 10]];
    expect(sliceLine(coords, 1)).toEqual(coords);
  });

  it('returns partial line at progress 0.5', () => {
    const coords: [number, number][] = [[0, 0], [10, 0]];
    const result = sliceLine(coords, 0.5);
    expect(result).toHaveLength(2);
    expect(result[1][0]).toBeCloseTo(5);
  });
});
