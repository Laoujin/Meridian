import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { HERENT, GENT } from '../data/story';

function generateOpeningArc(
  start: [number, number],
  end: [number, number],
  segments = 50,
  bowAmount = 0.15,
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    const bow = bowAmount * Math.sin(t * Math.PI);
    coords.push([lng, lat + bow]);
  }
  return coords;
}

const ARC_COORDS = generateOpeningArc(HERENT, GENT);

interface OpeningArcProps {
  map: maplibregl.Map | null;
  visible: boolean;
}

/**
 * Renders the opening arc line between arcOrigin and home. Endpoint dots +
 * labels are drawn by <LocationMarker> instances in App.tsx. Parent gates this
 * on story.opening.arcOrigin being set.
 */
export default function OpeningArc({ map, visible }: OpeningArcProps) {
  const addedRef = useRef(false);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return;

    // If source already exists (HMR), just mark as added
    if (map.getSource('opening-line')) {
      addedRef.current = true;
      return;
    }

    try {
      map.addSource('opening-line', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ARC_COORDS } },
      });
      map.addLayer({
        id: 'opening-line-layer',
        type: 'line',
        source: 'opening-line',
        paint: { 'line-color': '#e60000', 'line-width': 3, 'line-opacity': 0 },
      });

      addedRef.current = true;
    } catch {
      addedRef.current = true; // source exists from HMR
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;
    ensureLayers();
    if (!addedRef.current) {
      const retry = () => ensureLayers();
      map.once('idle', retry);
      return () => { map.off('idle', retry); };
    }
  }, [map, ensureLayers]);

  useEffect(() => {
    if (!map) return;
    try {
      map.setPaintProperty('opening-line-layer', 'line-opacity', visible ? 1 : 0);
    } catch {
      // layer may not exist yet — that's fine, initial paint is opacity 0
    }
  }, [map, visible]);

  return null;
}
