import { useState } from 'react';

interface MediaStackProps {
  photos: string[];
  videos: string[];
}

type MediaItem =
  | { kind: 'photo'; filename: string }
  | { kind: 'video'; filename: string };

export default function MediaStack({ photos, videos }: MediaStackProps) {
  const items: MediaItem[] = [
    ...photos.map((f) => ({ kind: 'photo' as const, filename: f })),
    ...videos.map((f) => ({ kind: 'video' as const, filename: f })),
  ];

  const [topIndex, setTopIndex] = useState(0);

  if (items.length === 0) return null;

  const isInteractive = items.length > 1;
  const handleTap = () => {
    setTopIndex((prev) => (prev + 1) % items.length);
  };

  const stackSize = Math.min(items.length, 3);
  const visible = [];
  for (let i = 0; i < stackSize; i++) {
    const idx = (topIndex + i) % items.length;
    visible.push({ index: idx, item: items[idx], stackPos: i });
  }
  visible.reverse(); // bottom of stack renders first

  return (
    <div
      className={`photo-stack${isInteractive ? '' : ' photo-stack--static'}`}
      onClick={isInteractive ? handleTap : undefined}
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
              src={`/photos/thumb/${item.filename}`}
              alt=""
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('/full/')) {
                  target.src = `/photos/full/${item.filename}`;
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          ) : (
            <video
              src={`/videos/${item.filename}`}
              controls
              preload="metadata"
              playsInline
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLVideoElement;
                if (!target.src.includes('/photos/full/')) {
                  target.src = `/photos/full/${item.filename}`;
                } else {
                  target.style.display = 'none';
                }
              }}
            />
          )}
        </div>
      ))}
      {items.length > 1 && (
        <div className="photo-stack__count">{topIndex + 1} / {items.length}</div>
      )}
    </div>
  );
}
