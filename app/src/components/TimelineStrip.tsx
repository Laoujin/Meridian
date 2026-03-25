import type { Memory } from '../types/memory';

interface TimelineStripProps {
  memories: Memory[];
  activeIndex: number;
}

export default function TimelineStrip({ memories, activeIndex }: TimelineStripProps) {
  // Extract unique years
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
            <span
              key={year}
              className="timeline-year"
              style={{ left: `${yearPos}%` }}
            >
              {year}
            </span>
          );
        })}
      </div>
    </div>
  );
}
