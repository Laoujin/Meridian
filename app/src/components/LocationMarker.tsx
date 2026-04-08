import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface LocationMarkerProps {
  map: maplibregl.Map | null;
  coordinates: [number, number] | null; // [lng, lat]
  pulse: boolean;
}

export default function LocationMarker({ map, coordinates, pulse }: LocationMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    const el = document.createElement('div');
    el.className = 'location-marker';
    elRef.current = el;

    const marker = new maplibregl.Marker({ element: el });
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
      elRef.current = null;
    };
  }, [map]);

  // Update position
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !map || !coordinates) {
      markerRef.current?.remove();
      return;
    }
    marker.setLngLat(coordinates).addTo(map);
  }, [map, coordinates]);

  // Toggle pulse class
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (pulse) {
      el.classList.add('location-marker--pulse');
    } else {
      el.classList.remove('location-marker--pulse');
    }
  }, [pulse]);

  return null; // Renders via Maplibre markers, not React DOM
}
