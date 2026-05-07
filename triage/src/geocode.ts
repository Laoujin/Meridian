interface Deps {
  fetch?: typeof fetch;
  throttleMs?: number;
}

const UA = 'meridian-triage/0.1 (https://github.com/Laoujin/meridian)';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface Geocoder {
  forward(addr: string): Promise<{ lat: number; lng: number } | null>;
  reverse(lat: number, lng: number): Promise<string | null>;
}

export function createGeocoder(deps: Deps = {}): Geocoder {
  const f = deps.fetch ?? fetch;
  const throttleMs = deps.throttleMs ?? 1100;
  const fwd = new Map<string, { lat: number; lng: number } | null>();
  const rev = new Map<string, string | null>();

  return {
    async forward(addr) {
      if (fwd.has(addr)) return fwd.get(addr)!;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`;
      try {
        const res = await f(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) { fwd.set(addr, null); return null; }
        const data = await res.json() as { lat: string; lon: string }[];
        const hit = data[0]
          ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
          : null;
        fwd.set(addr, hit);
        return hit;
      } finally {
        if (throttleMs) await sleep(throttleMs);
      }
    },
    async reverse(lat, lng) {
      const key = `${lat},${lng}`;
      if (rev.has(key)) return rev.get(key)!;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      try {
        const res = await f(url, { headers: { 'User-Agent': UA } });
        if (!res.ok) { rev.set(key, null); return null; }
        const data = await res.json() as { display_name?: string };
        const name = data.display_name ?? null;
        rev.set(key, name);
        return name;
      } finally {
        if (throttleMs) await sleep(throttleMs);
      }
    },
  };
}
