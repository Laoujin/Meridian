import { describe, it, expect } from 'bun:test';
import { wmoToIcon } from '../src/wmo';

describe('wmoToIcon', () => {
  it('maps clear sky (0) to sun', () => expect(wmoToIcon(0)).toBe('sun'));
  it('maps partly cloudy (1, 2) to cloud-sun', () => {
    expect(wmoToIcon(1)).toBe('cloud-sun');
    expect(wmoToIcon(2)).toBe('cloud-sun');
  });
  it('maps fog (45, 48) to fog', () => {
    expect(wmoToIcon(45)).toBe('fog');
    expect(wmoToIcon(48)).toBe('fog');
  });
  it('maps drizzle codes to drizzle', () => {
    for (const c of [51, 53, 55, 56, 57]) expect(wmoToIcon(c)).toBe('drizzle');
  });
  it('maps heavy rain (65, 67, 82) to rain-heavy', () => {
    for (const c of [65, 67, 82]) expect(wmoToIcon(c)).toBe('rain-heavy');
  });
  it('maps snow codes to snow', () => {
    for (const c of [71, 73, 75, 77, 85, 86]) expect(wmoToIcon(c)).toBe('snow');
  });
  it('maps storm (95, 96, 99) to storm', () => {
    for (const c of [95, 96, 99]) expect(wmoToIcon(c)).toBe('storm');
  });
  it('falls back to cloud for unknown codes', () => expect(wmoToIcon(999)).toBe('cloud'));
});
