import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(import.meta.dir, "..", "index.html"), "utf-8");
const css = readFileSync(join(import.meta.dir, "..", "styles.css"), "utf-8");

describe("marketing/index.html structure", () => {
  test("declares HTML5 doctype and viewport meta", () => {
    expect(html.toLowerCase()).toContain("<!doctype html>");
    expect(html).toMatch(/<meta\s+name="viewport"/i);
  });

  test("references stylesheet", () => {
    expect(html).toMatch(/href="styles\.css"/);
  });

  test("contains hero with Meridian title and hero image", () => {
    expect(html).toMatch(/<section[^>]*id="hero"/i);
    expect(html).toMatch(/Meridian/);
    expect(html).toMatch(/<img[^>]+src="hero\.jpg"/);
  });

  test("declares Open Graph + Twitter card meta with og.jpg", () => {
    expect(html).toMatch(/<meta\s+property="og:title"/i);
    expect(html).toMatch(/<meta\s+property="og:description"/i);
    expect(html).toMatch(/<meta\s+property="og:image"[^>]+content="[^"]*og\.jpg"/i);
    expect(html).toMatch(/<meta\s+name="twitter:card"/i);
  });

  test("references a favicon", () => {
    expect(html).toMatch(/<link[^>]+rel="icon"[^>]+href="favicon\.png"/i);
  });

  test("contains 'what is this' section", () => {
    expect(html).toMatch(/<section[^>]*id="what"/i);
  });

  test("contains a 3-step 'how it works' section", () => {
    expect(html).toMatch(/<section[^>]*id="how"/i);
    expect(html).toMatch(/meridian-triage/);
  });

  test("contains a live-demo link", () => {
    expect(html).toMatch(/<section[^>]*id="demo"/i);
  });

  test("contains an install snippet with bun install + bun run dev", () => {
    expect(html).toMatch(/<section[^>]*id="install"/i);
    expect(html).toMatch(/bun\s+install/);
    expect(html).toMatch(/bun\s+run\s+dev/);
  });

  test("contains a footer with GitHub link and MIT license mention", () => {
    expect(html).toMatch(/<footer/i);
    expect(html).toMatch(/github\.com/i);
    expect(html).toMatch(/MIT/);
  });
});

describe("marketing/styles.css palette", () => {
  test("uses Meridian peach accent #e8836b", () => {
    expect(css.toLowerCase()).toContain("#e8836b");
  });

  test("loads Caveat or Inter web font", () => {
    expect(css).toMatch(/Caveat|Inter/);
  });

  test("has at least one mobile media query", () => {
    expect(css).toMatch(/@media[^{]*max-width/);
  });
});
