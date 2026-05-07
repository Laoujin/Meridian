import type { TransportMode } from './memory';

export interface StoryPlace {
  lat: number;
  lng: number;
  label: string;
}

export interface Story {
  app: {
    title: string;
    faviconHref?: string;
    temperatureUnit?: 'celsius' | 'fahrenheit';
  };
  anchor: StoryPlace;
  opening: {
    arcOrigin?: StoryPlace;
    // When set, the opening transition draws a second arc from the anchor to
    // memory 0 with this transport mode (e.g. her car-route to his train-route).
    // When unset, only the arcOrigin → memory 0 arc is drawn.
    anchorTransport?: TransportMode;
    welcomeTitle: string;
    welcomeSubtitle?: string;
    heroImage?: string;
    card?: {
      icon?: string;
      date?: string;
      text?: string;
      animate?: 'heartbeat' | 'bounce' | 'pulse';
    };
  };
  closing: {
    giftReveal: boolean;
    giftRevealButton?: string;
    giftRevealIcon?: string;
    giftRevealText?: string;
  };
}
