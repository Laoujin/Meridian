import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { computeTargetCameraForPoints } from '../utils/camera';
import { interpolateLine } from '../utils/geo';

interface EaseOutCameraProps {
  map: maplibregl.Map | null;
  dotFrom: [number, number];
  dotTo: [number, number];
  progress: number;
  /** The viewA/viewB the prior hold was framing. Required for continuity at p=0. */
  priorViewA: [number, number];
  priorViewB: [number, number];
}

/**
 * Scenario: the destination dot is NOT visible on the current map view.
 *
 * Same bounds-from-three-points formulation as EaseInCamera (see that file
 * for the rationale). Kept as a separate component for scenario clarity and
 * so future per-scenario tuning (different padding, different easing) can
 * diverge here without touching the ease-in case.
 */
export default function EaseOutCamera({
  map,
  dotFrom,
  dotTo,
  progress,
  priorViewA,
  priorViewB,
}: EaseOutCameraProps) {
  useEffect(() => {
    if (!map) return;
    const h = map.getContainer().clientHeight;
    const camera = computeTargetCameraForPoints(
      map,
      [
        interpolateLine(priorViewA, dotFrom, progress),
        interpolateLine(priorViewB, dotTo, progress),
        dotFrom,
      ],
      h,
    );
    if (camera) {
      map.jumpTo({ center: camera.center, zoom: camera.zoom });
    }
  }, [map, dotFrom, dotTo, progress, priorViewA, priorViewB]);

  return null;
}
