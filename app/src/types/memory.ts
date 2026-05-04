export interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
  text?: string;
}

export interface Transport {
  mode: 'car' | 'plane' | 'train' | 'bus' | 'boat' | 'walk' | 'bike';
  from: string;
  to: string;
}

export type WeatherIcon =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'rain-heavy'
  | 'snow'
  | 'storm';

export interface Weather {
  icon: WeatherIcon;
  tempC: number;
  note?: string;
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
  transport?: Transport[];
  days?: TripDay[];

  // Special
  linkedTo?: string;
  relatedNote?: string;
  attachments?: string[];
}
