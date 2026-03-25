import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapCanvasProps {
  center: [number, number]; // [lng, lat]
  zoom: number;
}

// Simple raster tile style that works with any MapLibre version
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

export default function MapCanvas({ center, zoom }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [3.7174, 51.0543], // Start at Gent
      zoom: 12,
      attributionControl: false,
      interactive: false, // Disable all map interaction — scroll controls everything
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map position when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      center,
      zoom,
      duration: 800,
      easing: (t) => t * (2 - t), // ease-out quad
    });
  }, [center, zoom]);

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
