import { useState } from 'react';

interface PhotoStackProps {
  photos: string[];
}

export default function PhotoStack({ photos }: PhotoStackProps) {
  const [topIndex, setTopIndex] = useState(0);

  if (photos.length === 0) return null;

  const isInteractive = photos.length > 1;
  const handleTap = () => {
    setTopIndex((prev) => (prev + 1) % photos.length);
  };

  // Show up to 3 photos in the stack
  const stackSize = Math.min(photos.length, 3);
  const visiblePhotos = [];
  for (let i = 0; i < stackSize; i++) {
    const idx = (topIndex + i) % photos.length;
    visiblePhotos.push({ index: idx, filename: photos[idx], stackPos: i });
  }

  // Reverse so bottom of stack renders first
  visiblePhotos.reverse();

  return (
    <div
      className={`photo-stack${isInteractive ? '' : ' photo-stack--static'}`}
      onClick={isInteractive ? handleTap : undefined}
    >
      {visiblePhotos.map(({ index, filename, stackPos }) => (
        <div
          key={index}
          className="photo-stack__photo"
          style={{
            zIndex: stackSize - stackPos,
            transform: `rotate(${(stackPos - 1) * 3}deg) translate(${stackPos * 4}px, ${stackPos * -4}px)`,
          }}
        >
          <img
            src={`/photos/thumb/${filename}`}
            alt=""
            loading="lazy"
            onError={(e) => {
              // Fallback: try full size, then hide
              const target = e.target as HTMLImageElement;
              if (!target.src.includes('/full/')) {
                target.src = `/photos/full/${filename}`;
              } else {
                target.style.display = 'none';
              }
            }}
          />
        </div>
      ))}
      {photos.length > 1 && (
        <div className="photo-stack__count">{topIndex + 1} / {photos.length}</div>
      )}
    </div>
  );
}
