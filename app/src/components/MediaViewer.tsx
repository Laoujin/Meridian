import { useEffect, useCallback, useRef, useState } from 'react';
import '../styles/media-viewer.css';

type MediaItem =
  | { kind: 'photo'; filename: string }
  | { kind: 'video'; filename: string };

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

export default function MediaViewer({ items, initialIndex, onClose }: MediaViewerProps) {
  const [current, setCurrent] = useState(initialIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = items.length;
  const item = items[current];

  const goPrev = useCallback(() => {
    setCurrent((i) => (i > 0 ? i - 1 : total - 1));
  }, [total]);

  const goNext = useCallback(() => {
    setCurrent((i) => (i < total - 1 ? i + 1 : 0));
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goPrev, goNext]);

  // Touch swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Only handle horizontal swipes (ignore mostly-vertical gestures)
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;

    if (dx < 0) goNext();
    else goPrev();
  }, [goNext, goPrev]);

  // Close on backdrop click (not on the media itself)
  const onBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current) onClose();
  }, [onClose]);

  // Prevent body scroll while viewer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      ref={containerRef}
      className="media-viewer"
      onClick={onBackdropClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button className="media-viewer__close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      {total > 1 && (
        <div className="media-viewer__counter">
          {current + 1} / {total}
        </div>
      )}

      <div className="media-viewer__stage">
        {item.kind === 'photo' ? (
          <img
            key={item.filename}
            className="media-viewer__img"
            src={`/photos/full/${item.filename}`}
            alt=""
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('/thumb/')) {
                target.src = `/photos/thumb/${item.filename}`;
              }
            }}
          />
        ) : (
          <video
            key={item.filename}
            className="media-viewer__video"
            src={`/videos/${item.filename}`}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {total > 1 && (
        <>
          <button className="media-viewer__nav media-viewer__nav--prev" onClick={goPrev} aria-label="Previous">
            ‹
          </button>
          <button className="media-viewer__nav media-viewer__nav--next" onClick={goNext} aria-label="Next">
            ›
          </button>
        </>
      )}
    </div>
  );
}
