import storyJson from '../../../data/story.json';
import type { Story } from '../types/story';

export const story = storyJson as Story;

export const HERENT: [number, number] = [story.opening.arcOrigin.lng, story.opening.arcOrigin.lat];
export const GENT: [number, number] = [story.home.lng, story.home.lat];
