import type { WeatherIcon } from '@meridian/schema';

export const WMO_ICON: Record<number, WeatherIcon> = {
  0: 'sun',
  1: 'cloud-sun', 2: 'cloud-sun',
  3: 'cloud',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain',
  65: 'rain-heavy',
  66: 'rain', 67: 'rain-heavy',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow',
  80: 'rain', 81: 'rain', 82: 'rain-heavy',
  85: 'snow', 86: 'snow',
  95: 'storm', 96: 'storm', 99: 'storm',
};

export function wmoToIcon(code: number): WeatherIcon {
  return WMO_ICON[code] ?? 'cloud';
}
