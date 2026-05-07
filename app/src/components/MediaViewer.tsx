import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { asset } from '../utils/asset';
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

  // Close on any click that bubbles up (media + buttons stop propagation)
  const onBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // Prevent body scroll while viewer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      ref={containerRef}
      className="media-viewer"
      onClick={onBackdropClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        className="media-viewer__close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        ✕
      </button>

      <div className="media-viewer__stage">
        {item.kind === 'photo' ? (
          <img
            key={item.filename}
            className="media-viewer__img"
            src={asset(`/photos/full/${item.filename}`)}
            alt=""
            onClick={(e) => {
              e.stopPropagation();
              if (total <= 1) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 2) goPrev();
              else goNext();
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('/thumb/')) {
                target.src = asset(`/photos/thumb/${item.filename}`);
              }
            }}
          />
        ) : (
          <video
            key={item.filename}
            className="media-viewer__video"
            src={asset(`/videos/${item.filename}`)}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              if (!target.src.includes('/photos/full/')) {
                target.src = asset(`/photos/full/${item.filename}`);
              }
            }}
          />
        )}
      </div>

      {total > 1 && (
        <div className="media-viewer__counter">
          {current + 1} / {total}
        </div>
      )}

      {total > 1 && (
        <>
          <button
            className="media-viewer__nav media-viewer__nav--prev"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            className="media-viewer__nav media-viewer__nav--next"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
