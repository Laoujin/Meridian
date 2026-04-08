import { useEffect, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { haversineDistance, generateArc, sliceLine, interpolateLine } from '../utils/geo';

const SOURCE_ID = 'travel-line-source';
const LAYER_ID = 'travel-line-layer';

interface TravelLineProps {
  map: maplibregl.Map | null;
  from: [number, number] | null;
  to: [number, number] | null;
  progress: number;
  visible: boolean;
  fadeOutProgress: number;
}

export default function TravelLine({ map, from, to, progress, visible, fadeOutProgress }: TravelLineProps) {

  const fullPath = useMemo<[number, number][]>(() => {
    if (!from || !to) return [];
    const dist = haversineDistance(from, to);
    if (dist > 100) {
      return generateArc(from, to, 50, 0.1);
    }
    const points: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      points.push(interpolateLine(from, to, i / 20));
    }
    return points;
  }, [from, to]);

  // Ensure source+layer exist on the map, return true if ready
  const ensureSource = useCallback(() => {
    if (!map) return false;
    if (map.getSource(SOURCE_ID)) return true;
    if (!map.isStyleLoaded()) return false;

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
    });

    map.addLayer({
      id: LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#e8836b',
        'line-width': 3,
        'line-opacity': 1,
      },
    });

    return true;
  }, [map]);

  // Update line geometry and marker on every progress change
  useEffect(() => {
    if (!map) return;
    if (!ensureSource()) return;

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!visible || progress <= 0 || fullPath.length < 2) {
      source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      return;
    }

    const sliced = sliceLine(fullPath, progress);
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: sliced },
    });

    const opacity = Math.max(0, 1 - fadeOutProgress);
    try {
      map.setPaintProperty(LAYER_ID, 'line-opacity', opacity);
    } catch {
      // noop
    }
  }, [map, fullPath, progress, visible, fadeOutProgress, ensureSource]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map?.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map?.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  return null;
}
