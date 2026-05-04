import { useEffect, useMemo, useState } from 'react';
import App from './App';
import Welcome from './components/Welcome';
import { loadMemories } from './data/loader';
import { preloadTracks, unlockAudio } from './utils/audio';

export default function Root() {
  const [started, setStarted] = useState(false);

  const tracks = useMemo(() => {
    const set = new Set<string>();
    for (const m of loadMemories()) {
      if (m.music?.track) set.add(m.music.track);
    }
    return [...set];
  }, []);

  useEffect(() => { preloadTracks(tracks); }, [tracks]);

  const handleStart = () => {
    if (tracks.length > 0) unlockAudio(`/music/${tracks[0]}`);
    setStarted(true);
  };

  if (!started) return <Welcome onStart={handleStart} />;
  return <App />;
}
