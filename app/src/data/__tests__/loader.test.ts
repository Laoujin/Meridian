import { describe, it, expect } from 'vitest';
import { getCityLabel } from '../loader';

describe('getCityLabel', () => {
  it('returns empty string for undefined/empty', () => {
    expect(getCityLabel(undefined)).toBe('');
    expect(getCityLabel('')).toBe('');
  });

  it('returns a single-segment name as-is', () => {
    expect(getCityLabel('Leuven')).toBe('Leuven');
  });

  it('takes the last segment for street + city', () => {
    expect(getCityLabel('Alfons Smetsplein 3A, Leuven')).toBe('Leuven');
  });

  it('strips a numeric postcode from the city segment', () => {
    expect(getCityLabel('Gordunakaai 91, 9000 Gent')).toBe('Gent');
    expect(getCityLabel('Rue du Bailli 38, 1050 Ixelles')).toBe('Ixelles');
  });

  it('strips a Dutch-style postcode with letters', () => {
    expect(getCityLabel('Ahoyweg 10, 3084 BD Rotterdam, Netherlands')).toBe('Rotterdam');
  });

  it('prefers the city segment over a country tail', () => {
    expect(getCityLabel('82 Bd de Clichy, 75018 Paris, France')).toBe('Paris');
  });
});
