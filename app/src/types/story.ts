export interface StoryPlace {
  lat: number;
  lng: number;
  label: string;
}

export interface Story {
  app: {
    title: string;
    description?: string;
    faviconHref?: string;
  };
  home: StoryPlace;
  opening: {
    arcOrigin: StoryPlace;
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
    giftRevealText?: string;
  };
}
