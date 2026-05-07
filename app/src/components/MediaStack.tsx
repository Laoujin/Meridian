import { useCallback, useEffect, useRef, useState } from 'react';
import MediaViewer from './MediaViewer';
import { asset } from '../utils/asset';

interface MediaStackProps {
  photos: string[];
  videos: string[];
  // True when this stack's card is the foreground card (so window-level
  // ArrowLeft/Right binds only on the visible card, not every mounted stack).
  active?: boolean;
}

type MediaItem =
  | { kind: 'photo'; filename: string }
  | { kind: 'video'; filename: string };

const SWIPE_THRESHOLD = 50;

export default function MediaStack({ photos, videos, active = false }: MediaStackProps) {
  const items: MediaItem[] = [
    ...photos.map((f) => ({ kind: 'photo' as const, filename: f })),
    ...videos.map((f) => ({ kind: 'video' as const, filename: f })),
  ];

  const [topIndex, setTopIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const total = items.length;
  const isMulti = total > 1;

  const goPrev = useCallback(() => {
    setTopIndex((i) => (i > 0 ? i - 1 : total - 1));
  }, [total]);

  const goNext = useCallback(() => {
    setTopIndex((i) => (i < total - 1 ? i + 1 : 0));
  }, [total]);

  // Keyboard arrows — only the active card binds, and only when its modal is closed.
  useEffect(() => {
    if (!active || viewerOpen || !isMulti) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, viewerOpen, isMulti, goPrev, goNext]);

  if (total === 0) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isMulti) { touchStartRef.current = null; return; }
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  // Click on the left half = prev, right half = next. Single-photo stacks
  // open the viewer instead (no nav to do).
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMulti) {
      setViewerOpen(true);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) goPrev();
    else goNext();
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewerOpen(true);
  };

  const stackSize = Math.min(total, 3);
  const visible: { index: number; item: MediaItem; stackPos: number }[] = [];
  for (let i = 0; i < stackSize; i++) {
    const idx = (topIndex + i) % total;
    visible.push({ index: idx, item: items[idx], stackPos: i });
  }
  visible.reverse(); // bottom of stack renders first

  return (
    <>
      <div
        className="photo-stack"
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {visible.map(({ index, item, stackPos }) => (
          <div
            key={index}
            className="photo-stack__photo"
            style={{
              zIndex: stackSize - stackPos,
              transform: `rotate(${(stackPos - 1) * 3}deg) translate(${stackPos * 4}px, ${stackPos * -4}px)`,
            }}
          >
            {item.kind === 'photo' ? (
              <img
                src={asset(`/photos/thumb/${item.filename}`)}
                alt=""
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('/full/')) {
                    target.src = asset(`/photos/full/${item.filename}`);
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
            ) : (
              <video
                src={asset(`/videos/${item.filename}`)}
                controls
                preload="metadata"
                playsInline
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  if (!target.src.includes('/photos/full/')) {
                    target.src = asset(`/photos/full/${item.filename}`);
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
            )}
          </div>
        ))}
        <button
          type="button"
          className="photo-stack__expand"
          onClick={handleExpand}
          aria-label="View fullscreen"
        >
          ⛶
        </button>
        {isMulti && (
          <div className="photo-stack__count">{topIndex + 1} / {total}</div>
        )}
      </div>

      {viewerOpen && (
        <MediaViewer
          items={items}
          initialIndex={topIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
