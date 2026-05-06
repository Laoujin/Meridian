# Marketing visuals — Midjourney prompts

Three prompts for the marketing site, shipped as stubs and meant to be replaced with Midjourney renders. They share the same shared style suffix as `data/demo/MIDJOURNEY.md` so the whole project reads as one visual family.

## Shared style suffix

```
watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

## Per-asset prompts

### `hero.jpg` — full-bleed hero background

Wide cinematic banner sitting under the hero copy. Watercolour with low contrast so headline text overlays cleanly.

```
A wide panoramic dreamy travel scene — winding coastal road, distant mountains, scattered
warm lights of a small harbour town, faintly drawn route line tracing across the landscape,
late afternoon golden hour, evocative of memory and journey, atmospheric haze
· [shared style suffix] --ar 16:9
```

Save as **`marketing/hero.jpg`**, target 1920×1080, web-optimized JPG ~150–250 KB.

### `og.jpg` — Open Graph / Twitter card image

Used in link previews on Slack, Twitter, Discord etc. Square-ish 1.91:1.

```
Centred composition: a soft watercolour map of a coastline with a hand-painted route line
threading between four warm-glow markers, postcard-feel, slight paper grain edges, decorative
without text, balanced negative space for overlay typography
```

Save as **`marketing/og.jpg`**, target 1200×630, web-optimized JPG ~150 KB.

### `favicon.png` — browser tab icon

Tiny but legible at 16×16. Render at 512×512, browsers downscale.

```
Minimalist hand-painted watercolour mark — a stylised compass meridian (single vertical arc
crossed by a horizon line) in dusty terracotta on a warm cream background, small painted
dot at the apex, balanced inside a square, square framing · [shared style suffix] --ar 1:1
```

Save as **`marketing/favicon.png`**, 512×512, transparent or cream background.

## After saving

```bash
# Re-run the structure test — references unchanged, files updated:
cd marketing && bun test
# Open the page and visually check the hero crop:
python3 -m http.server 8080
```
