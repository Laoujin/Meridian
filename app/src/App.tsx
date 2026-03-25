import { useMemo } from 'react';
import { loadMemories, getLocation } from './data/loader';
import { useScrollTimeline } from './hooks/useScrollTimeline';
import MapCanvas from './components/MapCanvas';
import TimelineStrip from './components/TimelineStrip';
import OpeningCard from './components/OpeningCard';
import MemoryCard from './components/MemoryCard';
import './styles/global.css';

export default function App() {
  const memories = useMemo(() => loadMemories(), []);
  const { activeIndex } = useScrollTimeline(memories.length);

  const activeMemory = memories[activeIndex];
  const loc = activeMemory ? getLocation(activeMemory) : { lat: 51.0543, lng: 3.7174 };

  // Determine zoom based on memory type and location
  const zoom = useMemo(() => {
    if (!activeMemory) return 12;
    if (activeMemory.type === 'trip') return 6;
    if (loc.lat === 51.0543 && loc.lng === 3.7174) return 13;
    return 11;
  }, [activeMemory, loc]);

  return (
    <>
      <MapCanvas center={[loc.lng, loc.lat]} zoom={zoom} />
      <TimelineStrip memories={memories} activeIndex={activeIndex} />

      <div className="scroll-container">
        {/* Opening section */}
        <div className="scroll-section scroll-section--opening">
          <OpeningCard />
        </div>

        {/* Memory sections */}
        {memories.map((memory, i) => (
          <div
            key={memory.id}
            id={`memory-section-${i}`}
            className="scroll-section"
          >
            <MemoryCard memory={memory} />
          </div>
        ))}
      </div>
    </>
  );
}
