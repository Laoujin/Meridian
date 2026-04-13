import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

export const HERENT: [number, number] = [4.6717, 50.8985];
export const GENT: [number, number] = [3.7527, 51.0597]; // Sint-Amandsberg

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
 * Renders the Gent-Herent arc, endpoint dots, and city labels.
 * Self-contained — toggle with `visible`.
 */
export default function OpeningArc({ map, visible }: OpeningArcProps) {
  const addedRef = useRef(false);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return;

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

      map.addSource('opening-dots', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: HERENT } },
            { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: GENT } },
          ],
        },
      });
      map.addLayer({
        id: 'opening-dots-layer',
        type: 'circle',
        source: 'opening-dots',
        paint: {
          'circle-radius': 6,
          'circle-color': '#e8836b',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
          'circle-opacity': 0,
          'circle-stroke-opacity': 0,
        },
      });

      map.addSource('label-herent', {
        type: 'geojson',
        data: { type: 'Feature', properties: { label: 'Herent' }, geometry: { type: 'Point', coordinates: HERENT } },
      });
      map.addLayer({
        id: 'label-herent-layer',
        type: 'symbol',
        source: 'label-herent',
        layout: { 'text-field': '{label}', 'text-size': 14, 'text-offset': [0, 1.5], 'text-font': ['Open Sans Regular'] },
        paint: { 'text-color': '#666', 'text-opacity': 0 },
      });

      map.addSource('label-gent', {
        type: 'geojson',
        data: { type: 'Feature', properties: { label: 'Gent' }, geometry: { type: 'Point', coordinates: GENT } },
      });
      map.addLayer({
        id: 'label-gent-layer',
        type: 'symbol',
        source: 'label-gent',
        layout: { 'text-field': '{label}', 'text-size': 14, 'text-offset': [0, 1.5], 'text-font': ['Open Sans Regular'] },
        paint: { 'text-color': '#666', 'text-opacity': 0 },
      });

      addedRef.current = true;
    } catch {
      // layers may already exist from HMR
    }
  }, [map]);

  // Setup layers on map load or idle
  useEffect(() => {
    if (!map) return;
    ensureLayers();
    if (!addedRef.current) {
      const retry = () => ensureLayers();
      map.once('idle', retry);
      return () => { map.off('idle', retry); };
    }
  }, [map, ensureLayers]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !addedRef.current) return;
    const opacity = visible ? 1 : 0;
    try {
      map.setPaintProperty('opening-line-layer', 'line-opacity', opacity);
      map.setPaintProperty('opening-dots-layer', 'circle-opacity', opacity);
      map.setPaintProperty('opening-dots-layer', 'circle-stroke-opacity', opacity);
      map.setPaintProperty('label-herent-layer', 'text-opacity', opacity);
      map.setPaintProperty('label-gent-layer', 'text-opacity', opacity);
    } catch {
      // noop
    }
  }, [map, visible]);

  return null;
}
