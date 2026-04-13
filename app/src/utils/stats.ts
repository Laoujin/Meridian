import type { Memory } from '../types/memory';

export interface JourneyStats {
  total: number;
  dates: number;
  trips: number;
  milestones: number;
  uniqueLocations: number;
  totalPhotos: number;
}

export function computeStats(memories: Memory[]): JourneyStats {
  const locationSet = new Set<string>();
  let totalPhotos = 0;
  let dates = 0;
  let trips = 0;
  let milestones = 0;

  for (const m of memories) {
    if (m.type === 'date' || m.type === 'special') dates++;
    else if (m.type === 'trip') trips++;
    else if (m.type === 'milestone') milestones++;

    if (m.location?.lat != null && m.location?.lng != null) {
      locationSet.add(`${m.location.lat},${m.location.lng}`);
    }

    totalPhotos += m.photos.length;
  }

  return {
    total: memories.length,
    dates,
    trips,
    milestones,
    uniqueLocations: locationSet.size,
    totalPhotos,
  };
}
