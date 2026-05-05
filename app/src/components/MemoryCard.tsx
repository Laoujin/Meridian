import type { Memory } from '../types/memory';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import MediaStack from './MediaStack';
import { weatherEmoji } from '../utils/weather';

interface MemoryCardProps {
  memory: Memory;
  muted?: boolean;
  onToggleMute?: () => void;
}

export default function MemoryCard({ memory, muted, onToggleMute }: MemoryCardProps) {
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
      {memory.emojis?.[0] && (
        <div className="memory-card__emoji memory-card__emoji--left" aria-hidden="true">
          {memory.emojis[0]}
        </div>
      )}
      {memory.emojis?.[1] && (
        <div className="memory-card__emoji memory-card__emoji--right" aria-hidden="true">
          {memory.emojis[1]}
        </div>
      )}
      {(memory.photos.length > 0 || memory.videos.length > 0) && (
        <MediaStack photos={memory.photos} videos={memory.videos} />
      )}
      <p className="memory-card__caption">{memory.caption}</p>
      {memory.weather?.note && (
        <div className="memory-card__weather-note">{memory.weather.note}</div>
      )}
      {memory.location?.text && (
        <div className="memory-card__location">📍 {memory.location.text}</div>
      )}
      {memory.music && (
        <div className="memory-card__music">
          <button
            type="button"
            className="memory-card__music-btn"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute music' : 'Mute music'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <span className="memory-card__music-text">
            {memory.music.artist}{memory.music.title ? ` — ${memory.music.title}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}
