import { useMemo, useState, useCallback } from 'react';
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

const DEFAULT_LOC: [number, number] = [3.7527, 51.0597];

function memoryLngLat(memories: ReturnType<typeof loadMemories>, index: number): [number, number] {
  if (index < 0 || index >= memories.length) return [ARC_APEX[0], ARC_APEX[1]];
  const loc = getLocation(memories[index]);
  return [loc.lng, loc.lat];
}

function lastLocatedIndex(memories: ReturnType<typeof loadMemories>, index: number): number {
  for (let i = index - 1; i >= 0; i--) {
    if (memories[i].type !== 'milestone') return i;
  }
  return -1;
}

export default function App() {
  const memories = useMemo(() => loadMemories(), []);
  const { activeIndex, phase, progress, transitionType, sections } = useScrollTimeline(memories);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [detailMemory, setDetailMemory] = useState<ReturnType<typeof loadMemories>[number] | null>(null);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  // --- Map center/zoom ---
  const isOpening = activeIndex < 0;
  const isClosing = activeIndex >= memories.length;
  const activeMemory = activeIndex >= 0 && activeIndex < memories.length ? memories[activeIndex] : null;

  // Map center: during transition fitBounds handles positioning, during hold center on location
  const mapCenter = useMemo<[number, number]>(() => {
    if (isOpening) return [ARC_APEX[0], ARC_APEX[1]];
    if (isClosing) return DEFAULT_LOC;
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeIndex, memories]);

  const destZoom = useMemo(() => {
    if (isOpening) return 9;
    if (isClosing) return 4;
    if (activeIndex < 0 || activeIndex >= memories.length) return 9;
    const m = memories[activeIndex];
    if (m.type === 'trip') return 6;
    const loc = getLocation(m);
    if (loc.lat === 51.0597 && loc.lng === 3.7527) return 13;
    return 11;
  }, [isOpening, isClosing, activeIndex, memories]);

  // Smooth zoom: start zoom → mid-journey zoom (based on distance) → dest zoom
  const mapZoom = destZoom;

  // --- Milestone dimming ---
  const isDimmed = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Travel line ---
  // travelFrom/travelTo persist during hold so the line stays visible
  const isTravelTransition = phase === 'transition'
    && transitionType !== 'same-location'
    && transitionType !== 'to-milestone';

  const travelFrom = useMemo<[number, number] | null>(() => {
    if (!isTravelTransition && phase !== 'hold') return null;
    if (transitionType === 'same-location' || transitionType === 'to-milestone') return null;
    if (isTravelTransition) {
      if (transitionType === 'opening') return [ARC_APEX[0], ARC_APEX[1]];
      if (transitionType === 'from-milestone') {
        const prevIdx = lastLocatedIndex(memories, activeIndex);
        return memoryLngLat(memories, prevIdx);
      }
      return memoryLngLat(memories, activeIndex - 1);
    }
    // Hold phase: show line from previous memory
    if (activeIndex <= 0) return null;
    const prevIdx = memories[activeIndex - 1]?.type === 'milestone'
      ? lastLocatedIndex(memories, activeIndex)
      : activeIndex - 1;
    if (prevIdx < 0) return null;
    return memoryLngLat(memories, prevIdx);
  }, [isTravelTransition, phase, transitionType, activeIndex, memories]);

  const travelTo = useMemo<[number, number] | null>(() => {
    if (!isTravelTransition && phase !== 'hold') return null;
    if (transitionType === 'same-location' || transitionType === 'to-milestone') return null;
    if (activeIndex < 0 || activeIndex >= memories.length) return null;
    return memoryLngLat(memories, activeIndex);
  }, [isTravelTransition, phase, transitionType, activeIndex, memories]);

  // Line draws over full 0-1 during transition, stays at 1 during hold
  const lineProgress = isTravelTransition ? progress : (phase === 'hold' && travelFrom ? 1 : 0);
  const lineFadeOut = 0; // Line never fades
  const travelVisible = travelFrom !== null && travelTo !== null;
  const travelTransport = activeMemory?.transport?.[0] ?? null;

  // Progressive fitBounds: expands from origin toward destination as line draws
  // At progress 0: just the origin point. At progress 1: both endpoints.
  // During hold: both endpoints (line is fully drawn).
  const travelBounds = useMemo<[[number, number], [number, number]] | null>(() => {
    if (!travelFrom || !travelTo) return null;
    if (phase === 'hold') return [travelFrom, travelTo];
    if (!isTravelTransition) return null;
    // Interpolate the "to" point from origin toward destination
    const currentTo = interpolateLine(travelFrom, travelTo, progress);
    return [travelFrom, currentTo];
  }, [isTravelTransition, phase, travelFrom, travelTo, progress]);

  // --- Location markers ---
  // Origin dot: previous location, visible during transition + hold
  const originCoords = travelFrom;

  // Destination dot: current location, appears immediately when transition starts, pulses always
  const destCoords = useMemo<[number, number] | null>(() => {
    if (isOpening || isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeMemory, activeIndex, memories]);

  const destPulse = isTravelTransition || (phase === 'hold');

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

  // --- Timeline progress ---
  const timelineIndex = Math.max(0, Math.min(activeIndex, memories.length - 1));

  return (
    <>
      <MapCanvas
        center={mapCenter}
        zoom={mapZoom}
        showOpeningLine={isOpening}
        dimmed={isDimmed}
        onMapReady={handleMapReady}
        travelBounds={travelBounds}
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
        fadeOutProgress={lineFadeOut}
      />

      {/* Origin dot: previous location, stays during transition + hold */}
      <LocationMarker
        map={mapInstance}
        coordinates={originCoords}
        pulse={false}
      />

      {/* Destination dot: current location, pulsing */}
      <LocationMarker
        map={mapInstance}
        coordinates={destCoords}
        pulse={destPulse}
      />

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

      {/* Scroll track: invisible sections that drive all animations */}
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
