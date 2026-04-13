import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Herent and Gent coordinates
const HERENT = { lng: 4.6717, lat: 50.8985 };
const GENT = { lng: 3.7527, lat: 51.0597 }; // Sint-Amandsberg, Gentbruggestraat
// Midpoint between the two
const MIDPOINT = {
  lng: (HERENT.lng + GENT.lng) / 2,
  lat: (HERENT.lat + GENT.lat) / 2,
};

// Generate a smooth arc between two points
// The arc bows northward (higher lat)
function generateArc(
  start: { lng: number; lat: number },
  end: { lng: number; lat: number },
  segments: number = 50,
  bowAmount: number = 0.15
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lng = start.lng + (end.lng - start.lng) * t;
    const lat = start.lat + (end.lat - start.lat) * t;
    // Parabolic bow: max at t=0.5
    const bow = bowAmount * Math.sin(t * Math.PI);
    coords.push([lng, lat + bow]);
  }
  return coords;
}

const ARC_COORDS = generateArc(HERENT, GENT);
// The apex of the arc (midpoint, used to position the opening card on the map)
const ARC_APEX = ARC_COORDS[Math.floor(ARC_COORDS.length / 2)];

interface MapCanvasProps {
  viewA: [number, number]; // [lng, lat] - first point for fitBounds
  viewB: [number, number]; // [lng, lat] - second point for fitBounds
  phase: 'hold' | 'transition';
  progress: number;
  activeIndex: number;
  targetViewA?: [number, number]; // final viewA for transition's hold state
  targetViewB?: [number, number]; // final viewB for transition's hold state
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
    padding: { top: Math.round(containerHeight * 0.67), bottom: 40, left: 40, right: 40 },
    maxZoom: 14,
  });

  if (!result?.center || result.zoom == null) return null;
  const c = result.center;
  const lng = 'lng' in c ? c.lng : (c as unknown as [number, number])[0];
  const lat = 'lat' in c ? c.lat : (c as unknown as [number, number])[1];
  return { center: [lng, lat], zoom: result.zoom };
}

// Simple raster tile style
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      paint: {
        'raster-saturation': -0.5,
        'raster-brightness-min': 0.1,
        'raster-contrast': -0.2,
      },
    },
  ],
};

