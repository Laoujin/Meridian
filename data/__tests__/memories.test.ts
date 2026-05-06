import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type TransportMode = "car" | "plane" | "train" | "metro" | "walking" | "boat" | "bike" | "bus";
type WeatherIcon = "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "rain-heavy" | "snow" | "storm";

interface Memory {
  id: string;
  date: string;
  type: "date" | "trip" | "milestone" | "special";
  title: string;
  caption: string;
  location: { lat: number | null; lng: number | null; name: string; text?: string } | null;
  photos: string[];
  music: { track: string; artist: string; title: string } | null;
  weather: { icon: WeatherIcon; tempC: number; note?: string } | null;
  videos: string[];
  tags: string[];
  emojis?: string[];
  transport?: TransportMode;
}

const ROOT = join(import.meta.dir, "..");
const PHOTO_DIR = join(ROOT, "..", "app", "public", "photos", "full");
const memories: Memory[] = JSON.parse(readFileSync(join(ROOT, "memories.json"), "utf-8"));

const VALID_TRANSPORT: TransportMode[] = ["car", "plane", "train", "metro", "walking", "boat", "bike", "bus"];
const VALID_ICONS: WeatherIcon[] = ["sun", "cloud-sun", "cloud", "fog", "drizzle", "rain", "rain-heavy", "snow", "storm"];

describe("data/memories.json", () => {
  test("contains exactly 10 entries", () => {
    expect(memories).toHaveLength(10);
  });

  test("entries are sorted chronologically", () => {
    const dates = memories.map((m) => m.date);
    expect([...dates].sort()).toEqual(dates);
  });

  test("each entry has populated required fields", () => {
    for (const m of memories) {
      expect(m.id, `${m.id}: id`).toBeTruthy();
      expect(m.date, `${m.id}: date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.title, `${m.id}: title`).toBeTruthy();
      expect(m.caption, `${m.id}: caption`).toBeTruthy();
      expect(m.location, `${m.id}: location`).not.toBeNull();
      expect(m.location!.lat, `${m.id}: lat`).toBeTypeOf("number");
      expect(m.location!.lng, `${m.id}: lng`).toBeTypeOf("number");
      expect(m.location!.name, `${m.id}: location.name`).toBeTruthy();
      expect(m.weather, `${m.id}: weather`).not.toBeNull();
      expect(VALID_ICONS).toContain(m.weather!.icon);
      expect(m.weather!.tempC, `${m.id}: tempC`).toBeTypeOf("number");
      expect(m.photos.length, `${m.id}: photos`).toBeGreaterThan(0);
      expect(m.transport, `${m.id}: transport`).toBeDefined();
      expect(VALID_TRANSPORT).toContain(m.transport!);
    }
  });

  test("each photo reference resolves to a file in app/public/photos/full/", () => {
    for (const m of memories) {
      for (const photo of m.photos) {
        const path = join(PHOTO_DIR, photo);
        expect(existsSync(path), `${m.id}: missing photo ${photo}`).toBe(true);
      }
    }
  });

  test("all coordinates are within NYC bounding box", () => {
    for (const m of memories) {
      const { lat, lng } = m.location!;
      expect(lat, `${m.id}: lat`).toBeGreaterThan(40.4);
      expect(lat, `${m.id}: lat`).toBeLessThan(41.0);
      expect(lng, `${m.id}: lng`).toBeGreaterThan(-74.3);
      expect(lng, `${m.id}: lng`).toBeLessThan(-73.6);
    }
  });
});
