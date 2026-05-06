# Meridian — Marketing Site

Single-page landing for the Meridian repo. Plain HTML + CSS, no build step.

## Local preview

```bash
cd marketing
python3 -m http.server 8080
# or:  bun --bun x serve .
```

Open `http://localhost:8080`.

## Deploy via GitHub Pages

GitHub UI: **Settings → Pages → Source: Deploy from a branch → Branch: `main`, folder: `/marketing` → Save.**

The site goes live at `https://<user>.github.io/<repo>/`. Pushes to `main` redeploy automatically.

The folder is **fully self-contained** — `index.html`, `styles.css`, `hero.jpg`, `og.jpg`, `favicon.png`, `MIDJOURNEY.md`, `README.md`. No build step, no asset paths leaving the directory.

## Replacing the visuals

See [MIDJOURNEY.md](./MIDJOURNEY.md) for the three prompts (hero, OG image, favicon). Generated stubs ship by default; replace with Midjourney upscales when ready.

## TODO — Live demo deploy

Currently the **"Open the demo →"** button on the landing page points at the GitHub Pages URL above, where only the marketing site lives. Wiring up an actual live React-app demo at `/demo/` requires two upstream changes that sit in Claude A's lane:

1. **Loader rewrite** (`app/src/data/loader.ts`) — must read from `data/demo/memories.json` instead of the hardcoded year files. Claude A is already removing the personal-data files; this swap will land in the same change.
2. **Photo path fix** (`app/src/components/MediaStack.tsx`, `app/src/components/MediaViewer.tsx`) — change hardcoded `/photos/full/${filename}` to `${import.meta.env.BASE_URL}photos/full/${filename}` so a subpath deploy (e.g. `/<repo>/demo/`) resolves correctly.

Once both land, deploying the demo is roughly:

```yaml
# .github/workflows/deploy-pages.yml (sketch — write when unblocked)
- run: cp -r data/demo/photos/* app/public/photos/full/
- run: cd app && bun install && bun run build -- --base /<repo>/demo/
- run: mkdir -p _site && cp -r marketing/* _site/ && cp -r app/dist _site/demo
- uses: actions/deploy-pages@v4
  with: { path: _site }
```

Then change the GH Pages source from `/marketing` to "GitHub Actions" and update the demo button's `href` to `/demo/`.

## Tests

```bash
cd marketing
bun test
```

Validates required sections, asset references, and palette.
