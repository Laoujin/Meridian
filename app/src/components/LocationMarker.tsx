import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

interface LocationMarkerProps {
  map: maplibregl.Map | null;
  coordinates: [number, number] | null; // [lng, lat]
  pulse: boolean;
}

let idCounter = 0;

export default function LocationMarker({ map, coordinates }: LocationMarkerProps) {
  const idsRef = useRef({ source: `loc-marker-src-${idCounter}`, layer: `loc-marker-layer-${idCounter++}` });
  const addedRef = useRef(false);

  const ensureLayer = useCallback((): boolean => {
    if (!map || addedRef.current) return addedRef.current;
    const { source, layer } = idsRef.current;

    if (map.getSource(source)) {
      addedRef.current = true;
      return true;
    }

    try {
      map.addSource(source, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: layer,
        type: 'circle',
        source,
        paint: {
          'circle-radius': 6,
          'circle-color': '#e8836b',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });
      addedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, [map]);

  const setCoords = useCallback((coords: [number, number] | null) => {
    if (!ensureLayer()) return;
    const src = map!.getSource(idsRef.current.source) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    src.setData(coords
      ? { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords } }] }
      : { type: 'FeatureCollection', features: [] }
    );
  }, [ensureLayer, map]);

  // Try on idle (fires after style is fully applied) and on coordinate changes
  useEffect(() => {
    if (!map) return;

    setCoords(coordinates);

    // If layer wasn't added yet, retry on idle
    if (!addedRef.current) {
      const onIdle = () => setCoords(coordinates);
      map.once('idle', onIdle);
      return () => { map.off('idle', onIdle); };
    }
  }, [map, coordinates, setCoords]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const { source, layer } = idsRef.current;
      try {
        if (map?.getLayer(layer)) map.removeLayer(layer);
        if (map?.getSource(source)) map.removeSource(source);
      } catch {
        // map may already be removed
      }
      addedRef.current = false;
    };
  }, [map]);

  return null;
}
