import { useRef } from 'react';
import type { Memory } from '../types/memory';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import PhotoStack from './PhotoStack';

interface MemoryCardProps {
  memory: Memory;
}

export default function MemoryCard({ memory }: MemoryCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const dateStr = format(parseISO(memory.date), 'd MMMM yyyy', { locale: nl });

  const isMilestone = memory.type === 'milestone';
  const isTrip = memory.type === 'trip';

  return (
    <div
      ref={cardRef}
      className={`memory-card ${isMilestone ? 'memory-card--milestone' : ''} ${isTrip ? 'memory-card--trip' : ''}`}
    >
      <div className="memory-card__date">{dateStr}</div>
      <h2 className="memory-card__title">{memory.title}</h2>
      {memory.photos.length > 0 && (
        <PhotoStack photos={memory.photos} />
      )}
      <p className="memory-card__caption">{memory.caption}</p>
      {memory.weather && (
        <div className="memory-card__weather">{memory.weather.note}</div>
      )}
      {memory.location?.name && (
        <div className="memory-card__location">📍 {memory.location.name}</div>
      )}
    </div>
  );
}
