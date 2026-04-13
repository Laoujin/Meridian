import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HERENT, GENT } from './OpeningArc';

interface MapCanvasProps {
  viewA: [number, number];
  viewB: [number, number];
  phase: 'hold' | 'transition';
  progress: number;
  activeIndex: number;
  targetViewA?: [number, number];
  targetViewB?: [number, number];
  showOpeningLine?: boolean;
  dimmed?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
  overviewLocations?: [number, number][];
  showOverview?: boolean;
}

function computeTargetCamera(
  map: maplibregl.Map,
  viewA: [number, number],
  viewB: [number, number],
  containerHeight: number,
): { center: [number, number]; zoom: number } | null {
  const minSpread = 0.01;
  const lngs = [viewA[0], viewB[0]];
  const lats = [viewA[1], viewB[1]];
  const lngSpread = Math.max(Math.abs(lngs[1] - lngs[0]), minSpread);
  const latSpread = Math.max(Math.abs(lats[1] - lats[0]), minSpread);
  const cLng = (lngs[0] + lngs[1]) / 2;
  const cLat = (lats[0] + lats[1]) / 2;

  const bounds: [[number, number], [number, number]] = [
    [cLng - lngSpread / 2, cLat - latSpread / 2],
    [cLng + lngSpread / 2, cLat + latSpread / 2],
  ];

  const result = map.cameraForBounds(bounds, {
    padding: { top: Math.round(containerHeight * 0.72), bottom: 40, left: 40, right: 40 },
    maxZoom: 14,
  });

  if (!result?.center || result.zoom == null) return null;
  const c = result.center;
  const lng = 'lng' in c ? c.lng : (c as unknown as [number, number])[0];
  const lat = 'lat' in c ? c.lat : (c as unknown as [number, number])[1];
  return { center: [lng, lat], zoom: result.zoom };
}

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{
    id: 'osm-tiles',
    type: 'raster',
    source: 'osm-tiles',
    paint: { 'raster-saturation': -0.5, 'raster-brightness-min': 0.1, 'raster-contrast': -0.2 },
  }],
};

// Initial center: midpoint of Herent-Gent
const INITIAL_CENTER: [number, number] = [(HERENT[0] + GENT[0]) / 2, (HERENT[1] + GENT[1]) / 2];

function MapCanvas({ viewA, viewB, phase, progress, activeIndex, targetViewA, targetViewB, showOpeningLine, dimmed, onMapReady, overviewLocations, showOverview }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overviewMarkersRef = useRef<maplibregl.Marker[]>([]);
  const onMapReadyRef = useRef(onMapReady);
  const startCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const targetCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const prevTransitionKeyRef = useRef('');

  useEffect(() => { onMapReadyRef.current = onMapReady; });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: INITIAL_CENTER,
      zoom: 9,
      attributionControl: false,
      interactive: false,
    });

    mapRef.current = map;
    (window as any).__mlMap = map;

    map.on('load', () => {
      onMapReadyRef.current?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Dimming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.transition = 'filter 300ms ease';
    container.style.filter = dimmed ? 'brightness(0.4) blur(8px)' : 'none';
  }, [dimmed]);

  // Closing overview
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showOverview || !overviewLocations?.length) {
      overviewMarkersRef.current.forEach(m => m.remove());
      overviewMarkersRef.current = [];
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const [lng, lat] of overviewLocations) bounds.extend([lng, lat]);
    map.fitBounds(bounds, { padding: 60, duration: 1500 });

    overviewLocations.forEach(([lng, lat], i) => {
      const el = document.createElement('div');
      el.className = 'location-marker location-marker--pulse';
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s ease';
      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      setTimeout(() => { el.style.opacity = '1'; }, i * 100);
      overviewMarkersRef.current.push(marker);
    });

    return () => {
      overviewMarkersRef.current.forEach(m => m.remove());
      overviewMarkersRef.current = [];
    };
  }, [showOverview, overviewLocations]);

  // Camera positioning
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const h = containerRef.current?.clientHeight ?? 0;

    if (showOpeningLine) {
      map.fitBounds(
        [
          [GENT[0] - 0.05, Math.min(GENT[1], HERENT[1]) - 0.05],
          [HERENT[0] + 0.05, Math.max(GENT[1], HERENT[1]) + 0.15],
        ],
        { padding: { top: Math.round(h * 0.72), bottom: 40, left: 40, right: 40 }, duration: 0 },
      );
      startCameraRef.current = null;
      return;
    }

    const transitionKey = `${activeIndex}-${phase}`;
    const isNewTransition = transitionKey !== prevTransitionKeyRef.current;
    prevTransitionKeyRef.current = transitionKey;

    if (phase === 'transition' && targetViewA && targetViewB) {
      if (isNewTransition) {
        const center = map.getCenter();
        startCameraRef.current = { center: [center.lng, center.lat], zoom: map.getZoom() };
        targetCameraRef.current = computeTargetCamera(map, targetViewA, targetViewB, h);
      }

      const start = startCameraRef.current;
      const target = targetCameraRef.current;
      if (start && target) {
        const p = progress;
        const lng = start.center[0] + (target.center[0] - start.center[0]) * p;
        const lat = start.center[1] + (target.center[1] - start.center[1]) * p;
        const zoom = start.zoom + (target.zoom - start.zoom) * p;
        map.jumpTo({ center: [lng, lat], zoom });
      }
    } else {
      const target = computeTargetCamera(map, viewA, viewB, h);
      if (target) {
        map.jumpTo({ center: target.center, zoom: target.zoom });
      }
      startCameraRef.current = null;
      targetCameraRef.current = null;
    }
  }, [viewA, viewB, targetViewA, targetViewB, phase, progress, activeIndex, showOpeningLine]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
    />
  );
}

export default MapCanvas;
export { INITIAL_CENTER };
