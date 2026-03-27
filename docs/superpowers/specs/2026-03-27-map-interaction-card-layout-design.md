# Map Interaction & Card Layout Design

## Overview

Replace the current passive scroll-through-cards layout with a scroll-driven storytelling experience. Scrolling triggers phased transitions between memories: card fades out, map travels with an animated line to the next location, new card fades in. The user scrubs through animations by scrolling — full bidirectional control.

## Scroll Structure

### DOM Layout

```
<TimelineStrip />                      fixed top
<CardOverlay>                          fixed, below timeline
  <OpeningCard /> | <MemoryCard /> | <ClosingSequence />
</CardOverlay>
<MapCanvas />                          fixed fullscreen background

<div class="scroll-track">            scrollable, invisible
  <section-opening />                  opening card hold
  <section-transition-0 />            opening → memory[0]
  <section-hold-0 />                  memory[0] displayed
  <section-transition-1 />            memory[0] → memory[1]
  <section-hold-1 />                  memory[1] displayed
  ...
  <section-transition-closing />       last memory → closing
  <section-closing-overview />         journey map
  <section-closing-stats />            statistics
  <section-closing-gift />             gift card
</div>
```

The scroll-track is the only scrollable element. Everything visual is `position: fixed`. Each memory gets two scroll sections:

- **Transition section** (~300vh): drives the animated travel between locations
- **Hold section** (~100vh): card is fully visible, user can read

### Section Height Variants

| Transition type | Section height | Reason |
|----------------|---------------|--------|
| Standard (different locations) | ~300vh | Full travel animation |
| Same location | ~50vh | Card crossfade only, no map travel |
| To/from milestone | ~100vh | No travel, dim/blur effect |
| Closing overview | ~200vh | Zoom out + country highlights + pins |
| Closing stats | ~150vh | Stats animate in sequentially |
| Closing gift | ~100vh | Final screen, scroll stops |

### Transition Phases

Within a standard transition section, scroll progress 0→1 maps to:

| Progress | Phase |
|----------|-------|
| 0.00–0.25 | Card fades out (opacity 1→0, translateY 0→-30px) |
| 0.25–0.75 | Travel line draws from A→B, transport icon moves along tip, map pans to frame both points |
| 0.75–1.00 | New card fades in (opacity 0→1, translateY 30px→0), location marker pulses |

Same-location transitions: just the card crossfade over the full 0→1 range, no map phase.

## Card Overlay

### Position & Styling

- `position: fixed`, top anchored ~40px below TimelineStrip
- Horizontally centered
- Same max-width/styling as current MemoryCard (340px, 90vw)
- Only one card rendered at a time
- Card opacity and transform are driven by the parent via GSAP, not self-animated

### Card Transitions

- **Fade out:** opacity 1→0, translateY 0→-30px (slides up and away)
- **Fade in:** opacity 0→1, translateY 30px→0 (slides in from below)
- Content swaps when the outgoing card is fully invisible (progress ~0.25)

## Travel Line

### Line Drawing

- Maplibre GeoJSON source with a `LineString` geometry
- Line grows proportionally to scroll progress within the travel phase (0.25–0.75)
- At progress 0.5 of the travel phase, the line is drawn halfway
- Scrolling backward retracts the line

### Line Style

- 2px solid stroke
- Coral color (`#e8836b`)
- Slight opacity fade on the tail end

### Straight vs Arc

- Distance A→B > 100km: great-circle arc (curved path)
- Distance A→B <= 100km: straight line

### Transport Icon

A Maplibre Marker at the current endpoint of the line.

| Transport mode | Icon |
|---------------|------|
| `car` | car emoji |
| `plane` | plane emoji |
| `train` | train emoji |
| `bus` | bus emoji |
| `boat` | sailboat emoji |
| `walk` | walking emoji |
| `bike` | bike emoji |
| No transport data | 12px coral dot |

- Icon rotates to face the direction of travel
- On scroll-back, icon moves backward along the line

### After Transition

The travel line fades out over the first 20% of the hold section, leaving only the pulsing location marker.

## Location Marker

- Maplibre Marker at the active memory's location
- 12px coral dot (`#e8836b`) core
- Pulsing ring animation: expands to ~30px and fades out, repeats 3 times, then settles to static
- Pulse triggers at progress 0.75 of the transition (when card fades in)
- Only the current location marker is shown — previous markers are removed

## Map Behavior

### During Transitions

- At progress 0.25 (start of travel phase), map pans/zooms to `fitBounds` showing both A and B with padding so the full line is always visible during drawing
- At progress 0.75–1.0 (card fade-in phase), map eases from the fitBounds view to centering on point B at the destination zoom level

### During Hold Sections

- Map is centered on the current location at the appropriate zoom:
  - Trips: zoom 6
  - Gent: zoom 13
  - Other locations: zoom 11
- Non-interactive (`interactive: false`) — scroll gesture drives everything

### Milestone Dimming

