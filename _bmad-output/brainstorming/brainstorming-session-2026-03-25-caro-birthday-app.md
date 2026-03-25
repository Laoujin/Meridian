---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Birthday gift app for Caro - chronological memory timeline from Obsidian daily notes and mobile photos'
session_goals: 'Data extraction from Obsidian, photo curation strategy, mobile app format/UX, emotional wow-factor'
selected_approach: 'ai-recommended'
techniques_used: ['Future Self Interview', 'SCAMPER Method', 'Morphological Analysis']
ideas_generated: 57
context_file: ''
session_active: false
workflow_completed: true
facilitation_notes: 'User has strong instincts for UX and emotional design. Key breakthrough was the scroll-driven animated map journey idea — transformed the project from a simple timeline into an interactive travel narrative. User thinks in layers (surface browsing → detail expansion) and values authenticity over polish.'
---

# Brainstorming Session Results

**Facilitator:** Wouter
**Date:** 2026-03-25

## Session Overview

**Topic:** Birthday gift app for girlfriend Caro (birthday May 6, 2026) — a mobile-first chronological memory app built from Obsidian daily notes and mobile photos, presented as a scroll-driven animated map journey of their relationship.

**Goals:**
1. Data pipeline: Extract relevant entries from Obsidian vault (~53 #date notes, ~55 [[Caro]] notes)
2. Photo curation: Best approach for selecting photos (AI-assisted, manual, hybrid)
3. App format: What kind of mobile experience would delight her most
4. The "wow factor" — making it feel personal and special

### Session Setup

- ~6 weeks until birthday (May 6, 2026)
- Dozens of dates, a few trips documented in Obsidian
- Notes in Dutch, daily format (YYYY-MM-DD.md), using #date and [[Caro]] tags
- 1,153 photos in vault, timestamp-correlated to dates
- Mobile-first requirement — Caro is very mobile oriented
- Solo developer project

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Personal gift app with emotional + technical dimensions

**Recommended Techniques:**

- **Future Self Interview:** Ground decisions in Caro's emotional reaction — work backwards from the "wow moment"
- **SCAMPER Method:** Systematically explore app format ideas beyond the obvious timeline
- **Morphological Analysis:** Map technical decisions (data extraction, photo curation, framework, deployment) into actionable combinations

## Technique Execution Results

### Phase 1: Future Self Interview — "What Would Delight Her?"

**Interactive Focus:** Channel Caro's perspective, work backwards from the emotional moment of opening the gift on her birthday.

**Key Breakthroughs:**
- The app should be immediately obvious — opens with the Bumble match date, simple and direct
- Three-layer interaction: scroll timeline → tap photo stacks to shuffle → expand to Stories-style detail view
- Stacked physical photos as the core UI metaphor — every entry is a pile of photos you shuffle through
- The finale: last card shows a photo of a surprise gift, she looks up, Wouter hands it to her — digital→physical bridge
- Contextual soundtrack: romantic background music crossfading to specific songs at key moments (Taylor Swift "Dancing With My Own" at Vietnam trip, concert artists at concert dates)
- Privacy matters: self-hosted on home network, not public
- Living document: keep adding memories after the birthday

**Decisions Made:**
- Simple opening: date + "We matched on Bumble" (no gimmicks)
- Edited excerpts and/or freshly written captions (not raw Obsidian text)
- Continuous scroll navigation only (no jumping ahead)
- Photos AND videos mixed together
- Handwritten-style font for captions
- Subtle micro-animations throughout
- No navigation UI — scroll is the only interaction

### Phase 2: SCAMPER — App Format Exploration

**Building on Previous:** Took the emotional blueprint and systematically twisted it through seven creative lenses.

**Key Breakthroughs:**

**Substitute:**
- The scroll-driven animated map journey — THE breakthrough idea. The map IS the timeline. Scrolling moves through space AND time. Local dates pin on Ghent streets. Trips zoom out with animated travel lines (car to airport, plane to destination, zoom into arrival city).
- Stylized/illustrated map tiles (not Google Maps look) — real geography, artistic skin
- Videos mixed in with photos where available

**Combine:**
- Weather data on relevant memories (only when notable — heat in Morocco, rain)
- Manual milestone celebrations ("1 year together", "wettelijk samenwonend")
- Running relationship stats accumulating as she scrolls (restaurants visited, km traveled, photos together)

**Adapt:**
- Instagram Stories-style detail view (full screen, tap sides, progress bar) — she uses Instagram daily
- Optional Spotify Wrapped-style summary before the gift reveal

**Modify:**
- Hero moments: full-bleed photo takeover with title overlay for big events (Vietnam trip, milestones)
- First date scales to available content — no forcing it to be bigger than it is
- Gap fillers: memes and inside jokes between documented dates

**Eliminate:**
- No navigation UI, no loading screens, no menus
- Zero chrome — content IS the interface

**Put to Other Uses:**
- Living document — keep adding after birthday, gift grows every year

**Reverse:**
- No countdown teaser (rejected — keep it a surprise)

### Phase 3: Morphological Analysis — Technical Decisions

**New Insights:** Systematic parameter-by-parameter decision making for the build.

**Decisions:**

| Parameter | Choice | Rationale |
|-----------|--------|-----------|
| Framework | React | Comfortable framework, rich ecosystem for scroll animations and map integration |
| Map | MapLibre GL JS | Open source, free, same API as Mapbox, flyTo/easeTo for scroll-driven animations |
| Scroll Engine | Lenis + GSAP ScrollTrigger | Lenis for buttery smooth mobile scroll, GSAP for precise scroll-position-to-animation orchestration |
| Data Format | JSON per year (memories-2024.json, etc.) | Simple, no server needed, easy to edit and maintain as living document |
| Audio | Howler.js + local mp3s | Mobile audio quirks handled, crossfade support built-in |
| Images | Two sizes via Sharp (200px thumb, 800px full) | Mobile screen doesn't need originals, 800px covers retina hero moments |
| Video | Compressed mp4/webm via FFmpeg | Web-friendly, short clips |
| Hosting | Docker container on Synology NAS | Private, already has NAS, portable |
| Data Extraction | Claude-assisted interactive curation | I present notes, Wouter says yes/no, #date auto-qualifies |
| Photo Curation | Hybrid: Obsidian photos auto-included + AI-filtered picks from phone folder | Two-tier: trusted source auto-includes, untrusted source gets filtered then human-approved |

### Creative Facilitation Narrative

The session evolved from a vague "chronological thing of dates" into a fully realized concept: a scroll-driven animated map journey through the relationship. The breakthrough moment was during SCAMPER Substitute when Wouter spontaneously described how a trip to Vietnam should animate — zoom out from home, draw a car line to the airport, fly a plane across continents, land in Vietnam. That single idea transformed the project from a photo timeline into an interactive travel narrative.

The emotional grounding from Phase 1 (Future Self Interview) kept every technical decision anchored in "what would Caro love?" — leading to choices like Instagram Stories-style interaction (she uses it daily), handwritten fonts (personal feel), and the physical gift reveal finale (digital→real-world bridge).

### Session Highlights

**Breakthrough Moments:**
- Scroll-driven animated map as primary navigation (not just a feature, THE experience)
- Contextual soundtrack tied to scroll position (concert songs, trip themes)
- Physical gift reveal as the finale — the app is the buildup, not the gift itself
- Three-layer interaction depth: scroll → shuffle stack → Stories expand

**Energy Flow:** High throughout, especially during the map animation brainstorming. User contributed detailed interaction ideas (stacked photos, transport animations) and consistently chose authenticity over flashiness.

## Idea Organization and Prioritization

### Theme 1: Core Experience & Navigation
- **#26** Scroll-Driven Animated Map Journey — map IS the timeline
- **#27** Transport Mode Animations — car, plane, walking, bike
- **#28** Home Base Heartbeat — Ghent home as glowing center of gravity
- **#29** Full-Screen Map with Timeline Header — timeline strip at top
- **#31** Scroll-Only Navigation — no jumping ahead
- **#55** Zero Chrome UI — no menus, no buttons
- **#51** Eliminate Loading Screens — instant immersion

### Theme 2: Memory Cards & Photo Interaction
- **#7** Universal Photo Stacks — every entry is a tappable stack
- **#8** Expandable Detail View — three layers of engagement
- **#41** Instagram Stories Detail View — full screen, tap to advance
- **#45** Hero Photos by Emotion — full-bleed for big moments
- **#48** Hero Moment — full-screen takeover with title overlay
- **#46** First Date Scales to Content — authentic, not forced

### Theme 3: Emotional & Atmospheric Layer
- **#1/#16** Simple Bumble Opening — date + "We matched on Bumble"
- **#20** Contextual Soundtrack — romantic background, contextual crossfades
- **#22** Concert Sound Triggers — artist music at concert dates
- **#21** Scroll-Triggered Micro-Animations — fade-in, Ken Burns, parallax
- **#30** Illustrated Map Style — real geography, artistic skin
- **#24** Handwritten Font — personal feel
- **#35** Contextual Weather — only when notable
- **#47** Gap Fillers — memes and inside jokes

### Theme 4: Milestones & Stats
- **#36** Manual Milestone Celebrations — relationship markers
- **#37** Running Relationship Stats — accumulating counters
- **#42** Optional Wrapped Finale — if it looks good
- **#9** Scale Reflects Significance — bigger cards for bigger events

### Theme 5: The Finale
- **#19** Physical Gift Reveal — last card is photo of surprise, then real handover

### Theme 6: Data Pipeline & Curation
- **#57** Interactive Curation Session — I present, Wouter approves
- **#10** AI-Assisted Photo Curation — two-tier (Obsidian auto, phone filtered)
- **#11** AI Photo Evaluation Criteria — quality, faces, duplicates, variety
- **#56** Two-Size Image Pipeline — 200px + 800px
- **#54** Living Document — easy to add new memories

### Theme 7: Technical Stack
- React + MapLibre GL JS + Lenis + GSAP ScrollTrigger
- Howler.js + local mp3s
- Sharp + FFmpeg for media processing
- JSON per year for content
- Docker on Synology NAS

## Action Plan

### Phase 0: Content Preparation (Week 1)
1. Interactive curation session — go through all Obsidian notes mentioning Caro, confirm which are dates
2. PR for missing #date tags in Obsidian repo
3. Gather phone photos — make folder accessible, organized by date
4. AI photo curation — filter and present candidates, Wouter picks
5. Write/edit captions for each memory
6. Identify hero moments — which dates get full-bleed treatment
7. List music triggers — which songs at which scroll positions
8. List milestones — relationship markers with dates
9. Add gap fillers — memes and jokes for quiet periods

### Phase 1: App Skeleton (Week 2)
1. React project setup with Lenis + GSAP
2. MapLibre integration with stylized tiles
3. Scroll-driven map movement proof of concept
4. JSON data loading from memories-YYYY.json

### Phase 2: Core Features (Week 3-4)
1. Photo stacks with tap-to-shuffle
2. Stories-style detail view
3. Hero moment full-bleed takeover
4. Travel animations (car, plane lines on map)
5. Milestone cards
6. Running stats counters

### Phase 3: Polish (Week 5)
1. Howler.js audio integration with scroll-triggered crossfades
2. Micro-animations (fade-in, Ken Burns, parallax)
3. Handwritten font styling
4. Weather indicators on relevant cards
5. Gap filler cards
6. Image optimization pipeline (Sharp)
7. Video compression

### Phase 4: Ship (Week 6)
1. Docker container build
2. Deploy to Synology NAS
3. Test on Caro's phone model/browser
4. Optional: Wrapped finale
5. Final content review — every caption, every photo
6. Gift reveal photo as last card

## Session Summary

**57 ideas** generated across **3 techniques** (Future Self Interview, SCAMPER, Morphological Analysis), organized into **7 themes** with a concrete **4-phase action plan** spanning 6 weeks.

**The core concept:** A scroll-driven animated map journey through a relationship — starting from a Bumble match, flowing through dates in Ghent and trips abroad, with stacked photo cards, contextual music, micro-animations, and ending with a physical gift reveal. Private, self-hosted, designed to grow.
