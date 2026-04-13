import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';

interface LocationMarkerProps {
  map: maplibregl.Map | null;
  coordinates: [number, number] | null; // [lng, lat]
  label?: string;
  opacity?: number;
  pulse?: boolean;
}

let idCounter = 0;

export default function LocationMarker({ map, coordinates, label, opacity = 1 }: LocationMarkerProps) {
  const idsRef = useRef({
    source: `loc-marker-src-${idCounter}`,
    dotLayer: `loc-marker-dot-${idCounter}`,
    labelLayer: `loc-marker-label-${idCounter++}`,
  });
  const addedRef = useRef(false);

  const ensureLayers = useCallback((): boolean => {
    if (!map || addedRef.current) return addedRef.current;
    const { source, dotLayer, labelLayer } = idsRef.current;

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
        id: dotLayer,
        type: 'circle',
        source,
        paint: {
          'circle-radius': 6,
          'circle-color': '#e8836b',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: labelLayer,
        type: 'symbol',
        source,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 14,
          'text-offset': [0, 1.5],
          'text-font': ['Open Sans Regular'],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#666',
          'text-halo-color': '#fff',
          'text-halo-width': 1.5,
        },
      });
      addedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, [map]);

  const setData = useCallback((coords: [number, number] | null, lbl: string | undefined) => {
    if (!ensureLayers()) return;
    const src = map!.getSource(idsRef.current.source) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    src.setData(
      coords
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: { label: lbl ?? '' },
                geometry: { type: 'Point', coordinates: coords },
              },
            ],
          }
        : { type: 'FeatureCollection', features: [] }
    );
  }, [ensureLayers, map]);

  // Apply data changes
  useEffect(() => {
    if (!map) return;

    setData(coordinates, label);

    if (!addedRef.current) {
      const onIdle = () => setData(coordinates, label);
      map.once('idle', onIdle);
      return () => { map.off('idle', onIdle); };
    }
  }, [map, coordinates, label, setData]);

  // Apply opacity
  useEffect(() => {
    if (!map || !addedRef.current) return;
    const { dotLayer, labelLayer } = idsRef.current;
    try {
      map.setPaintProperty(dotLayer, 'circle-opacity', opacity);
      map.setPaintProperty(dotLayer, 'circle-stroke-opacity', opacity);
      map.setPaintProperty(labelLayer, 'text-opacity', opacity);
    } catch {
      // noop — layers not yet attached
    }
  }, [map, opacity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const { source, dotLayer, labelLayer } = idsRef.current;
      try {
        if (map?.getLayer(labelLayer)) map.removeLayer(labelLayer);
        if (map?.getLayer(dotLayer)) map.removeLayer(dotLayer);
        if (map?.getSource(source)) map.removeSource(source);
      } catch {
        // map may already be removed
      }
      addedRef.current = false;
    };
  }, [map]);

  return null;
}
