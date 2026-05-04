import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { computeTargetCamera } from '../utils/camera';
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
 * Strategy: at every frame, frame two interpolated points so the bounds
 * smoothly slide from the prior hold's framing to the new hold's framing.
 *   boundsFrom: priorViewA → dotFrom    (over progress)
 *   boundsTo:   priorViewB → dotTo      (over progress)
 *
 * - At p=0: bounds = [priorViewA, priorViewB]   (identical to prior hold — no jump)
 * - At p=1: bounds = [dotFrom, dotTo]            (target hold framing)
 * - In between: continuous slide of both endpoints, so the camera moves only
 *   as the line draws.
 *
 * For non-special prior holds, priorViewB == dotFrom, so boundsTo collapses
 * to interpolate(dotFrom, dotTo, p) = the line tip — matching the spec in
 * docs/map-scroll-behavior.md exactly. The priorViewB indirection only
 * matters for transitioning out of the special hold-0 framing.
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

    const boundsFrom = interpolateLine(priorViewA, dotFrom, progress);
    const boundsTo = interpolateLine(priorViewB, dotTo, progress);

    const camera = computeTargetCamera(map, boundsFrom, boundsTo, h);
    if (camera) {
      map.jumpTo({ center: camera.center, zoom: camera.zoom });
    }
  }, [map, dotFrom, dotTo, progress, priorViewA, priorViewB]);

  return null;
}
