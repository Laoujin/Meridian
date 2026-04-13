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
  const minSpread = 0.01;
  const lngs = [pointA[0], pointB[0]];
  const lats = [pointA[1], pointB[1]];
  const lngSpread = Math.max(Math.abs(lngs[1] - lngs[0]), minSpread);
  const latSpread = Math.max(Math.abs(lats[1] - lats[0]), minSpread);
  const cLng = (lngs[0] + lngs[1]) / 2;
  const cLat = (lats[0] + lats[1]) / 2;

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
