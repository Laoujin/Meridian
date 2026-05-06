import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ORIGIN, ANCHOR } from '../data/story';
import { computeTargetCamera } from '../utils/camera';

interface MapCanvasProps {
  viewA: [number, number];
  viewB: [number, number];
  phase: 'hold' | 'transition';
  showOpeningLine?: boolean;
  dimmed?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
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

const INITIAL_CENTER: [number, number] = [(ORIGIN[0] + ANCHOR[0]) / 2, (ORIGIN[1] + ANCHOR[1]) / 2];

function MapCanvas({ viewA, viewB, phase, showOpeningLine, dimmed, onMapReady }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);

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

  // Camera: opening + hold only. Transitions are handled by EaseIn/EaseOutCamera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const h = containerRef.current?.clientHeight ?? 0;

    if (showOpeningLine) {
      map.fitBounds(
        [
          [ANCHOR[0] - 0.05, Math.min(ANCHOR[1], ORIGIN[1]) - 0.05],
          [ORIGIN[0] + 0.05, Math.max(ANCHOR[1], ORIGIN[1]) + 0.15],
        ],
        { padding: { top: Math.round(h * 0.72), bottom: 40, left: 40, right: 40 }, duration: 0 },
      );
      return;
    }

    // Only position camera during hold — transitions are owned by scenario components
    if (phase !== 'hold') return;

    const target = computeTargetCamera(map, viewA, viewB, h);
    if (target) {
      map.jumpTo({ center: target.center, zoom: target.zoom });
    }
  }, [viewA, viewB, phase, showOpeningLine]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
    />
  );
}

export default MapCanvas;
export { INITIAL_CENTER };
