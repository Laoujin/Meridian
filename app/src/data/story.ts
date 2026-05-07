import storyJson from '../../../data/ny-trip/story.json';
import type { Story } from '../types/story';

export const story = storyJson as Story;

// When story.opening.arcOrigin is omitted, ORIGIN collapses to anchor — the
// opening arc renders nothing and the second LocationMarker is hidden, so the
// math degenerates to identity transforms. Forks with a couple/two-place
// narrative set arcOrigin and get the original arc-with-two-dots opener.
export const ORIGIN: [number, number] = story.opening.arcOrigin
  ? [story.opening.arcOrigin.lng, story.opening.arcOrigin.lat]
  : [story.anchor.lng, story.anchor.lat];
export const ANCHOR: [number, number] = [story.anchor.lng, story.anchor.lat];
