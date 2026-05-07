import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { loadMemories, getLocation } from './data/loader';
import { useScrollTimeline } from './hooks/useScrollTimeline';
import { interpolateLine } from './utils/geo';
import { isPointVisible } from './utils/camera';
import MapCanvas from './components/MapCanvas';
import OpeningArc from './components/OpeningArc';
import { story, ORIGIN, ANCHOR } from './data/story';
import OpeningTransition from './components/OpeningTransition';
import EaseInCamera from './components/EaseInCamera';
import EaseOutCamera from './components/EaseOutCamera';
import OpeningCamera from './components/OpeningCamera';
import TimelineStrip from './components/TimelineStrip';
import CardOverlay from './components/CardOverlay';
import TravelLine from './components/TravelLine';
import LocationMarker from './components/LocationMarker';
import MilestoneEffect from './components/MilestoneEffect';
import ClosingSequence from './components/ClosingSequence';
import OverviewDots from './components/OverviewDots';
import GiftReveal from './components/GiftReveal';
import { playTrack, stopAudio, setMuted as setAudioMuted } from './utils/audio';
import './styles/global.css';

function memoryLngLat(memories: ReturnType<typeof loadMemories>, index: number): [number, number] {
  if (index < 0 || index >= memories.length) return ORIGIN; // fallback
  const loc = getLocation(memories[index]);
  return [loc.lng, loc.lat];
}

function memoryLabel(memories: ReturnType<typeof loadMemories>, index: number): string {
  if (index < 0 || index >= memories.length) return '';
  return memories[index].title ?? '';
}

/** True iff the memory has real lat/lng coordinates. */
function hasLocation(m: ReturnType<typeof loadMemories>[number]): boolean {
  return m.location?.lat != null && m.location?.lng != null;
}

