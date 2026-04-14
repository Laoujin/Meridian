import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { computeTargetCamera } from '../utils/camera';

interface EaseOutCameraProps {
  map: maplibregl.Map | null;
  dotFrom: [number, number];
  dotTo: [number, number];
  progress: number;
}

/**
 * Scenario: the destination dot is NOT visible on the current map view.
 *
 * Strategy: frame dotFrom and the current line tip on every frame.
 * As the line extends, the viewport naturally widens to follow it.
 * - At p=0: camera stays on dotFrom (line hasn't started)
 * - At p=0.5: camera frames dotFrom → line midpoint
 * - At p=1: camera frames dotFrom → dotTo
 *
 * dotFrom is always visible because it's always one of the framed points.
 */
export default function EaseOutCamera({ map, dotFrom, dotTo, progress }: EaseOutCameraProps) {
  useEffect(() => {
    if (!map) return;
    const h = map.getContainer().clientHeight;

    // The line tip at the current progress
    const tipLng = dotFrom[0] + (dotTo[0] - dotFrom[0]) * progress;
    const tipLat = dotFrom[1] + (dotTo[1] - dotFrom[1]) * progress;
    const lineTip: [number, number] = [tipLng, tipLat];

    const camera = computeTargetCamera(map, dotFrom, lineTip, h);
    if (camera) {
      map.jumpTo({ center: camera.center, zoom: camera.zoom });
    }
  }, [map, dotFrom, dotTo, progress]);

  return null;
}
