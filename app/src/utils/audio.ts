import { asset } from './asset';

// Single shared <audio> element. iOS only fully unlocks the *element* that
// played during a user gesture, so we reuse one element for the whole session.
const audio = new Audio();
audio.preload = 'auto';

const preloadedTracks = new Set<string>();

const trackUrl = (track: string) => asset(`/music/${track}`);

export function preloadTracks(tracks: string[]): void {
  for (const t of tracks) {
    if (preloadedTracks.has(t)) continue;
    preloadedTracks.add(t);
    // Warm the HTTP cache; subsequent <audio src> hits will be instant.
    fetch(trackUrl(t)).catch(() => { /* file may be missing */ });
  }
}

export function getAudio(): HTMLAudioElement {
  return audio;
}

// Call from inside a user gesture (the welcome button click) to satisfy
// browser autoplay policies. Plays muted, then immediately pauses.
export function unlockAudio(track: string): void {
  audio.muted = true;
  audio.src = trackUrl(track);
  audio.play()
    .catch(() => { /* unlock will be retried on next play attempt */ })
    .finally(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    });
}

export function playTrack(track: string): void {
  const src = trackUrl(track);
  if (!audio.src.endsWith(src)) {
    audio.src = src;
  }
  audio.play().catch(() => { /* file missing or play blocked */ });
}

export function stopAudio(): void {
  audio.pause();
}

export function setMuted(muted: boolean): void {
  audio.muted = muted;
}
