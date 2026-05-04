import type { Memory } from '../types/memory';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import PhotoStack from './PhotoStack';
import { weatherEmoji } from '../utils/weather';

interface MemoryCardProps {
  memory: Memory;
}

export default function MemoryCard({ memory }: MemoryCardProps) {
  const dateStr = format(parseISO(memory.date), 'd MMMM yyyy', { locale: nl });

  const isMilestone = memory.type === 'milestone';
  const isTrip = memory.type === 'trip';

  return (
    <div
      className={`memory-card ${isMilestone ? 'memory-card--milestone' : ''} ${isTrip ? 'memory-card--trip' : ''}`}
    >
      {memory.weather && (
        <div className="memory-card__weather-badge" title={memory.weather.note ?? ''}>
          <span className="memory-card__weather-icon">{weatherEmoji(memory.weather.icon)}</span>
          <span className="memory-card__weather-temp">{memory.weather.tempC}°</span>
        </div>
      )}
      <div className="memory-card__date">{dateStr}</div>
      <h2 className="memory-card__title">{memory.title}</h2>
      {memory.photos.length > 0 && (
        <PhotoStack photos={memory.photos} />
      )}
      <p className="memory-card__caption">{memory.caption}</p>
      {memory.weather?.note && (
        <div className="memory-card__weather-note">{memory.weather.note}</div>
      )}
      {memory.location?.text && (
        <div className="memory-card__location">📍 {memory.location.text}</div>
      )}
    </div>
  );
}
