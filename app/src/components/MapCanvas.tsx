import { useEffect, useRef } from 'react';
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
  center: [number, number]; // [lng, lat]
  zoom: number;
  showOpeningLine?: boolean;
  dimmed?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
  travelBounds?: [[number, number], [number, number]] | null;
  overviewLocations?: [number, number][];
  showOverview?: boolean;
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

function MapCanvas({ center, zoom, showOpeningLine, dimmed, onMapReady, travelBounds, overviewLocations, showOverview }: MapCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const lineAddedRef = useRef(false);
    const overviewMarkersRef = useRef<maplibregl.Marker[]>([]);
    const onMapReadyRef = useRef(onMapReady);
    const showOpeningLineRef = useRef(showOpeningLine);
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
      if (!map || !travelBounds) return;
      const [a, b] = travelBounds;
      map.fitBounds([a, b], { padding: 80, duration: 0 });
    }, [travelBounds]);

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

    // Update map position when props change
    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (showOpeningLine) {
        // For the opening, fit both cities in view
        map.fitBounds(
          [
            [GENT.lng - 0.05, Math.min(GENT.lat, HERENT.lat) - 0.05],
            [HERENT.lng + 0.05, Math.max(GENT.lat, HERENT.lat) + 0.2],
          ],
          { padding: 80, duration: 800 }
        );
      } else {
        map.easeTo({
          center,
          zoom,
          duration: 800,
          easing: (t) => t * (2 - t),
        });
      }
    }, [center, zoom, showOpeningLine]);

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
