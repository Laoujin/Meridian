import { useEffect, useMemo, useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { generateArc, sliceLine } from '../utils/geo';
import { HERENT, GENT } from './OpeningArc';

const SRC_HERENT = 'opening-trans-herent-src';
const LYR_HERENT = 'opening-trans-herent-lyr';
const SRC_GENT = 'opening-trans-gent-src';
const LYR_GENT = 'opening-trans-gent-lyr';

interface OpeningTransitionProps {
  map: maplibregl.Map | null;
  destination: [number, number]; // first memory coords [lng, lat]
  progress: number; // 0-1
  visible: boolean;
}

/**
 * Draws two converging arcs from Gent and Herent toward the first memory
 * during the opening → memory 0 transition.
 */
export default function OpeningTransition({ map, destination, progress, visible }: OpeningTransitionProps) {
  const addedRef = useRef(false);

  const pathFromHerent = useMemo(() => generateArc(HERENT, destination, 50, 0.03), [destination]);
  const pathFromGent = useMemo(() => generateArc(GENT, destination, 50, 0.03), [destination]);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return false;

    try {
      const emptyLine = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } };

      map.addSource(SRC_HERENT, { type: 'geojson', data: emptyLine });
      map.addLayer({
        id: LYR_HERENT, type: 'line', source: SRC_HERENT,
        paint: { 'line-color': '#e8836b', 'line-width': 3, 'line-opacity': 1 },
      });

      map.addSource(SRC_GENT, { type: 'geojson', data: emptyLine });
      map.addLayer({
        id: LYR_GENT, type: 'line', source: SRC_GENT,
        paint: { 'line-color': '#e8836b', 'line-width': 3, 'line-opacity': 1 },
      });

      addedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, [map]);

  // Update line geometry on progress change
  useEffect(() => {
    if (!map) return;
    if (!addedRef.current) {
      ensureLayers();
      if (!addedRef.current) {
        const retry = () => { ensureLayers(); updateLines(); };
        map.once('idle', retry);
        return () => { map.off('idle', retry); };
      }
    }
    updateLines();

    function updateLines() {
      const srcH = map!.getSource(SRC_HERENT) as maplibregl.GeoJSONSource | undefined;
      const srcG = map!.getSource(SRC_GENT) as maplibregl.GeoJSONSource | undefined;
      if (!srcH || !srcG) return;

      const empty = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } };

      if (!visible || progress <= 0) {
        srcH.setData(empty);
        srcG.setData(empty);
        return;
      }

      srcH.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: sliceLine(pathFromHerent, progress) } });
      srcG.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: sliceLine(pathFromGent, progress) } });
    }
  }, [map, pathFromHerent, pathFromGent, progress, visible, ensureLayers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (map?.getLayer(LYR_HERENT)) map.removeLayer(LYR_HERENT);
        if (map?.getSource(SRC_HERENT)) map.removeSource(SRC_HERENT);
        if (map?.getLayer(LYR_GENT)) map.removeLayer(LYR_GENT);
        if (map?.getSource(SRC_GENT)) map.removeSource(SRC_GENT);
      } catch { /* noop */ }
      addedRef.current = false;
    };
  }, [map]);

  return null;
}
