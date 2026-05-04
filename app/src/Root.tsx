import { useState } from 'react';
import App from './App';
import Welcome from './components/Welcome';
import { unlockAudio } from './utils/audio';

export default function Root() {
  const [started, setStarted] = useState(false);
  const handleStart = () => {
    unlockAudio('/music/shake-it-off.mp3');
    setStarted(true);
  };
  if (!started) return <Welcome onStart={handleStart} />;
  return <App />;
}