When transitioning to a milestone memory:
- Map applies CSS filter: `brightness(0.4) blur(8px)`, transition ~300ms
- No travel line, no location marker
- When transitioning away from a milestone, map un-dims
- Travel resumes from wherever the last located memory was (milestone doesn't change the map position)

## Special Cases

### Opening Card

- Displayed in the CardOverlay (same fixed position as other cards)
- Content: heart emoji, "Juni 2024", "We matched on Bumble" (existing)
- Map shows the Herent-Gent arc animation during the opening hold section (existing behavior)
- Transitions out using the same fade-out animation as other cards
- Travel from opening to first memory: line draws from arc apex to first memory's location

### Milestone Cards

- No location — map stays where it is from the previous located memory
- Map dims and blurs during the milestone hold
- Fireworks/sparkle CSS animation behind the card on appearance (particles radiating outward)
- Shorter transition section (~100vh)

### Same-Location Transitions

- No travel line, no map movement
- Short transition section (~50vh)
- Card crossfade only (fade out → brief pause → fade in)

## Closing Sequence

Three scroll phases after the last memory:

### Phase 1: Journey Overview (~200vh transition)

- Last memory card fades out
- Map smoothly zooms out to show all visited countries
- Visited countries get a highlight fill (coral tint), rest stays gray
- Uses vector tile source or GeoJSON for country boundaries
- All visited location pins pop in sequentially as the user scrolls
- Small pin markers at each unique location

### Phase 2: Stats Screen (~150vh hold)

- Map fades out
- Centered stats display on a clean background
- Auto-calculated from data:
  - Number of dates, trips, milestones
  - Unique locations, unique countries
  - Total memories
- Hardcoded fun stats (e.g., "infinite cocktails", "1000+ photos")
- Stats animate in one by one as user scrolls (counter/typewriter effect)

### Phase 3: Gift Card (~100vh hold)

- Button appears — scrolling stops here
- User taps button for the gift reveal
- Content to be designed separately

## Card Detail View

### Trigger

- "Details" button on MemoryCard, only shown when the memory has `expandedText` or `expandedPhotos`

### Overlay Behavior

- Slides up from the bottom, full viewport
- Semi-transparent dark backdrop over the map
- Timeline scrolling is disabled while open

### Content Layout

- Title + date header
- Body rendered from `expandedText` as markdown (using `react-markdown`)
- Inline images in markdown reference photos from the photos directory: `![](filename.jpg)`
- For trips with `days[]`: each day as a sub-section (date, title, caption, photos)
- Photos render full-width within the overlay
- Tap a photo for lightbox/zoom

### Dismiss

- Swipe down gesture or X button (top-right)
- Returns to exact timeline position — card still in hold phase, map unchanged

### Data Format

`expandedText` is a markdown string in the JSON. Newlines encoded as `\n`:

```json
"expandedText": "We arrived early morning.\n\n![](beach-sunset.jpg)\n\nThe hotel was right on the water."
```

## Component Architecture

### New Components

| Component | Responsibility |
|-----------|---------------|
| `CardOverlay.tsx` | Fixed container below timeline, renders active card with opacity/transform |
| `TravelLine.tsx` | Manages GeoJSON line source + transport marker on the map |
| `LocationMarker.tsx` | Pulsing coral dot marker |
| `MilestoneEffect.tsx` | Fireworks/sparkle animation for milestone cards |
| `ClosingSequence.tsx` | Journey overview map, stats screen, gift button |
| `DetailOverlay.tsx` | Full-screen card detail view with markdown rendering |

### Modified Components

| Component | Changes |
|-----------|---------|
| `App.tsx` | New scroll-track structure, manages active state + phase + progress |
| `MapCanvas.tsx` | Accepts travel line data, markers, dim/blur state, country highlights |
| `MemoryCard.tsx` | Receives opacity/transform from parent, "Details" button |
| `OpeningCard.tsx` | Rendered in CardOverlay, same fade-out behavior |
| `TimelineStrip.tsx` | Progress calculation based on section index |

### Rewritten

| Component | Changes |
|-----------|---------|
| `useScrollTimeline.ts` | Creates scroll sections, exposes `activeIndex`, `phase` ('hold' \| 'transition'), `progress` (0-1) |

### Data Flow

```
useScrollTimeline
  → activeIndex: number        (which memory, -1 = opening, memories.length = closing)
  → phase: 'hold' | 'transition'
  → progress: number           (0-1 within current section)

App reads these and passes:
  → CardOverlay: which card, opacity/transform derived from progress+phase
  → MapCanvas: center, zoom, dim/blur state
  → TravelLine: from/to coordinates, progress, transport mode
  → LocationMarker: coordinates, pulse trigger
  → ClosingSequence: progress for each closing phase
```

## Dependencies

### Existing (no changes)

- `maplibre-gl` — map rendering
- `gsap` + `ScrollTrigger` — scroll-driven animations
- `lenis` — smooth scrolling
- `date-fns` — date formatting

### New

- `react-markdown` — render expandedText in detail overlay
- Country boundaries GeoJSON (Natural Earth simplified) — for closing journey overview
