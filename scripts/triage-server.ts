#!/usr/bin/env bun
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DATA_DIR = join(ROOT, "data");
const TOSELECT = join(ROOT, "working", "demo-images", "toselect");
const TRASH = join(ROOT, "working", "demo-images", "trash");
const PHOTOS_DEST = join(ROOT, "app", "public", "photos", "full");
const HTML = join(import.meta.dir, "triage.html");

const YEARS = ["2024", "2025", "2026"] as const;
const MEDIA_RE = /\.(jpg|jpeg|png|mp4|mov)$/i;

mkdirSync(TRASH, { recursive: true });
mkdirSync(PHOTOS_DEST, { recursive: true });

const safeName = (n: unknown): n is string =>
  typeof n === "string" && n.length > 0 && n.length < 256 && !n.includes("/") && !n.includes("\\") && !n.includes("..");

const listMedia = () => readdirSync(TOSELECT).filter((f) => MEDIA_RE.test(f)).sort();

const PORT = 5174;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === "/" || p === "/index.html") return new Response(Bun.file(HTML));

    if (p === "/api/state") {
      const memories: Record<string, unknown> = {};
      for (const y of YEARS) memories[y] = JSON.parse(readFileSync(join(DATA_DIR, `memories-${y}.json`), "utf-8"));
      return Response.json({ memories, files: listMedia() });
    }

    if (p === "/api/save" && req.method === "POST") {
      const { year, memories } = (await req.json()) as { year: string; memories: unknown };
      if (!YEARS.includes(year as (typeof YEARS)[number])) return new Response("bad year", { status: 400 });
      writeFileSync(join(DATA_DIR, `memories-${year}.json`), JSON.stringify(memories, null, 2) + "\n");
      return Response.json({ ok: true });
    }

    if (p === "/api/copy" && req.method === "POST") {
      const { name } = (await req.json()) as { name: string };
      if (!safeName(name)) return new Response("bad name", { status: 400 });
      const src = join(TOSELECT, name);
      if (!existsSync(src)) return new Response("missing source", { status: 404 });
      const dest = join(PHOTOS_DEST, name);
      if (!existsSync(dest)) copyFileSync(src, dest);
      return Response.json({ ok: true });
    }

    if (p === "/api/trash" && req.method === "POST") {
      const { name } = (await req.json()) as { name: string };
      if (!safeName(name)) return new Response("bad name", { status: 400 });
      const src = join(TOSELECT, name);
      if (!existsSync(src)) return new Response("missing source", { status: 404 });
      renameSync(src, join(TRASH, name));
      return Response.json({ ok: true });
    }

    if (p.startsWith("/media/")) {
      const name = decodeURIComponent(p.slice("/media/".length));
      if (!safeName(name)) return new Response("bad name", { status: 400 });
      const path = join(TOSELECT, name);
      if (!existsSync(path)) return new Response("not found", { status: 404 });
      return new Response(Bun.file(path));
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`Triage server: http://localhost:${PORT}`);
console.log(`  toselect:  ${TOSELECT}`);
console.log(`  trash:     ${TRASH}`);
console.log(`  copies to: ${PHOTOS_DEST}`);
