import type { WeatherIcon } from '../types/memory';
import { story } from '../data/story';

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

export function formatTemperature(tempC: number): string {
  if (story.app.temperatureUnit === 'fahrenheit') {
    return `${Math.round(tempC * 9 / 5 + 32)}°F`;
  }
  return `${tempC}°`;
}
