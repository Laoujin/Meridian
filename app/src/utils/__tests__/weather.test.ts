import { describe, it, expect } from 'vitest';
import { weatherEmoji } from '../weather';
import type { WeatherIcon } from '../../types/memory';

describe('weatherEmoji', () => {
  it('returns a non-empty emoji for every icon', () => {
    const icons: WeatherIcon[] = [
      'sun',
      'cloud-sun',
      'cloud',
      'fog',
      'drizzle',
      'rain',
      'rain-heavy',
      'snow',
      'storm',
    ];
    for (const icon of icons) {
      expect(weatherEmoji(icon)).toMatch(/.+/);
    }
  });

  it('maps sun to a sun glyph', () => {
    expect(weatherEmoji('sun')).toBe('☀️');
  });

  it('maps rain to a rain cloud glyph', () => {
    expect(weatherEmoji('rain')).toBe('🌧️');
  });
});
