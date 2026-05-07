import { describe, it, expect } from 'bun:test';
import { createGeocoder } from '../src/geocode';

const ok = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('forward', () => {
  it('returns lat/lng from Nominatim search', async () => {
    const f = ((_u: string) => ok([{ lat: '48.8584', lon: '2.2945' }])) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    expect(await g.forward('Eiffel Tower')).toEqual({ lat: 48.8584, lng: 2.2945 });
  });

  it('returns null when no results', async () => {
    const f = ((_u: string) => ok([])) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    expect(await g.forward('Atlantis')).toBeNull();
  });

  it('caches repeat queries (one fetch call)', async () => {
    let calls = 0;
    const f = ((_u: string) => { calls++; return ok([{ lat: '1', lon: '2' }]); }) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    await g.forward('X');
    await g.forward('X');
    expect(calls).toBe(1);
  });

  it('sends User-Agent header', async () => {
    let captured: Record<string, string> | undefined;
    const f = ((_u: string, init?: { headers?: Record<string, string> }) => { captured = init?.headers; return ok([]); }) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    await g.forward('X');
    expect(captured?.['User-Agent']).toContain('meridian-triage');
  });
});

describe('reverse', () => {
  it('returns name and city from address details', async () => {
    const f = ((_u: string) => ok({
      display_name: 'Brussels, Belgium',
      address: { city: 'Brussels', country: 'Belgium' },
    })) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    expect(await g.reverse(50.85, 4.35)).toEqual({ name: 'Brussels, Belgium', city: 'Brussels' });
  });

  it('falls back to town when city is missing', async () => {
    const f = ((_u: string) => ok({
      display_name: 'Bruges, Belgium',
      address: { town: 'Bruges' },
    })) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    expect((await g.reverse(0, 0))?.city).toBe('Bruges');
  });

  it('returns null city when no locality keys present', async () => {
    const f = ((_u: string) => ok({
      display_name: 'Somewhere',
      address: { country: 'Belgium' },
    })) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    expect(await g.reverse(0, 0)).toEqual({ name: 'Somewhere', city: null });
  });

  it('returns null when no display_name', async () => {
    const f = ((_u: string) => ok({})) as unknown as typeof fetch;
    const g = createGeocoder({ fetch: f, throttleMs: 0 });
    expect(await g.reverse(0, 0)).toBeNull();
  });
});
