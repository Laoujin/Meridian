import type { Memory } from '../types/memory';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import Markdown from 'react-markdown';
import '../styles/detail-overlay.css';

interface DetailOverlayProps {
  memory: Memory;
  onClose: () => void;
}

/** Rewrite relative image paths to /photos/full/ */
function resolveImageSrc(src: string | undefined): string {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('/')) return src;
  return `/photos/full/${src}`;
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

        {memory.expandedText && (
          <div className="detail-overlay__body">
            <Markdown
              components={{
                img: ({ src, alt }) => (
                  <img src={resolveImageSrc(src)} alt={alt ?? ''} loading="lazy" />
                ),
              }}
            >
              {memory.expandedText}
            </Markdown>
          </div>
        )}

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
