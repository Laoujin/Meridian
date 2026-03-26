import { useMemo } from 'react';
import { loadMemories, getLocation } from './data/loader';
import { useScrollTimeline } from './hooks/useScrollTimeline';
import MapCanvas, { ARC_APEX } from './components/MapCanvas';
import TimelineStrip from './components/TimelineStrip';
import OpeningCard from './components/OpeningCard';
import MemoryCard from './components/MemoryCard';
import './styles/global.css';

export default function App() {
  const memories = useMemo(() => loadMemories(), []);
  const { activeIndex } = useScrollTimeline(memories.length);

  const isOpening = activeIndex < 0;
  const activeMemory = activeIndex >= 0 ? memories[activeIndex] : null;
  const loc = activeMemory ? getLocation(activeMemory) : { lat: ARC_APEX[1], lng: ARC_APEX[0] };

  // Determine map center and zoom
  const mapCenter = useMemo<[number, number]>(() => {
    if (!activeMemory) return [ARC_APEX[0], ARC_APEX[1]];
    return [loc.lng, loc.lat];
  }, [activeMemory, loc]);

  const zoom = useMemo(() => {
    if (!activeMemory) return 9; // Opening: show both Herent and Gent (fitBounds handles actual zoom)
    if (activeMemory.type === 'trip') return 6;
    if (loc.lat === 51.0597 && loc.lng === 3.7527) return 13;
    return 11;
  }, [activeMemory, loc]);

  return (
    <>
      <MapCanvas
        center={mapCenter}
        zoom={zoom}
        showOpeningLine={isOpening}
      />
      <TimelineStrip memories={memories} activeIndex={Math.max(0, activeIndex)} />

      <div className="scroll-container">
        {/* Opening section */}
        <div id="opening-section" className="scroll-section scroll-section--opening">
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
