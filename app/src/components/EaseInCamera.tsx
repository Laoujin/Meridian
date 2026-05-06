import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { computeTargetCameraForPoints } from '../utils/camera';
import { interpolateLine } from '../utils/geo';

interface EaseInCameraProps {
  map: maplibregl.Map | null;
  dotFrom: [number, number];
  dotTo: [number, number];
  progress: number;
  /** The viewA/viewB the prior hold was framing. Required for continuity at p=0. */
  priorViewA: [number, number];
  priorViewB: [number, number];
}

/**
 * Scenario: both dots are already visible on the current map view.
 *
 * Bounds are computed from THREE points so the line origin (`dotFrom`) is
 * always inside the frame, no matter the geometry:
 *   1. interpolate(priorViewA, dotFrom, p) — prior view's "left side" sliding to the new origin
 *   2. interpolate(priorViewB, dotTo,   p) — prior view's "right side" sliding to the new destination (= line tip when priorViewB == dotFrom)
 *   3. dotFrom                              — anchor; the origin must stay visible the whole way
 *
 * - At p=0: bounds = enclosure of {priorViewA, priorViewB, dotFrom}. For
 *   normal transitions priorViewB == dotFrom so this collapses to
 *   [priorViewA, priorViewB] (the prior hold framing). For the special
 *   hold-0 transition it includes the first memory's location alongside the
 *   opening anchors, which already enclose it — so still equals the prior hold view.
 * - At p=1: bounds = enclosure of {dotFrom, dotTo, dotFrom} = [dotFrom, dotTo]
 *   (the new hold framing).
 * - In between: dotFrom is always one of the bounding-box corners (or inside),
 *   so the line origin never drops off-screen.
 */
export default function EaseInCamera({
  map,
  dotFrom,
  dotTo,
  progress,
  priorViewA,
  priorViewB,
}: EaseInCameraProps) {
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