/** True when two [lng, lat] tuples refer to the same map position. */
function isSameLocation(a: [number, number], b: [number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Get the origin of the line shown during hold at memory index i.
 * For i=0: first memory has no "previous" line origin (opening transition handles it).
 * For i>0: location of the most recent prior memory that has coordinates.
 *   Milestones with locations count — see holdView for the rationale.
 */
function lineOriginAt(memories: ReturnType<typeof loadMemories>, i: number): [number, number] {
  if (i <= 0) return memoryLngLat(memories, 0);
  for (let j = i - 1; j >= 0; j--) {
    if (hasLocation(memories[j])) return memoryLngLat(memories, j);
  }
  return memoryLngLat(memories, 0);
}

/** Find the next memory (j > i) that has coordinates, or null if none. */
function nextLocatedIndex(memories: ReturnType<typeof loadMemories>, i: number): number | null {
  for (let j = i + 1; j < memories.length; j++) {
    if (hasLocation(memories[j])) return j;
  }
  return null;
}

/**
 * The (viewA, viewB) bounds the map shows during hold at memory index i.
 * Source of truth for "what was on screen before a transition starts" — used
 * to feed transition cameras so they begin without a jump.
 *
 * Milestone holds are special: the map is dimmed and blurred (see isDimmed),
 * so we use that invisible window to PRE-POSITION the camera for the upcoming
 * transition. Frame [milestone-location, next-located-memory.location] so when
 * the user scrolls past the dim, the line draws cleanly from the milestone.
 */
function holdView(
  memories: ReturnType<typeof loadMemories>,
  i: number,
): { a: [number, number]; b: [number, number] } {
  if (i === 0) return { a: ANCHOR, b: ORIGIN }; // hold-0 frames the opening anchors

  const m = memories[i];
  if (m?.type === 'milestone' && hasLocation(m)) {
    const nextIdx = nextLocatedIndex(memories, i);
    if (nextIdx !== null) {
      return { a: memoryLngLat(memories, i), b: memoryLngLat(memories, nextIdx) };
    }
  }

  return { a: lineOriginAt(memories, i), b: memoryLngLat(memories, i) };
}

export default function App() {
  const memories = useMemo(() => loadMemories(), []);
  const { activeIndex, phase, progress, transitionType, sections, lenisRef } = useScrollTimeline(memories);

  const handleYearClick = useCallback((memoryIndex: number) => {
    lenisRef.current?.scrollTo(`#section-hold-${memoryIndex}`);
  }, [lenisRef]);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  // Expose state for e2e testing
  useEffect(() => {
    (window as any).__scrollState = { activeIndex, phase, progress, transitionType };
  }, [activeIndex, phase, progress, transitionType]);

  const isOpening = activeIndex < 0;
  const isClosing = activeIndex >= memories.length;
  const activeMemory = activeIndex >= 0 && activeIndex < memories.length ? memories[activeIndex] : null;

  const [muted, setMuted] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const handleWhatsNext = useCallback(() => setShowGift(true), []);
  const toggleMuted = useCallback(() => setMuted((m) => !m), []);

  // Play / stop based on the active memory's music
  useEffect(() => {
    if (activeMemory?.music) {
      playTrack(activeMemory.music.track);
    } else {
      stopAudio();
    }
  }, [activeMemory?.music?.track]);

  // Sync mute state to the audio element
  useEffect(() => {
    setAudioMuted(muted);
  }, [muted]);

  // Is this the special opening→memory0 transition?
  const isOpeningTransition = phase === 'transition' && transitionType === 'opening';

  const isTravelTransition = phase === 'transition'
    && transitionType !== 'same-location'
    && transitionType !== 'to-milestone'
    && !isOpeningTransition; // opening transition is handled separately

  // --- Travel line (from/to for drawing) ---
  // Not used during opening or the opening transition (OpeningTransition handles that)
  const travelFrom = useMemo<[number, number] | null>(() => {
    if (isOpening || isOpeningTransition) return null;
    if (isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    const origin = lineOriginAt(memories, activeIndex);
    const dest = memoryLngLat(memories, activeIndex);
    if (isSameLocation(origin, dest)) return null;
    return origin;
  }, [isOpening, isOpeningTransition, isClosing, activeMemory, activeIndex, memories]);

  const travelTo = useMemo<[number, number] | null>(() => {
    if (isOpening || isOpeningTransition) return null;
    if (isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    const origin = lineOriginAt(memories, activeIndex);
    const dest = memoryLngLat(memories, activeIndex);
    if (isSameLocation(origin, dest)) return null;
    return dest;
  }, [isOpening, isOpeningTransition, isClosing, activeMemory, activeIndex, memories]);

  const lineProgress = isTravelTransition ? progress : (travelFrom ? 1 : 0);
  const travelVisible = travelFrom !== null && travelTo !== null;

  // --- Map view (two points for fitBounds) ---
  const viewA = useMemo<[number, number]>(() => {
    if (isOpening) return ORIGIN;
    if (isClosing) return memoryLngLat(memories, memories.length - 1);

    if (isOpeningTransition) {
      // Interpolate from opening view (anchor-origin area) toward first memory
      return interpolateLine(ANCHOR, memoryLngLat(memories, 0), progress);
    }

    if (isTravelTransition) {
      const prev = holdView(memories, activeIndex - 1);
      const next = holdView(memories, activeIndex);
      return interpolateLine(prev.a, next.a, progress);
    }

    return holdView(memories, activeIndex).a;
  }, [isOpening, isClosing, isOpeningTransition, isTravelTransition, activeIndex, memories, progress]);

  const viewB = useMemo<[number, number]>(() => {
    if (isOpening) return ORIGIN;
    if (isClosing) return memoryLngLat(memories, memories.length - 1);

    if (isOpeningTransition) {
      return interpolateLine(ORIGIN, ORIGIN, progress); // stays at origin during transition
    }

    if (isTravelTransition) {
      const prev = holdView(memories, activeIndex - 1);
      const next = holdView(memories, activeIndex);
      return interpolateLine(prev.b, next.b, progress);
    }

    return holdView(memories, activeIndex).b;
  }, [isOpening, isClosing, isOpeningTransition, isTravelTransition, activeIndex, memories, progress]);

  // Determine camera scenario for travel transitions.
  // Computed via ref so it's available on the same render (no useEffect delay).
  const cameraScenarioRef = useRef<'ease-in' | 'ease-out' | null>(null);
  const prevTransitionRef = useRef('');

  if (!isTravelTransition) {
    cameraScenarioRef.current = null;
    prevTransitionRef.current = '';
  } else if (mapInstance && travelFrom && travelTo) {
    const key = `${activeIndex}-transition`;
    if (key !== prevTransitionRef.current) {
      prevTransitionRef.current = key;
      // margin=10 (not the default 40) — the camera's own fitBounds padding
      // is 40px, so dots placed at the padding boundary fail isPointVisible
      // at margin=40 by sub-pixel rounding and get misclassified as off-screen.
      const fromVis = isPointVisible(mapInstance, travelFrom, 10);
      const toVis = isPointVisible(mapInstance, travelTo, 10);
      cameraScenarioRef.current = fromVis && toVis ? 'ease-in' : 'ease-out';
    }
  }
  const cameraScenario = cameraScenarioRef.current;

  // Expose viewA/viewB for e2e testing
  useEffect(() => {
    (window as any).__viewState = { viewA, viewB, travelFrom, travelTo, lineProgress };
  }, [viewA, viewB, travelFrom, travelTo, lineProgress]);

  // --- Milestone dimming ---
  // Dim engages from the start of the to-milestone transition through the
  // milestone hold itself. The dim hides the camera reposition that happens
  // at hold-start when MapCanvas re-runs with the milestone's pre-positioned
  // viewA/viewB (see holdView).
  const isDimmed =
    (phase === 'hold' && activeMemory?.type === 'milestone') ||
    (phase === 'transition' && transitionType === 'to-milestone');

  // --- Location markers ---
  const originCoords = travelFrom;
  const destCoords = travelTo;
  const destPulse = true;

  // Origin is the previous located memory; mirror lineOriginAt.
  let originLabel = '';
  if (originCoords) {
    for (let j = activeIndex - 1; j >= 0; j--) {
      if (memories[j].type !== 'milestone') {
        originLabel = memoryLabel(memories, j);
        break;
      }
    }
  }
  const destLabel = destCoords ? memoryLabel(memories, activeIndex) : '';

  // For opening transition AND memory 0 hold, show the destination dot at memory 0
  // (memory 0's regular dest dot is null because lineOriginAt(0) == memory 0,
  // so there's no "previous" to draw from — the opening pair fills that role).
  const openingEndpointsVisible = isOpeningTransition || (activeIndex === 0 && phase === 'hold');
  const openingDestCoords = openingEndpointsVisible ? memoryLngLat(memories, 0) : null;
  const openingDestLabel = openingEndpointsVisible ? memoryLabel(memories, 0) : '';

  // --- Milestone effect ---
  const showMilestoneEffect = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Overview locations for closing ---
  const allLocations = useMemo<[number, number][]>(() => {
    const seen = new Set<string>();
    const locs: [number, number][] = [];
    for (const m of memories) {
      if (m.location?.lat != null && m.location?.lng != null) {
        const key = `${m.location.lat},${m.location.lng}`;
        if (!seen.has(key)) {
          seen.add(key);
          locs.push([m.location.lng, m.location.lat]);
        }
      }
    }
    return locs;
  }, [memories]);

  // --- Detail overlay ---
  const timelineIndex = Math.max(0, Math.min(activeIndex, memories.length - 1));

  return (
    <>
      <MapCanvas
        viewA={viewA}
        viewB={viewB}
        phase={phase}
        showOpeningLine={isOpening}
        dimmed={isDimmed}
        onMapReady={handleMapReady}
      />

      <OverviewDots
        map={mapInstance}
        locations={allLocations}
        visible={isClosing}
      />

      {/* Camera control during transitions — scenario-specific */}
      {isOpeningTransition && (
        <OpeningCamera map={mapInstance} destination={memoryLngLat(memories, 0)} progress={progress} />
      )}
      {isTravelTransition && travelFrom && travelTo && cameraScenario === 'ease-in' && (() => {
        const prior = holdView(memories, activeIndex - 1);
        return (
          <EaseInCamera
            map={mapInstance}
            dotFrom={travelFrom}
            dotTo={travelTo}
            progress={progress}
            priorViewA={prior.a}
            priorViewB={prior.b}
          />
        );
      })()}
      {isTravelTransition && travelFrom && travelTo && cameraScenario === 'ease-out' && (() => {
        const prior = holdView(memories, activeIndex - 1);
        return (
          <EaseOutCamera
            map={mapInstance}
            dotFrom={travelFrom}
            dotTo={travelTo}
            progress={progress}
            priorViewA={prior.a}
            priorViewB={prior.b}
          />
        );
      })()}

      {story.opening.arcOrigin && <OpeningArc map={mapInstance} visible={isOpening} />}

      {/* Opening endpoints: arc-origin + home dots with labels (origin only when arcOrigin is set).
          Persist through the opening transition AND memory 0 hold so the first line(s) match
          the rest of the timeline (origin dot stays put after the vehicle arrives). */}
      {story.opening.arcOrigin && (
        <LocationMarker
          map={mapInstance}
          coordinates={ORIGIN}
          label={story.opening.arcOrigin.label}
          opacity={isOpening || openingEndpointsVisible ? 1 : 0}
        />
      )}
      <LocationMarker
        map={mapInstance}
        coordinates={ANCHOR}
        label={story.anchor.label}
        opacity={isOpening || openingEndpointsVisible ? 1 : 0}
      />

      {openingEndpointsVisible && (
        <OpeningTransition
          map={mapInstance}
          destination={memoryLngLat(memories, 0)}
          progress={isOpeningTransition ? progress : 1}
          visible
          originTransport={memories[0]?.transport ?? 'car'}
          anchorTransport={story.opening.anchorTransport}
          showMarkers={isOpeningTransition}
        />
      )}

      {/* Destination dot during opening transition */}
      <LocationMarker map={mapInstance} coordinates={openingDestCoords} label={openingDestLabel} pulse />

      <TravelLine
        map={mapInstance}
        from={travelFrom}
        to={travelTo}
        progress={lineProgress}
        visible={travelVisible}
        fadeOutProgress={0}
        transport={activeMemory?.transport ?? 'car'}
      />

      <LocationMarker map={mapInstance} coordinates={originCoords} label={originLabel} pulse={false} />
      <LocationMarker map={mapInstance} coordinates={destCoords} label={destLabel} pulse={destPulse} />

      <TimelineStrip memories={memories} activeIndex={timelineIndex} onYearClick={handleYearClick} />

      <CardOverlay
        activeIndex={activeIndex}
        memories={memories}
        phase={phase}
        progress={progress}
        muted={muted}
        onToggleMute={toggleMuted}
      />

      {showMilestoneEffect && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 49, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <MilestoneEffect active />
        </div>
      )}

      {isClosing && story.closing.giftReveal && (
        <ClosingSequence onWhatsNext={handleWhatsNext} />
      )}

      {story.closing.giftReveal && (
        <GiftReveal open={showGift} onClose={() => setShowGift(false)} />
      )}

      <div className="scroll-track">
        {sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="scroll-track__section"
            style={{ height: `${section.heightVh}vh` }}
          />
        ))}
      </div>

    </>
  );
}
