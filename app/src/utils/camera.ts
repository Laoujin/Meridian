import maplibregl from 'maplibre-gl';

export interface Camera {
  center: [number, number];
  zoom: number;
}

/** Compute the camera that frames two points in the bottom ~28% of the screen. */
export function computeTargetCamera(
  map: maplibregl.Map,
  pointA: [number, number],
  pointB: [number, number],
  containerHeight: number,
): Camera | null {
  return computeTargetCameraForPoints(map, [pointA, pointB], containerHeight);
}

/**
 * Like `computeTargetCamera` but accepts any number of points. Used by
 * transition cameras that must include three points (interpolated prior view
 * endpoints PLUS the line origin) to keep the line origin in frame throughout.
 */
export function computeTargetCameraForPoints(
  map: maplibregl.Map,
  points: [number, number][],
  containerHeight: number,
): Camera | null {
  if (points.length === 0) return null;
  const minSpread = 0.01;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngSpread = Math.max(maxLng - minLng, minSpread);
  const latSpread = Math.max(maxLat - minLat, minSpread);
  const cLng = (minLng + maxLng) / 2;
  const cLat = (minLat + maxLat) / 2;

  const bounds: [[number, number], [number, number]] = [
    [cLng - lngSpread / 2, cLat - latSpread / 2],
    [cLng + lngSpread / 2, cLat + latSpread / 2],
  ];

  const result = map.cameraForBounds(bounds, {
    padding: { top: Math.round(containerHeight * 0.72), bottom: 40, left: 40, right: 40 },
    maxZoom: 14,
  });

  if (!result?.center || result.zoom == null) return null;
  const c = result.center;
  const lng = 'lng' in c ? c.lng : (c as unknown as [number, number])[0];
  const lat = 'lat' in c ? c.lat : (c as unknown as [number, number])[1];
  return { center: [lng, lat], zoom: result.zoom };
}

/** Check if a point is visible in the current map viewport. */
export function isPointVisible(
  map: maplibregl.Map,
  point: [number, number],
  margin = 40,
): boolean {
  const px = map.project(point);
  const container = map.getContainer();
  const w = container.clientWidth;
  const h = container.clientHeight;
  return px.x >= margin && px.x <= w - margin && px.y >= margin && px.y <= h - margin;
}
