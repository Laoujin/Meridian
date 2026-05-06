# Claude A — Sanitize, rebrand, configurability

**Status:** Spec drafted 2026-05-06. Awaiting review before implementation.
**Lane:** Critical path. Owns the contracts B and C will reference.

## Project context

Meridian is a scroll-driven memory timeline app (React + Vite + TS, maplibre-gl). It launched 2026-05-06 as a personal birthday gift and is now being open-sourced. Three Claude agents are running in parallel:

- **Claude A (this session)** — this brief.
- **Claude B** — `meridian-triage` CLI: photos folder → `Memory[]` JSON. Spec at `docs/superpowers/specs/2026-05-06-claude-b-triage-cli.md`.
- **Claude C** — fake NY-trip demo content + marketing landing page. Spec at `docs/superpowers/specs/2026-05-06-claude-c-demo-marketing.md`.

Locked decisions (from brainstorm):

| #  | Decision                | Choice                                                                  |
|----|-------------------------|-------------------------------------------------------------------------|
| —  | Rebrand                 | `Meridian` (existing name; origin already `Laoujin/Meridian`)           |
| —  | License                 | MIT                                                                     |
| —  | Scope                   | Full (lanes A + B + C all ship)                                         |
| A1 | i18n in v1              | EN-only, but i18n machinery wired so forks add locales easily           |
| A2 | Config format           | `meridian.config.ts` (typed, IDE autocomplete, runtime import)          |
| A3 | Videos / thumbs         | See "Thumbs + videos" section below — investigated, not a major item    |

## Goal

Convert the repo into a generic OSS template that:

1. A stranger can clone, run, and see Claude C's NY demo immediately.
2. A user with their own photos can fork, edit `meridian.config.ts`, drop `Memory[]` JSON in `data/`, and have a personalized timeline.
3. Maintains a clean, MIT-licensed public face: no personal data, no copyrighted media, no recipient names baked into components.

## Inventory: what's actually personal

Already private (gitignored — no work needed):

- `app/public/photos/` — recipient's photos
- `app/public/music/` — copyrighted audio tracks
- `app/public/videos/` — recipient's videos
- `working/` — staging area including pre-import images

Tracked and personal (must be addressed):

- `data/memories-2024.json`, `memories-2025.json`, `memories-2026.json` — full memory log of the relationship, names, addresses
- Hardcoded English copy in components: `Welcome.tsx` ("Happy Birthday!"), `GiftReveal.tsx` ("A Present?"), likely others (`OpeningCard.tsx`, `ClosingSequence.tsx` to audit)
- Hardcoded geography: `HERENT` and `GENT` constants in `OpeningArc.tsx`; `DEFAULT_LOCATION` in `data/loader.ts`
- Hardcoded data file imports: `loader.ts` imports `memories-2024.json`, `memories-2025.json`, `memories-2026.json` directly

Strip work happens in two phases:

1. **Pre-strip:** user copies `data/memories-*.json` to private archive (this is a one-shot manual step the user does; Claude A waits for confirmation).
2. **Strip:** Claude A removes those files from the tracked tree and replaces with the empty/demo equivalent.

## Configuration design

New file at repo root: `meridian.config.ts`. Tracked in git, ships with Claude C's NY demo values so a clone works out of the box. User edits to personalize.

```ts
export interface MeridianConfig {
  app: {
    title: string;             // shown in <title>, hero
    description?: string;      // <meta description>
    faviconSet: 'warm' | 'cool' | 'mono';
  };
  home: {
    lat: number;
    lng: number;
    label: string;             // shown on map for the home pin
  };
  opening: {
    arcOrigin: { lat: number; lng: number; label: string };
    welcomeTitle: string;      // replaces "Happy Birthday!"
    welcomeSubtitle?: string;  // replaces the joke line
    heroImage?: string;        // path under public/ or omitted to use default
  };
  closing: {
    giftReveal: boolean;       // shows the 🎁 box modal
    giftRevealText?: string;   // replaces "A Present?"
  };
  story: {
    names: { author: string; recipient: string };  // available to copy/i18n
  };
  i18n: {
    defaultLocale: string;             // 'en'
    supportedLocales: string[];        // ['en']  forks extend
  };
  data: {
    glob: string;              // 'data/memories-*.json' default
  };
}
```

