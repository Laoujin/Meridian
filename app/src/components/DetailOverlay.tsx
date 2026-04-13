import type { Memory } from '../types/memory';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import '../styles/detail-overlay.css';

interface DetailOverlayProps {
  memory: Memory;
  onClose: () => void;
}

export default function DetailOverlay({ memory, onClose }: DetailOverlayProps) {
  const dateStr = format(parseISO(memory.date), 'd MMMM yyyy', { locale: nl });

  return (
    <div className="detail-overlay">
      <div className="detail-overlay__backdrop" onClick={onClose} />
      <button className="detail-overlay__close" onClick={onClose}>✕</button>
      <div className="detail-overlay__content">
        <div className="detail-overlay__header">
          <div className="detail-overlay__date">{dateStr}</div>
          <h2 className="detail-overlay__title">{memory.title}</h2>
        </div>

        {memory.days?.map((day, i) => (
          <div key={i} className="detail-overlay__day">
            <div className="detail-overlay__date">
              {format(parseISO(day.date), 'd MMMM yyyy', { locale: nl })}
            </div>
            <div className="detail-overlay__day-title">{day.title}</div>
            <p>{day.caption}</p>
            {day.photos.map((photo, j) => (
              <img
                key={j}
                src={`/photos/full/${photo}`}
                alt=""
                loading="lazy"
                style={{ width: '100%', borderRadius: 12, margin: '12px 0' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
