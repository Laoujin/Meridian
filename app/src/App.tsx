import { useMemo, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { loadMemories, getLocation } from './data/loader';
import { useScrollTimeline } from './hooks/useScrollTimeline';
import { interpolateLine, haversineDistance } from './utils/geo';
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

/** Compute zoom level that fits two points on screen. */
function zoomForDistance(distKm: number): number {
  if (distKm < 2) return 14;
  if (distKm < 5) return 13;
  if (distKm < 10) return 12;
  if (distKm < 25) return 11;
  if (distKm < 50) return 10;
  if (distKm < 100) return 9;
  if (distKm < 250) return 8;
  if (distKm < 500) return 7;
  if (distKm < 1000) return 6;
  return 5;
}

function zoomForMemory(memories: ReturnType<typeof loadMemories>, index: number): number {
  if (index < 0 || index >= memories.length) return 9;
  const m = memories[index];
  if (m.type === 'trip') return 6;
  const loc = getLocation(m);
  if (loc.lat === 51.0597 && loc.lng === 3.7527) return 13;
  return 11;
}

export default function App() {
  const memories = useMemo(() => loadMemories(), []);
  const { activeIndex, phase, progress, transitionType, sections } = useScrollTimeline(memories);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [detailMemory, setDetailMemory] = useState<ReturnType<typeof loadMemories>[number] | null>(null);

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  const isOpening = activeIndex < 0;
  const isClosing = activeIndex >= memories.length;
  const activeMemory = activeIndex >= 0 && activeIndex < memories.length ? memories[activeIndex] : null;

  // --- Travel line ---
  const isTravelTransition = phase === 'transition'
    && transitionType !== 'same-location'
    && transitionType !== 'to-milestone';

  const travelFrom = useMemo<[number, number] | null>(() => {
    if (!isTravelTransition && phase !== 'hold') return null;
    if (transitionType === 'same-location' || transitionType === 'to-milestone') return null;
    if (isTravelTransition) {
      if (transitionType === 'opening') return [ARC_APEX[0], ARC_APEX[1]];
      if (transitionType === 'from-milestone') {
        return memoryLngLat(memories, lastLocatedIndex(memories, activeIndex));
      }
      return memoryLngLat(memories, activeIndex - 1);
    }
    // Hold: line from previous memory
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

  const lineProgress = isTravelTransition ? progress : (phase === 'hold' && travelFrom ? 1 : 0);
  const travelVisible = travelFrom !== null && travelTo !== null;
  const travelTransport = activeMemory?.transport?.[0] ?? null;

  // --- Map center/zoom (computed, no fitBounds) ---
  const mapCenter = useMemo<[number, number]>(() => {
    if (isOpening) return [ARC_APEX[0], ARC_APEX[1]];
    if (isClosing) return DEFAULT_LOC;

    // During travel: center = midpoint between origin and current line tip
    if (isTravelTransition && travelFrom && travelTo) {
      const currentTip = interpolateLine(travelFrom, travelTo, progress);
      return [(travelFrom[0] + currentTip[0]) / 2, (travelFrom[1] + currentTip[1]) / 2];
    }

    // Hold with line: center between both endpoints
    if (phase === 'hold' && travelFrom && travelTo) {
      return [(travelFrom[0] + travelTo[0]) / 2, (travelFrom[1] + travelTo[1]) / 2];
    }

    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeIndex, memories, isTravelTransition, phase, progress, travelFrom, travelTo]);

  const mapZoom = useMemo(() => {
    if (isOpening) return 9;
    if (isClosing) return 4;

    // During travel: zoom out to fit origin + current line tip
    if (isTravelTransition && travelFrom && travelTo) {
      const currentTip = interpolateLine(travelFrom, travelTo, progress);
      const dist = haversineDistance(travelFrom, currentTip);
      const startZoom = zoomForMemory(memories, activeIndex - 1);
      const fitZoom = zoomForDistance(dist);
      return Math.min(startZoom, fitZoom);
    }

    // Hold with line: zoom to fit both endpoints
    if (phase === 'hold' && travelFrom && travelTo) {
      const dist = haversineDistance(travelFrom, travelTo);
      return zoomForDistance(dist);
    }

    return zoomForMemory(memories, activeIndex);
  }, [isOpening, isClosing, isTravelTransition, phase, progress, travelFrom, travelTo, activeIndex, memories]);

  // --- Milestone dimming ---
  const isDimmed = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Location markers ---
  const originCoords = travelFrom;
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

  const timelineIndex = Math.max(0, Math.min(activeIndex, memories.length - 1));

  return (
    <>
      <MapCanvas
        center={mapCenter}
        zoom={mapZoom}
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
