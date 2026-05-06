export interface StoryPlace {
  lat: number;
  lng: number;
  label: string;
}

export interface Story {
  app: {
    title: string;
    description?: string;
  };
  home: StoryPlace;
  opening: {
    arcOrigin: StoryPlace;
    welcomeTitle: string;
    welcomeSubtitle?: string;
    heroImage?: string;
  };
  closing: {
    giftReveal: boolean;
    giftRevealText?: string;
  };
}
