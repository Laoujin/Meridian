import { expect } from '@playwright/test';
import type { Frame } from './map-state';

export interface SmoothnessOptions {
  /** Max |Δzoom| allowed between consecutive frames. */
  maxZoomDelta?: number;
  /**
   * Max |Δcenter| in *projected pixels* between consecutive frames.
   * Pixel-space is zoom-invariant, so a single threshold works across
   * wide-shot and close-up transitions.
   */
  maxCenterPxDelta?: number;
}

export type DotSelector = 'from' | 'to' | 'both';

function pickDots(frame: Frame, which: DotSelector) {
  if (which === 'from') return [{ name: 'dotFrom', state: frame.dotFrom }];
  if (which === 'to') return [{ name: 'dotTo', state: frame.dotTo }];
  return [
    { name: 'dotFrom', state: frame.dotFrom },
    { name: 'dotTo', state: frame.dotTo },
  ];
}

/**
 * Assert the selected dot(s) are visible (within viewport with margin as
 * captured in the frame). Every offending frame is reported individually
 * so you can see exactly *when* the dot fell off screen.
 */
export function assertDotsVisible(frames: Frame[], which: DotSelector): void {
  const failures: string[] = [];
  for (const frame of frames) {
    for (const { name, state } of pickDots(frame, which)) {
      if (!state.lngLat) {
        failures.push(`${frame.label}: ${name} has no lngLat (travelFrom/travelTo was null)`);
        continue;
      }
      if (!state.visible) {
        failures.push(
          `${frame.label}: ${name} offscreen at px=${JSON.stringify(state.px)} ` +
            `(container ${frame.map.container.w}×${frame.map.container.h})`,
        );
      }
    }
  }
  expect(
    failures,
    `assertDotsVisible("${which}") found ${failures.length} offscreen frame(s):\n` +
      failures.join('\n'),
  ).toEqual([]);
}

/**
 * Assert camera changes smoothly between consecutive frames.
 */
export function assertCameraSmooth(
  frames: Frame[],
  opts: SmoothnessOptions = {},
): void {
  const maxZoomDelta = opts.maxZoomDelta ?? 0.6;
  const maxCenterPxDelta = opts.maxCenterPxDelta ?? 250;

  const failures: string[] = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const curr = frames[i];
    const dz = Math.abs(curr.map.zoom - prev.map.zoom);
    if (dz > maxZoomDelta) {
      failures.push(
        `${prev.label} → ${curr.label}: |Δzoom|=${dz.toFixed(3)} exceeds ${maxZoomDelta}`,
      );
    }

    // Project both centers at the *current* frame's zoom by using the
    // Haversine-ish pixel distance at that zoom: Web Mercator pixels per
    // degree at `zoom` ≈ (256 * 2^zoom) / 360 for longitude. Latitude scales
    // similarly but with a cos(lat) factor. This is good enough to catch
    // teleports — we're not rendering anything, just thresholding.
    const avgLat = (prev.map.center.lat + curr.map.center.lat) / 2;
    const pxPerDegLng = (256 * Math.pow(2, curr.map.zoom) / 360) * Math.cos((avgLat * Math.PI) / 180);
    const pxPerDegLat = 256 * Math.pow(2, curr.map.zoom) / 360;
    const dxPx = Math.abs(curr.map.center.lng - prev.map.center.lng) * pxPerDegLng;
    const dyPx = Math.abs(curr.map.center.lat - prev.map.center.lat) * pxPerDegLat;
    const dPx = Math.hypot(dxPx, dyPx);
    if (dPx > maxCenterPxDelta) {
      failures.push(
        `${prev.label} → ${curr.label}: center jump ≈ ${dPx.toFixed(0)}px exceeds ${maxCenterPxDelta}px ` +
          `(Δlng=${(curr.map.center.lng - prev.map.center.lng).toFixed(4)}, ` +
          `Δlat=${(curr.map.center.lat - prev.map.center.lat).toFixed(4)}, zoom=${curr.map.zoom.toFixed(2)})`,
      );
    }
  }

  expect(
    failures,
    `assertCameraSmooth found ${failures.length} discontinuity:\n` + failures.join('\n'),
  ).toEqual([]);
}

/**
 * Guard against the "world-view" regression — zoom falling below a floor.
 */
export function assertZoomFloor(frames: Frame[], floor = 3): void {
  const failures = frames
    .filter((f) => f.map.zoom < floor)
    .map((f) => `${f.label}: zoom=${f.map.zoom.toFixed(2)} < ${floor}`);
  expect(
    failures,
    `assertZoomFloor(${floor}) found ${failures.length} frame(s):\n` + failures.join('\n'),
  ).toEqual([]);
}
