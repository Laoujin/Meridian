/** Haversine distance in kilometers between two [lng, lat] points. */
export function haversineDistance(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Linearly interpolate between two [lng, lat] points at given progress (0-1). */
export function interpolateLine(
  from: [number, number],
  to: [number, number],
  progress: number,
): [number, number] {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

/** Generate a parabolic arc between two [lng, lat] points. */
export function generateArc(
  start: [number, number],
  end: [number, number],
  segments: number = 50,
  bowAmount: number = 0.15,
): [number, number][] {
  if (start[0] === end[0] && start[1] === end[1]) return [start];

  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    const bow = bowAmount * Math.sin(t * Math.PI);
    coords.push([lng, lat + bow]);
  }
  return coords;
}

/**
 * Return the first `progress` fraction of a coordinate array.
 * At progress 0 returns [first point]. At progress 1 returns the full array.
 * Intermediate values interpolate between existing vertices.
 */
export function sliceLine(
  coords: [number, number][],
  progress: number,
): [number, number][] {
  if (coords.length < 2 || progress <= 0) return [coords[0]];
  if (progress >= 1) return coords;

  const totalSegments = coords.length - 1;
  const exactIndex = progress * totalSegments;
  const segIndex = Math.floor(exactIndex);
  const segProgress = exactIndex - segIndex;

  const result = coords.slice(0, segIndex + 1);
  if (segIndex < totalSegments) {
    result.push(interpolateLine(coords[segIndex], coords[segIndex + 1], segProgress));
  }
  return result;
}
