import { useState } from 'react';
import App from './App';
import Welcome from './components/Welcome';

export default function Root() {
  const [started, setStarted] = useState(false);
  if (!started) return <Welcome onStart={() => setStarted(true)} />;
  return <App />;
}
