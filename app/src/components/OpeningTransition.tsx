import { useEffect, useMemo, useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { generateArc, sliceLine } from '../utils/geo';
import { ORIGIN, ANCHOR } from '../data/story';

const SRC_ORIGIN = 'opening-trans-herent-src';
const LYR_ORIGIN = 'opening-trans-herent-lyr';
const SRC_ANCHOR = 'opening-trans-gent-src';
const LYR_ANCHOR = 'opening-trans-gent-lyr';

interface OpeningTransitionProps {
  map: maplibregl.Map | null;
  destination: [number, number]; // first memory coords [lng, lat]
  progress: number; // 0-1
  visible: boolean;
}

/**
 * Draws two converging arcs from Anchor and Origin toward the first memory
 * during the opening → memory 0 transition.
 */
export default function OpeningTransition({ map, destination, progress, visible }: OpeningTransitionProps) {
  const addedRef = useRef(false);

  const pathFromOrigin = useMemo(() => generateArc(ORIGIN, destination, 50, 0.03), [destination]);
  const pathFromAnchor = useMemo(() => generateArc(ANCHOR, destination, 50, 0.03), [destination]);

  const ensureLayers = useCallback(() => {
    if (!map || addedRef.current) return false;

    try {
      const emptyLine = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } };

      map.addSource(SRC_ORIGIN, { type: 'geojson', data: emptyLine });
      map.addLayer({
        id: LYR_ORIGIN, type: 'line', source: SRC_ORIGIN,
        paint: { 'line-color': '#e8836b', 'line-width': 3, 'line-opacity': 1 },
      });

      map.addSource(SRC_ANCHOR, { type: 'geojson', data: emptyLine });
      map.addLayer({
        id: LYR_ANCHOR, type: 'line', source: SRC_ANCHOR,
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
      const srcH = map!.getSource(SRC_ORIGIN) as maplibregl.GeoJSONSource | undefined;
      const srcG = map!.getSource(SRC_ANCHOR) as maplibregl.GeoJSONSource | undefined;
      if (!srcH || !srcG) return;

      const empty = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] as [number, number][] } };

      if (!visible || progress <= 0) {
        srcH.setData(empty);
        srcG.setData(empty);
        return;
      }

      srcH.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: sliceLine(pathFromOrigin, progress) } });
      srcG.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: sliceLine(pathFromAnchor, progress) } });
    }
  }, [map, pathFromOrigin, pathFromAnchor, progress, visible, ensureLayers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (map?.getLayer(LYR_ORIGIN)) map.removeLayer(LYR_ORIGIN);
        if (map?.getSource(SRC_ORIGIN)) map.removeSource(SRC_ORIGIN);
        if (map?.getLayer(LYR_ANCHOR)) map.removeLayer(LYR_ANCHOR);
        if (map?.getSource(SRC_ANCHOR)) map.removeSource(SRC_ANCHOR);
      } catch { /* noop */ }
      addedRef.current = false;
    };
  }, [map]);

  return null;
}