Trimmed deliberately — every field replaces a hardcoded value. Anything not in this interface is YAGNI for v1.

## i18n approach

- Library: `react-i18next` (de facto standard, tree-shakable, Vite-friendly).
- Translation files at `app/src/i18n/locales/{locale}/translation.json`.
- Sweep components for English literals, replace with `t('namespace.key')` calls.
- Default locale `en`. Ship only `en/translation.json`. Forks add locales.
- `meridian.config.ts` exposes `i18n.defaultLocale` and `supportedLocales` for runtime selection (e.g. via URL param).
- Document "How to add a locale" in `CONTRIBUTING.md` (3 steps: copy translation.json, translate, add to `supportedLocales`).

## Theme / favicon presets

Three presets at `app/src/themes/{warm,cool,mono}/`. Each preset is:

- `favicon.svg` — preset's icon
- `tokens.css` — CSS custom properties (accent color, neutral palette)
- `theme.ts` — exports a small typed object the app can read

Selected via `app.faviconSet` in config. Switching is a config edit + reload (no runtime theme switcher in v1).

Visual direction (suggested, not load-bearing):

| Preset | Vibe                          | Accent           |
|--------|-------------------------------|------------------|
| warm   | Default; pinks + cream        | hot coral        |
| cool   | Travel/ blues + greys         | deep ocean       |
| mono   | Editorial; black + off-white  | charcoal         |

Claude C's marketing site can also reference these tokens.

## Thumbs + videos

**Thumbs:** ship `scripts/generate-thumbs.ts` using `sharp`. Reads `app/public/photos/full/*.{jpg,jpeg,png}`, emits ~480px-wide JPEGs to `app/public/photos/thumb/`. Wired as `bun run thumbs`. Documented in README. Existing fallback in `MediaStack.tsx` already handles missing thumbs gracefully, so this is an optimization not a bug.

**Videos:** standardize the path convention. App expects `videos: ['filename.mp4']` in JSON to resolve at `/videos/filename.mp4`. Currently empty `app/public/videos/` directory. Document the convention in CONTRACTS.md. No code changes needed; `MediaStack.tsx` already loads from `/videos/`.

## Repo layout target

```
meridian/
  app/                          # the React app (structure unchanged)
    src/
      i18n/                     # NEW: locales/, init.ts
      themes/warm/{cool,mono}/  # NEW
      ...existing
  data/
    demo/                       # Claude C's territory
    memories-template.json      # NEW: empty Memory[] array
    (memories-{2024,2025,2026}.json removed after user archives privately)
  tools/triage/                 # Claude B's territory
  marketing/                    # Claude C's territory
  scripts/
    generate-thumbs.ts          # NEW
    (existing scripts retained)
  docs/
    oss/
      CONTRACTS.md              # NEW: schema + config + repo layout authority
    superpowers/specs/          # these spec docs
    map-scroll-behavior.md      # existing
    open-source-brainstorm.md   # existing
  meridian.config.ts            # NEW (tracked, ships with Claude C demo values)
  LICENSE                       # NEW (MIT)
  CONTRIBUTING.md               # NEW
  README.md                     # REWRITE for OSS audience
```

## Deliverables checklist

1. `docs/oss/CONTRACTS.md` — single doc; describes `Memory` schema, `MeridianConfig` shape, repo layout, locale layout, theming layout. (Published first as a flag for B and C.)
2. `meridian.config.ts` at repo root — implements the interface above, populated with Claude C's NY demo values.
3. Refactor `app/src/data/loader.ts`:
   - Remove hardcoded `memories-{year}.json` imports → glob via Vite's `import.meta.glob`.
   - Remove hardcoded `DEFAULT_LOCATION` → read from `meridian.config.ts`.
