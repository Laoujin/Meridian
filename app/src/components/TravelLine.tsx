import { useEffect, useRef, useMemo } from 'react';
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
  from: [number, number] | null; // [lng, lat]
  to: [number, number] | null;   // [lng, lat]
  progress: number; // 0-1, where the line should be drawn to
  transport: Transport | null;
  visible: boolean;
  /** 0-1 fade out progress during hold section (0 = fully visible, 1 = invisible) */
  fadeOutProgress: number;
}

export default function TravelLine({ map, from, to, progress, transport, visible, fadeOutProgress }: TravelLineProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const sourceAddedRef = useRef(false);

  // Generate the full line path
  const fullPath = useMemo<[number, number][]>(() => {
    if (!from || !to) return [];
    const dist = haversineDistance(from, to);
    if (dist > 100) {
      return generateArc(from, to, 50, 0.1);
    }
    // Straight line with intermediate points for smooth slicing
    const points: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      points.push(interpolateLine(from, to, i / 20));
    }
    return points;
  }, [from, to]);

  // Add/update the GeoJSON source and layer
  useEffect(() => {
    if (!map) return;

    const setupSource = () => {
      if (map.getSource(SOURCE_ID)) {
        sourceAddedRef.current = true;
        return;
      }

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
          'line-width': 2,
          'line-opacity': 1,
        },
      });

      sourceAddedRef.current = true;
    };

    if (map.isStyleLoaded()) {
      setupSource();
    } else {
      map.on('load', setupSource);
    }

    return () => {
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      sourceAddedRef.current = false;
    };
  }, [map]);

  // Update the line geometry based on progress
  useEffect(() => {
    if (!map || !sourceAddedRef.current || fullPath.length < 2) return;

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
    if (!source) return;

    if (!visible || progress <= 0) {
      source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      return;
    }

    const sliced = sliceLine(fullPath, progress);
    source.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: sliced },
    });

    // Apply fade-out opacity
    const opacity = Math.max(0, 1 - fadeOutProgress);
    try {
      map.setPaintProperty(LAYER_ID, 'line-opacity', opacity);
    } catch {
      // Layer might not exist yet
    }
  }, [map, fullPath, progress, visible, fadeOutProgress]);

  // Transport icon marker at the line tip
  useEffect(() => {
    if (!map) return;

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

    const marker = new maplibregl.Marker({ element: el });
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, transport]);

  // Position the transport marker at the line tip
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !map || !visible || fullPath.length < 2 || progress <= 0) {
      markerRef.current?.remove();
      return;
    }

    const sliced = sliceLine(fullPath, progress);
    const tip = sliced[sliced.length - 1];
    marker.setLngLat(tip).addTo(map);

    // Fade out with line
    const el = marker.getElement();
    el.style.opacity = `${Math.max(0, 1 - fadeOutProgress)}`;

    // Rotate icon towards direction of travel
    if (sliced.length >= 2) {
      const prev = sliced[sliced.length - 2];
      const angle = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]) * (180 / Math.PI);
      el.style.transform = `rotate(${-angle + 90}deg)`;
    }
  }, [map, fullPath, progress, visible, fadeOutProgress]);

  return null;
}
