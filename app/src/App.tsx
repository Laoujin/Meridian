import { useMemo, useState, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { loadMemories, getLocation } from './data/loader';
import { useScrollTimeline } from './hooks/useScrollTimeline';
import { interpolateLine } from './utils/geo';
import MapCanvas from './components/MapCanvas';
import OpeningArc, { HERENT, GENT } from './components/OpeningArc';
import OpeningTransition from './components/OpeningTransition';
import TimelineStrip from './components/TimelineStrip';
import CardOverlay from './components/CardOverlay';
import TravelLine from './components/TravelLine';
import LocationMarker from './components/LocationMarker';
import MilestoneEffect from './components/MilestoneEffect';
import ClosingSequence from './components/ClosingSequence';
import DetailOverlay from './components/DetailOverlay';
import './styles/global.css';

function memoryLngLat(memories: ReturnType<typeof loadMemories>, index: number): [number, number] {
  if (index < 0 || index >= memories.length) return HERENT; // fallback
  const loc = getLocation(memories[index]);
  return [loc.lng, loc.lat];
}

/**
 * Get the origin of the line shown during hold at memory index i.
 * For i=0: first memory has no "previous" line origin (opening transition handles it).
 * For i>0: location of the previous located memory (skipping milestones).
 */
function lineOriginAt(memories: ReturnType<typeof loadMemories>, i: number): [number, number] {
  if (i <= 0) return memoryLngLat(memories, 0); // memory 0 has no regular origin
  for (let j = i - 1; j >= 0; j--) {
    if (memories[j].type !== 'milestone') return memoryLngLat(memories, j);
  }
  return memoryLngLat(memories, 0);
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
    return lineOriginAt(memories, activeIndex);
  }, [isOpening, isOpeningTransition, isClosing, activeMemory, activeIndex, memories]);

  const travelTo = useMemo<[number, number] | null>(() => {
    if (isOpening || isOpeningTransition) return null;
    if (isClosing) return null;
    if (activeMemory?.type === 'milestone') return null;
    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isOpeningTransition, isClosing, activeMemory, activeIndex, memories]);

  const lineProgress = isTravelTransition ? progress : (travelFrom ? 1 : 0);
  const travelVisible = travelFrom !== null && travelTo !== null;

  // --- Map view (two points for fitBounds) ---
  const viewA = useMemo<[number, number]>(() => {
    if (isOpening) return HERENT;
    if (isClosing) return memoryLngLat(memories, memories.length - 1);

    if (isOpeningTransition) {
      // Interpolate from opening view (Gent-Herent area) toward first memory
      return interpolateLine(GENT, memoryLngLat(memories, 0), progress);
    }

    if (isTravelTransition) {
      const prevViewA = lineOriginAt(memories, activeIndex - 1);
      const nextViewA = lineOriginAt(memories, activeIndex);
      return interpolateLine(prevViewA, nextViewA, progress);
    }

    // Hold at memory 0: use Gent as viewA so Gent, Herent and Zaventem are all visible
    if (activeIndex === 0) return GENT;


    return lineOriginAt(memories, activeIndex);
  }, [isOpening, isClosing, isOpeningTransition, isTravelTransition, activeIndex, memories, progress]);

  const viewB = useMemo<[number, number]>(() => {
    if (isOpening) return HERENT;
    if (isClosing) return memoryLngLat(memories, memories.length - 1);

    if (isOpeningTransition) {
      return interpolateLine(HERENT, HERENT, progress); // stays at Herent during transition
    }

    // Hold at memory 0: use Herent as viewB to match the target camera
    if (activeIndex === 0) return HERENT;

    if (isTravelTransition) {
      const prevViewB = memoryLngLat(memories, activeIndex - 1);
      const nextViewB = memoryLngLat(memories, activeIndex);
      return interpolateLine(prevViewB, nextViewB, progress);
    }

    return memoryLngLat(memories, activeIndex);
  }, [isOpening, isClosing, isOpeningTransition, isTravelTransition, activeIndex, memories, progress]);

  // Target bounds for camera interpolation during travel transitions
  // For the opening transition and hold0, the camera must frame Gent, Herent AND Zaventem.
  // Gent is the westernmost, Herent is the easternmost.
  const targetViewA = useMemo<[number, number] | undefined>(() => {
    if (isOpeningTransition) return GENT;
    if (!isTravelTransition) return undefined;
    return lineOriginAt(memories, activeIndex);
  }, [isOpeningTransition, isTravelTransition, activeIndex, memories]);

  const targetViewB = useMemo<[number, number] | undefined>(() => {
    if (isOpeningTransition) return HERENT;
    if (!isTravelTransition) return undefined;
    return memoryLngLat(memories, activeIndex);
  }, [isOpeningTransition, isTravelTransition, activeIndex, memories]);

  // Expose viewA/viewB for e2e testing
  useEffect(() => {
    (window as any).__viewState = { viewA, viewB, travelFrom, travelTo, lineProgress };
  }, [viewA, viewB, travelFrom, travelTo, lineProgress]);

  // --- Milestone dimming ---
  const isDimmed = phase === 'hold' && activeMemory?.type === 'milestone';

  // --- Location markers ---
  const originCoords = travelFrom;
  const destCoords = travelTo;
  const destPulse = true;

  // For opening transition, show the destination dot at memory 0
  const openingDestCoords = isOpeningTransition ? memoryLngLat(memories, 0) : null;

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
        phase={phase}
        progress={progress}
        activeIndex={activeIndex}
        targetViewA={targetViewA}
        targetViewB={targetViewB}
        showOpeningLine={isOpening}
        dimmed={isDimmed}
        onMapReady={handleMapReady}
        overviewLocations={allLocations}
        showOverview={isClosing && transitionType === 'closing-overview'}
      />

      <OpeningArc map={mapInstance} visible={isOpening} />

      {(isOpeningTransition || (activeIndex === 0 && phase === 'hold')) && (
        <OpeningTransition
          map={mapInstance}
          destination={memoryLngLat(memories, 0)}
          progress={isOpeningTransition ? progress : 1}
          visible
        />
      )}

      {/* Destination dot during opening transition */}
      <LocationMarker map={mapInstance} coordinates={openingDestCoords} pulse />

      <TravelLine
        map={mapInstance}
        from={travelFrom}
        to={travelTo}
        progress={lineProgress}
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
