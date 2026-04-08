import { useMemo, useState, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { loadMemories, getLocation } from './data/loader';
import { useScrollTimeline } from './hooks/useScrollTimeline';
import { interpolateLine } from './utils/geo';
import MapCanvas, { ARC_APEX } from './components/MapCanvas';
import TimelineStrip from './components/TimelineStrip';
import CardOverlay from './components/CardOverlay';
import TravelLine from './components/TravelLine';
import LocationMarker from './components/LocationMarker';
import MilestoneEffect from './components/MilestoneEffect';
import ClosingSequence from './components/ClosingSequence';
import DetailOverlay from './components/DetailOverlay';
import './styles/global.css';

function memoryLngLat(memories: ReturnType<typeof loadMemories>, index: number): [number, number] {
  if (index < 0 || index >= memories.length) return [ARC_APEX[0], ARC_APEX[1]];
  const loc = getLocation(memories[index]);
  return [loc.lng, loc.lat];
}

/**
 * Get the origin of the line shown during hold at memory index i.
 * For i=0: ARC_APEX (came from the opening).
 * For i>0: location of the previous located memory (skipping milestones).
 */
function lineOriginAt(memories: ReturnType<typeof loadMemories>, i: number): [number, number] {
  if (i <= 0) return [ARC_APEX[0], ARC_APEX[1]];
  for (let j = i - 1; j >= 0; j--) {
    if (memories[j].type !== 'milestone') return memoryLngLat(memories, j);
  }
  return [ARC_APEX[0], ARC_APEX[1]];
}

export default function App() {
  const memories = useMemo(() => loadMemories(), []);
  const { activeIndex, phase, progress, transitionType, sections } = useScrollTimeline(memories);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [detailMemory, setDetailMemory] = useState<ReturnType<typeof loadMemories>[number] | null>(null);

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

  // --- Three key locations for the current state ---
  // During hold at memory i: line is from lineOriginAt(i) → location(i)
  // During transition to memory i: new line from lineOriginAt(i) → location(i)
  //   and previous hold showed lineOriginAt(i-1) → location(i-1)

  const isTravelTransition = phase === 'transition'
    && transitionType !== 'same-location'
    && transitionType !== 'to-milestone';

  // --- Travel line (from/to for drawing) ---
  // During transition to i: line draws from lineOriginAt(i) → location(i)
  // During hold at i: line stays from lineOriginAt(i) → location(i)
  const travelFrom = useMemo<[number, number] | null>(() => {
    if (isOpening) return null;
    if (isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    return lineOriginAt(memories, activeIndex);
  }, [isOpening, isClosing, activeMemory, activeIndex, memories]);

  const travelTo = useMemo<[number, number] | null>(() => {
    if (isOpening) return null;
    if (isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeMemory, activeIndex, memories]);

  const lineProgress = isTravelTransition ? progress : (travelFrom ? 1 : 0);
  const travelVisible = travelFrom !== null && travelTo !== null;
  const travelTransport = activeMemory?.transport?.[0] ?? null;

  // --- Map view (two points for fitBounds) ---
  // See docs/map-scroll-behavior.md for the full spec.
  //
  // Hold at memory i:
  //   viewA = lineOriginAt(i)  (= A, the origin of the displayed line)
  //   viewB = location(i)       (= B, the end of the displayed line)
  //
  // Transition to memory i at progress p:
  //   Previous hold was at memory i-1: viewA_prev = lineOriginAt(i-1), viewB_prev = location(i-1)
  //   New hold will be at memory i:    viewA_next = lineOriginAt(i),   viewB_next = location(i)
  //   viewA = interpolate(viewA_prev, viewA_next, p)
  //   viewB = interpolate(viewB_prev, viewB_next, p)

  const viewA = useMemo<[number, number]>(() => {
    if (isOpening) return [ARC_APEX[0], ARC_APEX[1]];
    if (isClosing) return memoryLngLat(memories, memories.length - 1);

    if (isTravelTransition) {
      const prevViewA = lineOriginAt(memories, activeIndex - 1);
      const nextViewA = lineOriginAt(memories, activeIndex);
      return interpolateLine(prevViewA, nextViewA, progress);
    }

    // Hold
    return lineOriginAt(memories, activeIndex);
  }, [isOpening, isClosing, isTravelTransition, activeIndex, memories, progress]);

  const viewB = useMemo<[number, number]>(() => {
    if (isOpening) return [ARC_APEX[0], ARC_APEX[1]];
    if (isClosing) return memoryLngLat(memories, memories.length - 1);

    if (isTravelTransition) {
      const prevViewB = memoryLngLat(memories, activeIndex - 1);
      const nextViewB = memoryLngLat(memories, activeIndex);
      return interpolateLine(prevViewB, nextViewB, progress);
    }

    // Hold
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, isTravelTransition, activeIndex, memories, progress]);

  // Expose viewA/viewB for e2e testing
  useEffect(() => {
    (window as any).__viewState = { viewA, viewB, travelFrom, travelTo, lineProgress };
  }, [viewA, viewB, travelFrom, travelTo, lineProgress]);

  // --- Milestone dimming ---
  const isDimmed = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Location markers ---
  const originCoords = travelFrom;
  const destCoords = travelTo;
  const destPulse = true; // destination always pulses

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
  const handleShowDetails = useCallback((memoryIndex: number) => {
    setDetailMemory(memories[memoryIndex]);
  }, [memories]);

  const timelineIndex = Math.max(0, Math.min(activeIndex, memories.length - 1));

  return (
    <>
      <MapCanvas
        viewA={viewA}
        viewB={viewB}
        showOpeningLine={isOpening}
        dimmed={isDimmed}
        onMapReady={handleMapReady}
        overviewLocations={allLocations}
        showOverview={isClosing && transitionType === 'closing-overview'}
      />

      <TravelLine
        map={mapInstance}
        from={travelFrom}
        to={travelTo}
        progress={lineProgress}
        transport={travelTransport}
        visible={travelVisible}
        fadeOutProgress={0}
      />

      <LocationMarker map={mapInstance} coordinates={originCoords} pulse={false} />
      <LocationMarker map={mapInstance} coordinates={destCoords} pulse={destPulse} />

      <TimelineStrip memories={memories} activeIndex={timelineIndex} />

      <CardOverlay
        activeIndex={activeIndex}
        memories={memories}
        phase={phase}
        progress={progress}
        onShowDetails={handleShowDetails}
      />

      {showMilestoneEffect && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 49, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <MilestoneEffect active />
        </div>
      )}

      {isClosing && transitionType && transitionType.startsWith('closing-') && (
        <ClosingSequence
          memories={memories}
          phase={
            transitionType === 'closing-overview' ? 'overview'
            : transitionType === 'closing-stats' ? 'stats'
            : 'gift'
          }
          progress={progress}
        />
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

      {detailMemory && (
        <DetailOverlay
          memory={detailMemory}
          onClose={() => setDetailMemory(null)}
        />
      )}
    </>
  );
}
