import type { WeatherIcon } from '../types/memory';

const EMOJI: Record<WeatherIcon, string> = {
  sun: '☀️',
  'cloud-sun': '⛅',
  cloud: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  'rain-heavy': '⛈️',
  snow: '❄️',
  storm: '⛈️',
};

export function weatherEmoji(icon: WeatherIcon): string {
  return EMOJI[icon];
}
