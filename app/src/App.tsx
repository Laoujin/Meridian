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

  // During transitions, interpolate map center along the travel path
  const mapCenter = useMemo<[number, number]>(() => {
    if (isOpening) return [ARC_APEX[0], ARC_APEX[1]];
    if (isClosing) return DEFAULT_LOC;

    if (phase === 'transition' && transitionType !== 'same-location' && transitionType !== 'to-milestone') {
      const from = transitionType === 'opening'
        ? [ARC_APEX[0], ARC_APEX[1]] as [number, number]
        : transitionType === 'from-milestone'
          ? memoryLngLat(memories, lastLocatedIndex(memories, activeIndex))
          : memoryLngLat(memories, activeIndex - 1);
      const to = memoryLngLat(memories, activeIndex);
      // Map lineProgress (0-1 within travel phase) to position
      const travelP = progress >= 0.25 && progress <= 0.75
        ? (progress - 0.25) / 0.5
        : progress > 0.75 ? 1 : 0;
      return interpolateLine(from, to, travelP);
    }

    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeIndex, memories, phase, progress, transitionType]);

  function zoomForMemory(index: number): number {
    if (index < 0 || index >= memories.length) return 9;
    const m = memories[index];
    if (m.type === 'trip') return 6;
    const loc = getLocation(m);
    if (loc.lat === 51.0597 && loc.lng === 3.7527) return 13;
    return 11;
  }

  const destZoom = useMemo(() => {
    if (isOpening) return 9;
    if (isClosing) return 4;
    return zoomForMemory(activeIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpening, isClosing, activeIndex]);

  // Smooth zoom: start zoom → mid-journey zoom (based on distance) → dest zoom
  const mapZoom = useMemo(() => {
    if (phase !== 'transition' || transitionType === 'same-location' || transitionType === 'to-milestone') {
      return destZoom;
    }

    const travelP = progress >= 0.25 && progress <= 0.75
      ? (progress - 0.25) / 0.5
      : progress > 0.75 ? 1 : 0;

    if (travelP <= 0) return destZoom; // still in card-fade-out, keep previous zoom

    const fromCoord = transitionType === 'opening'
      ? [ARC_APEX[0], ARC_APEX[1]] as [number, number]
      : transitionType === 'from-milestone'
        ? memoryLngLat(memories, lastLocatedIndex(memories, activeIndex))
        : memoryLngLat(memories, activeIndex - 1);
    const toCoord = memoryLngLat(memories, activeIndex);

    const prevIdx = transitionType === 'opening' ? -1
      : transitionType === 'from-milestone' ? lastLocatedIndex(memories, activeIndex)
      : activeIndex - 1;
    const startZoom = zoomForMemory(prevIdx);

    // Mid-journey zoom: zoom out proportionally to distance
    const dist = haversineDistance(fromCoord, toCoord);
    // ~5km → barely zoom out, ~500km → zoom way out
    const midZoom = dist < 5 ? Math.min(startZoom, destZoom)
      : dist < 20 ? 10
      : dist < 50 ? 9
      : dist < 150 ? 8
      : dist < 500 ? 6
      : 5;

    // First half of travel: startZoom → midZoom, second half: midZoom → destZoom
    if (travelP <= 0.5) {
      const t = travelP / 0.5;
      return startZoom + (midZoom - startZoom) * t;
    }
    const t = (travelP - 0.5) / 0.5;
    return midZoom + (destZoom - midZoom) * t;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, progress, transitionType, destZoom, activeIndex, memories]);

  // --- Milestone dimming ---
  const isDimmed = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Travel line ---
  const travelFrom = useMemo<[number, number] | null>(() => {
    if (phase !== 'transition') return null;
    if (transitionType === 'same-location' || transitionType === 'to-milestone') return null;
    if (transitionType === 'opening') return [ARC_APEX[0], ARC_APEX[1]];
    if (transitionType === 'from-milestone') {
      const prevIdx = lastLocatedIndex(memories, activeIndex);
      return memoryLngLat(memories, prevIdx);
    }
    return memoryLngLat(memories, activeIndex - 1);
  }, [phase, transitionType, activeIndex, memories]);

  const travelTo = useMemo<[number, number] | null>(() => {
    if (phase !== 'transition') return null;
    if (transitionType === 'same-location' || transitionType === 'to-milestone') return null;
    return memoryLngLat(memories, activeIndex);
  }, [phase, transitionType, activeIndex, memories]);

  const lineProgress = phase === 'transition' && progress >= 0.25 && progress <= 0.75
    ? (progress - 0.25) / 0.5
    : phase === 'transition' && progress > 0.75 ? 1 : 0;

  const lineFadeOut = phase === 'hold' ? Math.min(1, progress / 0.2) : 0;
  const travelVisible = phase === 'transition' && travelFrom !== null && travelTo !== null;
  const travelTransport = activeMemory?.transport?.[0] ?? null;

  // --- Location marker ---
  const markerCoords = useMemo<[number, number] | null>(() => {
    if (isOpening || isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, activeMemory, activeIndex, memories]);

  const markerPulse = phase === 'transition' && progress >= 0.75;

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

      <LocationMarker
        map={mapInstance}
        coordinates={markerCoords}
        pulse={markerPulse}
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