4. Refactor `app/src/components/OpeningArc.tsx` — read `HERENT`/`GENT` from config (`opening.arcOrigin`, `home`).
5. i18n: install `react-i18next` + `i18next`; create `app/src/i18n/init.ts`, `app/src/i18n/locales/en/translation.json`. Sweep components: `Welcome`, `GiftReveal`, `OpeningCard`, `ClosingSequence`, `OverviewDots`, any other component with literal English. Wire `t()` calls.
6. Themes: create `app/src/themes/{warm,cool,mono}/{favicon.svg, tokens.css, theme.ts}`. Active theme injected at app boot from config.
7. `scripts/generate-thumbs.ts` (sharp-based) + `bun run thumbs` script.
8. Strip tracked personal data: delete `data/memories-{2024,2025,2026}.json` after user confirms private archive complete. Add `data/memories-template.json` (empty array).
9. Top-level `LICENSE` (MIT, year 2026, copyright holder Wouter Van Schandevijl per git log).
10. `CONTRIBUTING.md` — fork workflow, how to add a locale, how to add a theme, how to use `meridian-triage`, code style.
11. New `README.md` — OSS-audience pitch, install, demo link (placeholder until Claude C ships marketing), `meridian.config.ts` example, link to `docs/oss/CONTRACTS.md`.

## Out of scope

- Anything inside `tools/triage/` (Claude B).
- Anything inside `data/demo/` or `marketing/` (Claude C).
- Translating to non-English locales (machinery only; ship EN only).
- A runtime theme switcher UI (config edit + reload is enough).
- Mobile-app polish; the app already deployed and is fine.
- The "private archive" task itself — that's a one-shot manual user action, not Claude A's work. Claude A will wait for "archived, go ahead" before destructive deletions.

## Acceptance criteria

- `bun run dev` works on a fresh clone with the bundled NY demo (assuming Claude C has shipped).
- Editing `meridian.config.ts` (e.g. changing `home`, `opening.arcOrigin`, `welcomeTitle`) takes effect on next dev reload.
- `app/src/data/loader.ts` no longer imports any specific memory JSON file by name.
- No hardcoded `'Happy Birthday'`, `'A Present?'`, `HERENT`, `GENT`, `'Gent'` etc. anywhere outside `meridian.config.ts` and translation JSON.
- Switching `app.faviconSet` to each of `warm`/`cool`/`mono` produces distinct visual results.
- `bun run thumbs` produces JPEGs in `app/public/photos/thumb/` matching files in `app/public/photos/full/`.
- All existing Vitest + Playwright tests still pass against the demo dataset.
- `docs/oss/CONTRACTS.md` describes everything Claude B and Claude C consume.
- `README.md` opens with what Meridian is, an install snippet, and a link to the live demo.

## Open questions for user (need answers before execution)

1. **Memory JSON files — replace or delete?** After private archive, do we (a) keep `data/memories-{year}.json` filenames but with empty arrays, or (b) delete those files entirely and ship only `data/demo/memories.json` + `data/memories-template.json`? Recommendation: **(b)** — cleaner break, no zombie files. Year-grouping is a personal-fork decision, not the default.
2. **Story / framing copy — config field or i18n only?** Things like "we met on Bumble" or any opening-card story copy. Two paths: (a) put strings in `meridian.config.ts` (typed but not translatable), (b) put them in the EN translation JSON (translatable but flat strings). Recommendation: **(b)** — translation files already exist for forks; keeps config focused on structural choices, not copy.
3. **History scrub?** Existing repo at `Laoujin/Meridian` has full git history including data file commits with personal info. Options: (a) leave history as-is (privacy hole, but devs accept this risk), (b) `git filter-repo` to scrub data files from history, (c) cut a new repo from clean tree with no history. Recommendation: **(b)** — preserves dev story without exposing personal data. Caveat: this is one-shot and irreversible; you decide.

## Definition of done

- All 11 deliverables above land.
- Three open questions resolved with user.
- B and C can build their lanes against `docs/oss/CONTRACTS.md`.
- Repo, when handed to a stranger, runs and shows the NY demo.

## Coordination notes

- **Order:** publish `CONTRACTS.md` first (within the first commit batch), then everything else. B and C are reading `app/src/types/memory.ts` directly, so they're not blocked, but CONTRACTS.md prevents drift.
- **Schema discipline:** if any field on `Memory` needs to change, broadcast it (update CONTRACTS.md and notify B and C). Default is: don't change the schema; what's there is enough.
- **Don't touch:** `tools/triage/`, `data/demo/`, `marketing/`, the existing `data/memories-*.json` until user confirms archive (then delete those last).
