import { useEffect, useRef, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { Transport } from '../types/memory';
import { haversineDistance, generateArc, sliceLine, interpolateLine } from '../utils/geo';

const TRANSPORT_ICONS: Record<string, string> = {
  car: '\u{1F697}',
  plane: '\u{2708}\u{FE0F}',
  train: '\u{1F686}',
  bus: '\u{1F68C}',
  boat: '\u{26F5}',
  walk: '\u{1F6B6}',
  bike: '\u{1F6B2}',
};

const SOURCE_ID = 'travel-line-source';
const LAYER_ID = 'travel-line-layer';

interface TravelLineProps {
  map: maplibregl.Map | null;
  from: [number, number] | null;
  to: [number, number] | null;
  progress: number;
  transport: Transport | null;
  visible: boolean;
  fadeOutProgress: number;
}

export default function TravelLine({ map, from, to, progress, transport, visible, fadeOutProgress }: TravelLineProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

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
      markerRef.current?.remove();
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

    // Transport marker at the tip
    const tip = sliced[sliced.length - 1];

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.style.fontSize = '20px';
      el.style.lineHeight = '1';

      const iconText = transport?.mode ? TRANSPORT_ICONS[transport.mode] : null;
      if (iconText) {
        el.textContent = iconText;
      } else {
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.background = '#e8836b';
        el.style.borderRadius = '50%';
      }

      markerRef.current = new maplibregl.Marker({ element: el });
    }

    markerRef.current.setLngLat(tip).addTo(map);
    const el = markerRef.current.getElement();
    el.style.opacity = `${opacity}`;

    if (sliced.length >= 2) {
      const prev = sliced[sliced.length - 2];
      const angle = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]) * (180 / Math.PI);
      el.style.transform = `rotate(${-angle + 90}deg)`;
    }
  }, [map, fullPath, progress, visible, fadeOutProgress, transport, ensureSource]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      if (map?.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map?.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  return null;
}
