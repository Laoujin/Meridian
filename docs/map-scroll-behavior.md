# Map & Scroll Behavior Specification

## Screen Layout

The screen is divided into two regions:
- **Top 2/3**: Card overlay (memory cards displayed here)
- **Bottom 1/3**: Map viewport (dots, lines, and map tiles visible here)

All map content (dots, lines) should appear in the bottom 1/3. This is achieved by passing `padding: { top: h * 0.67, bottom: 40, left: 40, right: 40 }` to every `fitBounds` call, where `h` is the screen height.

## Map Positioning

**`fitBounds` is the only method used to position the map.** No `jumpTo`, no manual center/zoom computation. Every frame, the map receives two points and calls `fitBounds` with consistent padding. A `maxZoom: 14` cap prevents infinite zoom when points are identical.

The two points passed to fitBounds are called **viewA** and **viewB**. They define what the map shows at any given moment.

## States

### Hold Phase (reading a card)

After traveling from memory A to memory B:
- **viewA** = location of memory A (the origin)
- **viewB** = location of memory B (the destination)
- Map shows both dots with a complete line between them
- Both dots are visible in the bottom 1/3 of the screen
- The card for memory B is fully visible in the top 2/3

### Transition Phase (scrolling from B to C)

The user scrolls to advance from memory B to memory C. Progress goes from 0 to 1.

**At progress 0:**
- The old line (A→B) disappears, dot A disappears
- Dot B stays (it becomes the origin for the new line)
- New dot C appears (pulsing)
- New line starts drawing from B toward C
- **viewA** = location of A (same as previous hold — the map hasn't moved yet)
- **viewB** = location of B

**At progress p (0→1):**
- Line extends from B toward C, currently drawn to `lineTip = interpolate(B, C, p)`
- Card B fades out (progress 0→0.4), Card C fades in (progress 0.3→1.0)
- **viewA** = interpolate from A toward B over progress (so: `interpolate(A, B, p)`)
- **viewB** = `lineTip` = `interpolate(B, C, p)`
- This smoothly moves the fitBounds window from "showing A+B" toward "showing B+C"
- The line tip is always one of the two fitBounds points, so it's always on screen

**At progress 1:**
- Line B→C is complete
- Card C is fully visible
- **viewA** = B, **viewB** = C
- This is now the hold view for memory C

### Transition from C to D

When the next scroll starts:
- Old line B→C disappears, dot B disappears
- viewA/viewB start from [B, C] (previous hold) and interpolate toward [C, D]
- Same pattern repeats

## Visual Elements During Each Phase

### Hold (after A→B travel):
| Element | State |
|---------|-------|
| Card B | fully visible |
| Dot A | visible (static, origin) |
| Dot B | visible (pulsing) |
| Line A→B | visible (complete) |
| Map | fitBounds([A, B]) |

### Transition B→C at progress p:
| Element | State |
|---------|-------|
| Card B | fading out (opacity: 1→0 over p=0→0.4) |
| Card C | fading in (opacity: 0→1 over p=0.3→1.0) |
| Dot A | hidden (removed at p=0) |
| Dot B | visible (static, new origin) |
| Dot C | visible (pulsing, appears at p=0) |
| Line A→B | hidden (removed at p=0) |
| Line B→C | drawing (progress matches p, 0→1) |
| Map | fitBounds([interpolate(A,B,p), interpolate(B,C,p)]) |

## Special Cases

### Same-location transition (B and C are at the same coordinates)
- No line drawn, no dots change
- Card crossfade only
- Map stays where it is (fitBounds with two identical points, capped by maxZoom)

### Milestone (no location)
- Map dims and blurs
- No line drawn
- Map stays where it was from the previous located memory
- viewA and viewB don't change

### Opening card
- Special case: shows Herent-Gent arc
- Handled separately in MapCanvas

### First memory (opening → memory 0)
- There is no "previous A" — viewA starts at ARC_APEX
- Otherwise same pattern

## Data Flow

```
useScrollTimeline -> { activeIndex, phase, progress, transitionType }
                          |
App.tsx computes:
  - travelFrom, travelTo (line endpoints, persist during hold)
  - prevFrom (origin of the PREVIOUS line, for viewA during hold)
  - viewA, viewB (the two points for fitBounds)
  - lineProgress (0-1 for the line drawing)
                          |
MapCanvas receives: viewA, viewB -> fitBounds([viewA, viewB], { padding, maxZoom })
TravelLine receives: from, to, progress
LocationMarker x 2: origin dot + destination dot
CardOverlay: handles card crossfade
```

## Key Principles

1. **fitBounds is the only map positioning method** (except opening card)
2. **Two points define the view** — always pass exactly two points to fitBounds
3. **The line tip is always one of the two points** — so it's always on screen
4. **viewA and viewB interpolate smoothly** — no jumps between states
5. **Lines persist during hold** — only cleared when the next transition starts
6. **Both dots visible in bottom 1/3** — consistent padding on every fitBounds call
