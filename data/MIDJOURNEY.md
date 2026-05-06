# Default photos — Midjourney prompts

Ten prompts for the default dataset (the NY trip). Run each in Midjourney `/imagine`, save the chosen upscale as the listed filename in `app/public/photos/full/`.

## Shared style suffix

Append this to every prompt so the 10 images read as a cohesive series:

```
watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

`--ar 3:2` matches the existing `app/public/photos/full/` aspect (1152×768). `--style raw` keeps the model from over-stylizing.

## Per-image prompts

**1 · `01-jfk-arrival.jpg`**
```
Cinematic view through a passenger jet window descending toward New York at golden hour,
the wing slicing across pink and cream clouds, distant skyline silhouette below, condensation
on the inner glass · watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**2 · `02-hotel-checkin.jpg`**
```
A high Midtown Manhattan hotel-room window at dusk, sheer curtain half-drawn, warm interior
lamp light, a layered cityscape of brick rooftops, water towers, and the Empire State Building
faintly visible, an open suitcase suggested in the foreground (no figures) watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**3 · `03-first-night-dinner.jpg`**
```
A New York deli pastrami sandwich on crinkled butcher paper, mustard smear, pickle spear,
half-eaten, overhead three-quarter angle, warm yellow diner lighting, a coffee mug edge in
the corner watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**4 · `04-liberty-by-boat.jpg`**
```
The Statue of Liberty seen from the deck of a passing ferry, low angle through railing,
Hudson river spray catching pale light, soft Manhattan skyline far behind, gulls
suggested as loose marks watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**5 · `05-times-square.jpg`**
```
Times Square at twilight, towering billboards glowing in coral, teal and amber, reflections
on rain-wet asphalt, an empty intersection painted as soft impressionistic washes, no
figures, no readable lettering on the screens watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**6 · `06-central-park.jpg`**
```
Central Park's Bow Bridge arching over a still pond, autumn maples in dusty terracotta and
ochre, late afternoon golden light filtering through branches, reflections on the water,
empty park bench in the foreground watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**7 · `07-brooklyn-bridge.jpg`**
```
Walkway view across the Brooklyn Bridge looking toward Manhattan, gothic stone arches and
suspension cables in soft grey-blue, lower Manhattan skyline behind in pale wash, empty
boards underfoot, wide cinematic perspective watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**8 · `08-moma.jpg`**
```
A minimalist modern art gallery interior, polished pale floor, a single large swirling
post-impressionist canvas (Starry Night style — original interpretation, not a copy) on a
white wall, soft track lighting, a wooden bench centred (empty) watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**9 · `09-final-dinner.jpg`**
```
A candlelit corner restaurant table for two by a rain-streaked window, two wineglasses
catching warm light, soft blurred Greenwich Village street outside with passing headlights as
loose smudges, intimate evening mood, no figures watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

**10 · `10-wheels-up.jpg`**
```
An airport departure board glowing softly at early dawn, blurred destination text in pastel
washes (no readable words), a single suitcase silhouette in the foreground, large window
behind showing pre-dawn ramp lighting watercolour painting, loose brushwork, visible paper texture, soft pastel washes,
muted palette of dusty terracotta, sage green, soft slate blue, warm cream,
gentle bleeding edges, hand-painted illustration, no photorealism --ar 3:2 --style raw
--no people, faces, hands, text, signature, watermark, logos, photorealistic
```

## Constraints recap

- Landscape, **1152×768** (or close — `--ar 3:2`).
- **No human figures, faces, or hands** (enforced by `--no` clause; spot-check each upscale).
- Web-optimized JPG, target **200–400 KB**. After saving from Midjourney: `convert in.png -quality 82 out.jpg`.
- Filenames must match `photos[]` references in `memories.json` exactly.
