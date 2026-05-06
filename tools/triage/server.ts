#!/usr/bin/env bun
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const DATA_DIR = join(ROOT, "data");
const PHOTOS_DEST = join(ROOT, "app", "public", "photos", "full");
const HTML = join(import.meta.dir, "public", "index.html");

const SOURCES: Record<string, { dir: string; trash: string }> = {
  meridian: {
    dir: join(ROOT, "working", "meridian-images", "toselect"),
    trash: join(ROOT, "working", "meridian-images", "trash"),
  },
  wouter: {
    dir: join(ROOT, "working", "wouter-images"),
    trash: join(ROOT, "working", "wouter-images", "trash"),
  },
};

const YEARS = ["2024", "2025", "2026"] as const;
const MEDIA_RE = /\.(jpg|jpeg|png|mp4|mov)$/i;

mkdirSync(PHOTOS_DEST, { recursive: true });
for (const cfg of Object.values(SOURCES)) mkdirSync(cfg.trash, { recursive: true });

const safeName = (n: unknown): n is string =>
  typeof n === "string" && n.length > 0 && n.length < 256 && !n.includes("/") && !n.includes("\\") && !n.includes("..");

function listAll() {
  const out: { src: string; name: string }[] = [];
  for (const [src, cfg] of Object.entries(SOURCES)) {
    for (const name of readdirSync(cfg.dir)) {
      if (!MEDIA_RE.test(name)) continue;
      out.push({ src, name });
    }
  }
  return out;
}

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
      return Response.json({ memories, files: listAll(), sources: Object.keys(SOURCES) });
    }

    if (p === "/api/save" && req.method === "POST") {
      const { year, memories } = (await req.json()) as { year: string; memories: unknown };
      if (!YEARS.includes(year as (typeof YEARS)[number])) return new Response("bad year", { status: 400 });
      writeFileSync(join(DATA_DIR, `memories-${year}.json`), JSON.stringify(memories, null, 2) + "\n");
      return Response.json({ ok: true });
    }

    if (p === "/api/copy" && req.method === "POST") {
      const { src, name } = (await req.json()) as { src: string; name: string };
      const cfg = SOURCES[src];
      if (!cfg || !safeName(name)) return new Response("bad", { status: 400 });
      const srcPath = join(cfg.dir, name);
      if (!existsSync(srcPath)) return new Response("missing source", { status: 404 });
      const dest = join(PHOTOS_DEST, name);
      if (!existsSync(dest)) copyFileSync(srcPath, dest);
      return Response.json({ ok: true });
    }

    if (p === "/api/trash" && req.method === "POST") {
      const { src, name } = (await req.json()) as { src: string; name: string };
      const cfg = SOURCES[src];
      if (!cfg || !safeName(name)) return new Response("bad", { status: 400 });
      const srcPath = join(cfg.dir, name);
      if (!existsSync(srcPath)) return new Response("missing source", { status: 404 });
      renameSync(srcPath, join(cfg.trash, name));
      return Response.json({ ok: true });
    }

    if (p === "/media") {
      const src = url.searchParams.get("src") || "";
      const name = url.searchParams.get("name") || "";
      const cfg = SOURCES[src];
      if (!cfg || !safeName(name)) return new Response("bad", { status: 400 });
      const path = join(cfg.dir, name);
      if (!existsSync(path)) return new Response("not found", { status: 404 });
      return new Response(Bun.file(path));
    }

    if (p === "/photo") {
      const name = url.searchParams.get("name") || "";
      if (!safeName(name)) return new Response("bad", { status: 400 });
      const path = join(PHOTOS_DEST, name);
      if (!existsSync(path)) return new Response("not found", { status: 404 });
      return new Response(Bun.file(path));
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`Triage server: http://localhost:${PORT}`);
for (const [src, cfg] of Object.entries(SOURCES)) {
  console.log(`  source ${src}: ${cfg.dir}`);
  console.log(`         trash: ${cfg.trash}`);
}
console.log(`  copies to: ${PHOTOS_DEST}`);
