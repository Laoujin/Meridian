export interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
  text?: string;
}

export type TransportMode = 'car' | 'plane' | 'train' | 'metro' | 'walking' | 'boat' | 'bike' | 'bus';

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

  // How you arrived at this location (defaults to 'car' when omitted)
  transport?: TransportMode;

  // Special
  linkedTo?: string;
  relatedNote?: string;
  attachments?: string[];
}
