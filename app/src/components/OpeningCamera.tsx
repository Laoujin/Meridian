import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { computeTargetCamera } from '../utils/camera';
import { ORIGIN, ANCHOR } from '../data/story';

interface OpeningCameraProps {
  map: maplibregl.Map | null;
  destination: [number, number]; // first memory coords
  progress: number;
}

/**
 * Camera for the opening → first memory transition.
 * Lerps from the opening arc view to framing anchor + origin + destination.
 */
export default function OpeningCamera({ map, destination, progress }: OpeningCameraProps) {
  const startCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const targetCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    const h = map.getContainer().clientHeight;

    if (!initializedRef.current) {
      const center = map.getCenter();
      startCameraRef.current = { center: [center.lng, center.lat], zoom: map.getZoom() };
      // Target: frame the widest pair (anchor ↔ origin), which encloses the destination
      targetCameraRef.current = computeTargetCamera(map, ANCHOR, ORIGIN, h);
      initializedRef.current = true;
    }

    const start = startCameraRef.current;
    const target = targetCameraRef.current;
    if (!start || !target) return;

    const p = progress;
    const lng = start.center[0] + (target.center[0] - start.center[0]) * p;
    const lat = start.center[1] + (target.center[1] - start.center[1]) * p;
    const zoom = start.zoom + (target.zoom - start.zoom) * p;
    map.jumpTo({ center: [lng, lat], zoom });
  }, [map, destination, progress]);

  return null;
}
