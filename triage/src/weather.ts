import type { Weather } from '@meridian/schema';
import { wmoToIcon } from './wmo';

interface Deps { fetch?: typeof fetch; }

export async function fetchWeather(
  lat: number, lng: number, date: string, deps: Deps = {},
): Promise<Weather | null> {
  const f = deps.fetch ?? fetch;
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=weather_code,temperature_2m_max&timezone=auto`;
  const res = await f(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as {
    daily?: { time: string[]; weather_code: number[]; temperature_2m_max: (number | null)[] };
  };
  const code = data.daily?.weather_code?.[0];
  const temp = data.daily?.temperature_2m_max?.[0];
  if (code == null || temp == null) return null;
  return { icon: wmoToIcon(code), tempC: Math.round(temp) };
}
