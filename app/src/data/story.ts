import storyJson from '../../../data/story.json';
import type { Story } from '../types/story';

export const story = storyJson as Story;

// When story.opening.arcOrigin is omitted, HERENT collapses to home — the
// opening arc renders nothing and the second LocationMarker is hidden, so the
// math degenerates to identity transforms. Forks with a couple/two-place
// narrative set arcOrigin and get the original arc-with-two-dots opener.
export const HERENT: [number, number] = story.opening.arcOrigin
  ? [story.opening.arcOrigin.lng, story.opening.arcOrigin.lat]
  : [story.home.lng, story.home.lat];
export const GENT: [number, number] = [story.home.lng, story.home.lat];
