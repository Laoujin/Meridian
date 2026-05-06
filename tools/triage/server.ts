#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join, basename } from 'node:path';
import { listYears, readYear, writeYear } from './src/memories';
import { copyToPhotosFull } from './src/photo-copy';
import { readExif } from './src/exif';
import { createGeocoder } from './src/geocode';
import { fetchWeather } from './src/weather';
import type { Weather } from '@meridian/schema';

const SOURCE = process.argv[2];
if (!SOURCE || !existsSync(SOURCE)) {
  console.error('Usage: bun run server.ts <photo-folder>\n');
  console.error('  <photo-folder>: directory of JPEG/PNG/MP4/MOV files to triage.');
  console.error('  Output: data/memories-YYYY.json (year derived from photo dates).');
  console.error('  UI: http://localhost:5174');
  process.exit(1);
}

const ROOT = join(import.meta.dir, '..', '..');
const DATA_DIR = join(ROOT, 'data');
const PHOTOS_DEST = join(ROOT, 'app', 'public', 'photos', 'full');
const TRASH = join(SOURCE, '.trash');
const HTML = join(import.meta.dir, 'public', 'index.html');
const PORT = 5174;
const MEDIA_RX = /\.(jpe?g|png|mp4|mov)$/i;

mkdirSync(PHOTOS_DEST, { recursive: true });
mkdirSync(TRASH, { recursive: true });

const geocoder = createGeocoder();

const safeName = (n: unknown): n is string =>
  typeof n === 'string' && n.length > 0 && n.length < 256
  && !n.includes('/') && !n.includes('\\') && !n.includes('..');

function listSourceFiles(): string[] {
  return readdirSync(SOURCE).filter(n => MEDIA_RX.test(n)).sort();
}

async function loadAllMemories() {
  const years = await listYears(DATA_DIR);
  const memories: Record<string, unknown> = {};
  for (const y of years) memories[y] = await readYear(DATA_DIR, y);
  return { memories, years };
}

interface CopyResponse {
  ok: true;
  exif: { date: string | null; gps: { lat: number; lng: number } | null };
  geocoded?: { name: string };
  weather?: Weather;
  errors: { geocode?: string; weather?: string };
}

async function handleCopy(name: string): Promise<CopyResponse> {
  await copyToPhotosFull(SOURCE, name, PHOTOS_DEST);
  const exif = await readExif(join(SOURCE, name));
  const out: CopyResponse = {
    ok: true,
    exif: { date: exif.date ? exif.date.toISOString().slice(0, 10) : null, gps: exif.gps },
    errors: {},
  };
  if (exif.gps) {
    try {
      const name = await geocoder.reverse(exif.gps.lat, exif.gps.lng);
      if (name) out.geocoded = { name };
    } catch (e) { out.errors.geocode = String(e); }
    if (exif.date) {
      try {
        const w = await fetchWeather(exif.gps.lat, exif.gps.lng, out.exif.date!);
        if (w) out.weather = w;
      } catch (e) { out.errors.weather = String(e); }
    }
  }
  return out;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === '/' || p === '/index.html') return new Response(Bun.file(HTML));

    if (p === '/api/state') {
      const { memories, years } = await loadAllMemories();
      return Response.json({ memories, years, files: listSourceFiles() });
    }

    if (p === '/api/save' && req.method === 'POST') {
      const { year, memories } = await req.json() as { year: string; memories: unknown };
      if (!/^\d{4}$/.test(year)) return new Response('bad year', { status: 400 });
      await writeYear(DATA_DIR, year, memories as never);
      return Response.json({ ok: true });
    }

    if (p === '/api/copy' && req.method === 'POST') {
      const { name } = await req.json() as { name: string };
      if (!safeName(name)) return new Response('bad name', { status: 400 });
      try { return Response.json(await handleCopy(name)); }
      catch (e) { return new Response(String(e), { status: 500 }); }
    }

    if (p === '/api/trash' && req.method === 'POST') {
      const { name } = await req.json() as { name: string };
      if (!safeName(name)) return new Response('bad name', { status: 400 });
      const srcPath = join(SOURCE, name);
      if (!existsSync(srcPath)) return new Response('missing', { status: 404 });
      renameSync(srcPath, join(TRASH, name));
      return Response.json({ ok: true });
    }

    if (p === '/api/geocode' && req.method === 'POST') {
      const body = await req.json() as { lat?: number; lng?: number; address?: string };
      try {
        if (body.address) {
          const hit = await geocoder.forward(body.address);
          if (!hit) return Response.json({ error: 'no result' }, { status: 404 });
          const name = await geocoder.reverse(hit.lat, hit.lng);
          return Response.json({ lat: hit.lat, lng: hit.lng, name: name ?? body.address });
        }
        if (typeof body.lat === 'number' && typeof body.lng === 'number') {
          const name = await geocoder.reverse(body.lat, body.lng);
          if (!name) return Response.json({ error: 'no result' }, { status: 404 });
          return Response.json({ name });
        }
        return new Response('bad body', { status: 400 });
      } catch (e) { return Response.json({ error: String(e) }, { status: 500 }); }
    }

    if (p === '/api/weather' && req.method === 'POST') {
      const { lat, lng, date } = await req.json() as { lat: number; lng: number; date: string };
      try {
        const w = await fetchWeather(lat, lng, date);
        if (!w) return Response.json({ error: 'no data' }, { status: 404 });
        return Response.json(w);
      } catch (e) { return Response.json({ error: String(e) }, { status: 500 }); }
    }

    if (p === '/media') {
      const name = url.searchParams.get('name') || '';
      if (!safeName(name)) return new Response('bad', { status: 400 });
      const path = join(SOURCE, name);
      if (!existsSync(path)) return new Response('not found', { status: 404 });
      return new Response(Bun.file(path));
    }

    if (p === '/photo') {
      const name = url.searchParams.get('name') || '';
      if (!safeName(name)) return new Response('bad', { status: 400 });
      const path = join(PHOTOS_DEST, name);
      if (!existsSync(path)) return new Response('not found', { status: 404 });
      return new Response(Bun.file(path));
    }

    return new Response('not found', { status: 404 });
  },
});

console.log(`Triage UI: http://localhost:${PORT}`);
console.log(`  source: ${SOURCE}`);
console.log(`  trash:  ${TRASH}`);
console.log(`  photos copied to: ${PHOTOS_DEST}`);
