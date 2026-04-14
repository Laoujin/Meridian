import type { Memory } from '../types/memory';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import PhotoStack from './PhotoStack';

interface MemoryCardProps {
  memory: Memory;
  onShowDetails?: () => void;
}

export default function MemoryCard({ memory, onShowDetails }: MemoryCardProps) {
  const dateStr = format(parseISO(memory.date), 'd MMMM yyyy', { locale: nl });

  const isMilestone = memory.type === 'milestone';
  const isTrip = memory.type === 'trip';

  return (
    <div
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
      {memory.type === 'trip' && memory.days && memory.days.length > 0 && onShowDetails && (
        <button className="memory-card__details-btn" onClick={onShowDetails}>
          Meer details
        </button>
      )}
    </div>
  );
}
