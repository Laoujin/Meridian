import type { Memory } from '../types/memory';

interface TimelineStripProps {
  memories: Memory[];
  activeIndex: number;
  onYearClick?: (memoryIndex: number) => void;
}

export default function TimelineStrip({ memories, activeIndex, onYearClick }: TimelineStripProps) {
  const years = [...new Set(memories.map(m => m.date.substring(0, 4)))];
  const progress = memories.length > 1 ? activeIndex / (memories.length - 1) : 0;

  return (
    <div className="timeline-strip">
      <div className="timeline-track">
        <div
          className="timeline-progress"
          style={{ width: `${progress * 100}%` }}
        />
        {years.map(year => {
          const yearIndex = memories.findIndex(m => m.date.startsWith(year));
          const yearPos = memories.length > 1 ? (yearIndex / (memories.length - 1)) * 100 : 0;
          return (
            <button
              key={year}
              type="button"
              className="timeline-year"
              style={{ left: `${yearPos}%` }}
              onClick={() => onYearClick?.(yearIndex)}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}
