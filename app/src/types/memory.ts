export interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
}

export interface Transport {
  mode: 'car' | 'plane' | 'train' | 'bus' | 'boat' | 'walk' | 'bike';
  from: string;
  to: string;
}

export interface Weather {
  note: string;
}

export interface Music {
  track: string;
  artist: string;
  title: string;
}

export interface TripDay {
  date: string;
  title: string;
  caption: string;
  location: Location;
  photos: string[];
  videos: string[];
  transport?: Transport[];
}

export interface Memory {
  id: string;
  date: string;
  type: 'date' | 'trip' | 'milestone' | 'special';
  title: string;
  caption: string;
  location: Location | null;
  photos: string[];
  music: Music | null;
  weather: Weather | null;
  videos: string[];
  tags: string[];

  // Trip-specific
  tripStart?: string;
  tripEnd?: string;
  transport?: Transport[];
  days?: TripDay[];

  // Special
  linkedTo?: string;
  relatedNote?: string;
  attachments?: string[];
}
