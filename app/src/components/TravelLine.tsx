import { useEffect, useMemo, useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { haversineDistance, generateArc, sliceLine } from '../utils/geo';
import { transportSvg } from '../utils/transport-svg';
import type { TransportMode } from '../types/memory';

const SOURCE_ID = 'travel-line-source';
const LAYER_ID = 'travel-line-layer';

interface TravelLineProps {
  map: maplibregl.Map | null;
  from: [number, number] | null;
  to: [number, number] | null;
  progress: number;
  visible: boolean;
  fadeOutProgress: number;
  transport?: TransportMode;
}

// Bearing in screen-degrees from `a` to `b` (0 = north/up). Uses cartesian
// lng/lat which matches the line's visual direction on the projected map.
function bearing(a: [number, number], b: [number, number]): number {
  const dLng = b[0] - a[0];
  const dLat = b[1] - a[1];
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

export default function TravelLine({
  map,
  from,
  to,
  progress,
  visible,
  fadeOutProgress,
  transport = 'car',
}: TravelLineProps) {

  const fullPath = useMemo<[number, number][]>(() => {
    if (!from || !to) return [];
    const dist = haversineDistance(from, to);
    const bow = dist > 100 ? 0.1 : 0.005 + (dist / 100) * 0.02;
    return generateArc(from, to, 50, bow);
  }, [from, to]);

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

  // Marker that rides the tip of the line, oriented to bearing.
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const iconElRef = useRef<HTMLDivElement | null>(null);

  // (Re)create the marker element when transport mode changes (or map mounts).
  useEffect(() => {
    if (!map) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'travel-line-marker';
    wrapper.style.cssText = 'width:30px;height:30px;pointer-events:none;will-change:transform,opacity;';

    const inner = document.createElement('div');
    inner.style.cssText = 'width:100%;height:100%;transform-origin:50% 50%;';
    inner.innerHTML = transportSvg(transport);
    const svg = inner.querySelector('svg') as SVGElement | null;
    if (svg) { svg.setAttribute('width', '30'); svg.setAttribute('height', '30'); }

    wrapper.appendChild(inner);
    iconElRef.current = inner;

    const marker = new maplibregl.Marker({ element: wrapper, rotationAlignment: 'map' })
      .setLngLat([0, 0])
      .addTo(map);
    // Hide until we have a real position
    wrapper.style.opacity = '0';
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
      iconElRef.current = null;
    };
  }, [map, transport]);

  useEffect(() => {
    if (!map) return;
    if (!ensureSource()) return;

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const marker = markerRef.current;
    const iconEl = iconElRef.current;

    if (!visible || progress <= 0 || fullPath.length < 2) {
      source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      if (marker && iconEl) {
        const wrapper = marker.getElement() as HTMLElement;
        wrapper.style.opacity = '0';
      }
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

    if (marker && iconEl && sliced.length >= 2) {
      const tip = sliced[sliced.length - 1];
      const prev = sliced[sliced.length - 2];
      const deg = bearing(prev, tip);
      marker.setLngLat(tip);
      iconEl.style.transform = `rotate(${deg}deg)`;
      const wrapper = marker.getElement() as HTMLElement;
      wrapper.style.opacity = String(opacity);
    }
  }, [map, fullPath, progress, visible, fadeOutProgress, ensureSource]);

  useEffect(() => {
    return () => {
      if (map?.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map?.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map]);

  return null;
}
