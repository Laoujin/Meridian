import { useEffect, useMemo, useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { generateArc, sliceLine } from '../utils/geo';
import { ORIGIN, ANCHOR } from '../data/story';
import { transportSvg } from '../utils/transport-svg';
import type { TransportMode } from '../types/memory';

const SRC_ORIGIN = 'opening-trans-origin-src';
const LYR_ORIGIN = 'opening-trans-origin-lyr';
const SRC_ANCHOR = 'opening-trans-anchor-src';
const LYR_ANCHOR = 'opening-trans-anchor-lyr';

interface OpeningTransitionProps {
  map: maplibregl.Map | null;
  destination: [number, number]; // first memory coords [lng, lat]
  progress: number; // 0-1
  visible: boolean;
  // Mode for the arcOrigin → memory 0 arc (the journal-keeper's mode,
  // typically memories[0].transport).
  originTransport?: TransportMode;
  // When set, also draws an anchor → memory 0 arc with this mode (the
  // other person, e.g. her car vs his train). When unset, only the origin
  // arc is drawn (NY-trip case: single line Paris → JFK).
  anchorTransport?: TransportMode;
  // Vehicles only animate during the actual transition. At memory 0 hold,
  // the lines + dots persist but the vehicles are hidden (otherwise it
  // looks like a plane is "parked" on top of the destination dot).
  showMarkers?: boolean;
}

// Bearing in screen-degrees from `a` to `b` (0 = north/up). Mirrors TravelLine.
function bearing(a: [number, number], b: [number, number]): number {
  const dLng = b[0] - a[0];
  const dLat = b[1] - a[1];
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function hideMarker(marker: maplibregl.Marker | null) {
  if (!marker) return;
  const wrapper = marker.getElement() as HTMLElement;
  wrapper.style.opacity = '0';
  wrapper.style.display = 'none';
}

function placeMarker(
  marker: maplibregl.Marker | null,
  iconEl: HTMLDivElement | null,
  sliced: [number, number][],
) {
  if (!marker || !iconEl) return;
  if (sliced.length < 2) { hideMarker(marker); return; }
  const tip = sliced[sliced.length - 1];
  const prev = sliced[sliced.length - 2];
  const deg = bearing(prev, tip);
  marker.setLngLat(tip);
  iconEl.style.transform = `rotate(${deg}deg)`;
  const wrapper = marker.getElement() as HTMLElement;
  wrapper.style.display = '';
  wrapper.style.opacity = '1';
}

/**
 * Draws the opening-arc lines from arcOrigin (and optionally anchor)
 * toward memory 0. Each arc carries a vehicle marker at its tip during
 * the transition, matching how regular TravelLine renders.
 */
export default function OpeningTransition({
  map,
  destination,
  progress,
  visible,
  originTransport = 'car',
  anchorTransport,
  showMarkers = true,
}: OpeningTransitionProps) {
  const addedRef = useRef(false);

  const pathFromOrigin = useMemo(() => generateArc(ORIGIN, destination, 50, 0.03), [destination]);
  const pathFromAnchor = useMemo(() => generateArc(ANCHOR, destination, 50, 0.03), [destination]);

  // One marker per arc, oriented to its own tip. Anchor marker only exists
  // when anchorTransport is set (otherwise the second arc isn't drawn).
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const originIconRef = useRef<HTMLDivElement | null>(null);
  const anchorMarkerRef = useRef<maplibregl.Marker | null>(null);
  const anchorIconRef = useRef<HTMLDivElement | null>(null);

  // (Re)create markers when transport(s) change.
  useEffect(() => {
    if (!map) return;

    const create = (mode: TransportMode) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'opening-transition-marker';
      // display:none + opacity:0 from the start so the (0,0) mount position
      // never leaks a frame; the update effect re-shows when there's a real tip.
      wrapper.style.cssText = 'width:30px;height:30px;pointer-events:none;will-change:transform,opacity;opacity:0;display:none;';
      const inner = document.createElement('div');
      inner.style.cssText = 'width:100%;height:100%;transform-origin:50% 50%;';
      inner.innerHTML = transportSvg(mode);
      const svg = inner.querySelector('svg') as SVGElement | null;
      if (svg) { svg.setAttribute('width', '30'); svg.setAttribute('height', '30'); }
      wrapper.appendChild(inner);
      const marker = new maplibregl.Marker({ element: wrapper, rotationAlignment: 'map' })
        .setLngLat([0, 0])
        .addTo(map);
      return { marker, inner };
    };

    const o = create(originTransport);
    originMarkerRef.current = o.marker;
    originIconRef.current = o.inner;

    let aRef: { marker: maplibregl.Marker; inner: HTMLDivElement } | null = null;
    if (anchorTransport) {
      aRef = create(anchorTransport);
      anchorMarkerRef.current = aRef.marker;
      anchorIconRef.current = aRef.inner;
    }

    return () => {
      o.marker.remove();
      aRef?.marker.remove();
      originMarkerRef.current = null;
      originIconRef.current = null;
      anchorMarkerRef.current = null;
      anchorIconRef.current = null;
    };
  }, [map, originTransport, anchorTransport]);

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

  // Update line geometry + marker positions on progress change
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
        hideMarker(originMarkerRef.current);
        hideMarker(anchorMarkerRef.current);
        return;
      }

      const slicedOrigin = sliceLine(pathFromOrigin, progress);
      srcH.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: slicedOrigin } });
      if (showMarkers) {
        placeMarker(originMarkerRef.current, originIconRef.current, slicedOrigin);
      } else {
        hideMarker(originMarkerRef.current);
      }

      if (anchorTransport) {
        const slicedAnchor = sliceLine(pathFromAnchor, progress);
        srcG.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: slicedAnchor } });
        if (showMarkers) {
          placeMarker(anchorMarkerRef.current, anchorIconRef.current, slicedAnchor);
        } else {
          hideMarker(anchorMarkerRef.current);
        }
      } else {
        srcG.setData(empty);
        hideMarker(anchorMarkerRef.current);
      }
    }
  }, [map, pathFromOrigin, pathFromAnchor, progress, visible, anchorTransport, showMarkers, ensureLayers]);

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