function MapCanvas({ viewA, viewB, phase, progress, activeIndex, targetViewA, targetViewB, showOpeningLine, dimmed, onMapReady, overviewLocations, showOverview }: MapCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const lineAddedRef = useRef(false);
    const overviewMarkersRef = useRef<maplibregl.Marker[]>([]);
    const onMapReadyRef = useRef(onMapReady);
    const showOpeningLineRef = useRef(showOpeningLine);
    const startCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
    const targetCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
    const prevTransitionKeyRef = useRef('');
    useEffect(() => {
      onMapReadyRef.current = onMapReady;
      showOpeningLineRef.current = showOpeningLine;
    });

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [ARC_APEX[0], ARC_APEX[1]],
        zoom: 9,
        attributionControl: false,
        interactive: false,
      });

      mapRef.current = map;
      // Expose for e2e testing
      (window as any).__mlMap = map;

      map.on('load', () => {
        onMapReadyRef.current?.(map);
        // Smooth arc line
        map.addSource('opening-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: ARC_COORDS,
            },
          },
        });

        map.addLayer({
          id: 'opening-line-layer',
          type: 'line',
          source: 'opening-line',
          paint: {
            'line-color': '#e60000',
            'line-width': 3,
            'line-opacity': showOpeningLineRef.current ? 1 : 0,
          },
        });

        // Dot markers at both ends
        map.addSource('dots', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [HERENT.lng, HERENT.lat] } },
              { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [GENT.lng, GENT.lat] } },
            ],
          },
        });

        map.addLayer({
          id: 'dots-layer',
          type: 'circle',
          source: 'dots',
          paint: {
            'circle-radius': 6,
            'circle-color': '#e8836b',
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 2,
            'circle-opacity': showOpeningLineRef.current ? 1 : 0,
            'circle-stroke-opacity': showOpeningLineRef.current ? 1 : 0,
          },
        });

        // Herent label
        map.addSource('label-herent', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { label: 'Herent' },
            geometry: { type: 'Point', coordinates: [HERENT.lng, HERENT.lat] },
          },
        });

        map.addLayer({
          id: 'label-herent-layer',
          type: 'symbol',
          source: 'label-herent',
          layout: {
            'text-field': '{label}',
            'text-size': 14,
            'text-offset': [0, 1.5],
            'text-font': ['Open Sans Regular'],
          },
          paint: {
            'text-color': '#666',
            'text-opacity': showOpeningLineRef.current ? 1 : 0,
          },
        });

        // Gent label
        map.addSource('label-gent', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { label: 'Gent' },
            geometry: { type: 'Point', coordinates: [GENT.lng, GENT.lat] },
          },
        });

        map.addLayer({
          id: 'label-gent-layer',
          type: 'symbol',
          source: 'label-gent',
          layout: {
            'text-field': '{label}',
            'text-size': 14,
            'text-offset': [0, 1.5],
            'text-font': ['Open Sans Regular'],
          },
          paint: {
            'text-color': '#666',
            'text-opacity': showOpeningLineRef.current ? 1 : 0,
          },
        });

        lineAddedRef.current = true;
      });

      return () => {
        map.remove();
        mapRef.current = null;
        lineAddedRef.current = false;
      };
    }, []);

    // Toggle opening line visibility
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !lineAddedRef.current) return;

      const opacity = showOpeningLine ? 1 : 0;

      try {
        map.setPaintProperty('opening-line-layer', 'line-opacity', opacity);
        map.setPaintProperty('label-herent-layer', 'text-opacity', opacity);
        map.setPaintProperty('label-gent-layer', 'text-opacity', opacity);
        map.setPaintProperty('dots-layer', 'circle-opacity', opacity);
        map.setPaintProperty('dots-layer', 'circle-stroke-opacity', opacity);
      } catch {
        // Layers may not exist yet
      }
    }, [showOpeningLine]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      container.style.transition = 'filter 300ms ease';
      container.style.filter = dimmed ? 'brightness(0.4) blur(8px)' : 'none';
    }, [dimmed]);



    useEffect(() => {
      const map = mapRef.current;
      if (!map || !showOverview || !overviewLocations?.length) {
        overviewMarkersRef.current.forEach(m => m.remove());
        overviewMarkersRef.current = [];
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      for (const [lng, lat] of overviewLocations) {
        bounds.extend([lng, lat]);
      }
      map.fitBounds(bounds, { padding: 60, duration: 1500 });

      overviewLocations.forEach(([lng, lat], i) => {
        const el = document.createElement('div');
        el.className = 'location-marker location-marker--pulse';
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s ease';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        setTimeout(() => {
          el.style.opacity = '1';
        }, i * 100);

        overviewMarkersRef.current.push(marker);
      });

      return () => {
        overviewMarkersRef.current.forEach(m => m.remove());
        overviewMarkersRef.current = [];
      };
    }, [showOverview, overviewLocations]);

    // Update map position — camera interpolation during transitions, direct jump during hold
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const h = containerRef.current?.clientHeight ?? 0;

      if (showOpeningLine) {
        map.fitBounds(
          [
            [GENT.lng - 0.05, Math.min(GENT.lat, HERENT.lat) - 0.05],
            [HERENT.lng + 0.05, Math.max(GENT.lat, HERENT.lat) + 0.2],
          ],
          { padding: 80, duration: 0 }
        );
        startCameraRef.current = null;
        return;
      }

      const transitionKey = `${activeIndex}-${phase}`;
      const isNewTransition = transitionKey !== prevTransitionKeyRef.current;
      prevTransitionKeyRef.current = transitionKey;

      if (phase === 'transition' && targetViewA && targetViewB) {
        // Travel transition: interpolate camera smoothly
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
        // Hold or non-travel transition: jump directly to target
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
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
        }}
      />
    );
}

export default MapCanvas;
export { MIDPOINT, GENT, ARC_APEX };
