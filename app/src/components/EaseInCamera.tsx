import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { computeTargetCamera } from '../utils/camera';

interface EaseInCameraProps {
  map: maplibregl.Map | null;
  dotFrom: [number, number];
  dotTo: [number, number];
  progress: number;
}

/**
 * Scenario: both dots are already visible on the current map view.
 * Gradually zoom in until dots are comfortably framed in the bottom area.
 * The line draws while we smoothly ease toward the target framing.
 */
export default function EaseInCamera({ map, dotFrom, dotTo, progress }: EaseInCameraProps) {
  const startCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const targetCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!map) return;
    const h = map.getContainer().clientHeight;

    // Capture start camera once
    if (!initializedRef.current) {
      const center = map.getCenter();
      startCameraRef.current = { center: [center.lng, center.lat], zoom: map.getZoom() };
      targetCameraRef.current = computeTargetCamera(map, dotFrom, dotTo, h);
      initializedRef.current = true;
    }

    const start = startCameraRef.current;
    const target = targetCameraRef.current;
    if (!start || !target) return;

    // Smooth ease-in: linear lerp from current wide view toward tight framing
    const p = progress;
    const lng = start.center[0] + (target.center[0] - start.center[0]) * p;
    const lat = start.center[1] + (target.center[1] - start.center[1]) * p;
    const zoom = start.zoom + (target.zoom - start.zoom) * p;
    map.jumpTo({ center: [lng, lat], zoom });
  }, [map, dotFrom, dotTo, progress]);

  // Reset when dots change (new transition)
  useEffect(() => {
    initializedRef.current = false;
  }, [dotFrom[0], dotFrom[1], dotTo[0], dotTo[1]]);

  return null;
}
