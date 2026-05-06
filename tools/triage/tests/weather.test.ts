import { describe, it, expect } from 'bun:test';
import { fetchWeather } from '../src/weather';

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('fetchWeather', () => {
  it('returns icon + tempC', async () => {
    const f = ((_u: string) => ok({
      daily: { time: ['2026-05-06'], weather_code: [0], temperature_2m_max: [21.7] },
    })) as unknown as typeof fetch;
    expect(await fetchWeather(50.85, 4.35, '2026-05-06', { fetch: f })).toEqual({ icon: 'sun', tempC: 22 });
  });

  it('returns null when daily missing', async () => {
    const f = ((_u: string) => ok({})) as unknown as typeof fetch;
    expect(await fetchWeather(0, 0, '2026-01-01', { fetch: f })).toBeNull();
  });

  it('throws on HTTP error', async () => {
    const f = ((_u: string) => Promise.resolve(new Response('boom', { status: 500 }))) as unknown as typeof fetch;
    await expect(fetchWeather(0, 0, '2026-01-01', { fetch: f })).rejects.toThrow(/HTTP 500/);
  });

  it('builds correct URL', async () => {
    let captured = '';
    const f = ((u: string) => { captured = u; return ok({ daily: { time: [''], weather_code: [3], temperature_2m_max: [10] } }); }) as unknown as typeof fetch;
    await fetchWeather(50.85, 4.35, '2026-05-06', { fetch: f });
    expect(captured).toContain('latitude=50.85');
    expect(captured).toContain('longitude=4.35');
    expect(captured).toContain('start_date=2026-05-06');
    expect(captured).toContain('end_date=2026-05-06');
  });
});
