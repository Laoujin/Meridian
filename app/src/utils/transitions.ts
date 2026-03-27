import type { Memory } from '../types/memory';
import { getLocation } from '../data/loader';

export type TransitionType =
  | 'standard'
  | 'same-location'
  | 'to-milestone'
  | 'from-milestone'
  | 'opening';

/** Heights in vh for each transition type. */
export const TRANSITION_HEIGHTS: Record<TransitionType, number> = {
  standard: 60,
  'same-location': 15,
  'to-milestone': 25,
  'from-milestone': 25,
  opening: 60,
};

export const HOLD_HEIGHT_VH = 40;

/**
 * Determine the transition type between two memories.
 * `from` is null for the opening → first memory transition.
 */
export function getTransitionType(from: Memory | null, to: Memory): TransitionType {
  if (from === null) return 'opening';
  if (to.type === 'milestone') return 'to-milestone';
  if (from.type === 'milestone') return 'from-milestone';

  const locA = getLocation(from);
  const locB = getLocation(to);
  if (locA.lat === locB.lat && locA.lng === locB.lng) return 'same-location';

  return 'standard';
}

/** Get transition section height in vh for a given type. */
export function getSectionHeight(type: TransitionType): number {
  return TRANSITION_HEIGHTS[type];
}
