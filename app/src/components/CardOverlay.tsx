import type { Memory } from '../types/memory';
import type { ScrollPhase } from '../hooks/useScrollTimeline';
import OpeningCard from './OpeningCard';
import MemoryCard from './MemoryCard';

interface CardOverlayProps {
  activeIndex: number;
  memories: Memory[];
  phase: ScrollPhase;
  progress: number;
  muted?: boolean;
  onToggleMute?: () => void;
}

/**
 * Card A fades out over progress 0–0.4
 * Card B fades in over progress 0.3–1.0
 * Overlap at 0.3–0.4: both partially visible (crossfade)
 */
function outgoingOpacity(progress: number): number {
  if (progress <= 0) return 1;
  if (progress >= 0.4) return 0;
  return 1 - progress / 0.4;
}

function incomingOpacity(progress: number): number {
  if (progress <= 0.3) return 0;
  if (progress >= 1) return 1;
  return (progress - 0.3) / 0.7;
}

export default function CardOverlay({ activeIndex, memories, phase, progress, muted, onToggleMute }: CardOverlayProps) {
  if (phase === 'hold') {
    const idx = activeIndex;
    if (idx >= memories.length) return null;

    return (
      <div className="card-overlay">
        <div style={{ opacity: 1, transform: 'translateY(0px)' }}>
          {idx < 0 ? (
            <OpeningCard />
          ) : (
            <MemoryCard memory={memories[idx]} muted={muted} onToggleMute={onToggleMute} />
          )}
        </div>
      </div>
    );
  }

  // Transition: show outgoing card (activeIndex - 1) fading out
  // and incoming card (activeIndex) fading in
  const outIdx = activeIndex - 1;
  const inIdx = activeIndex;
  const outOp = outgoingOpacity(progress);
  const inOp = incomingOpacity(progress);

  return (
    <div className="card-overlay">
      {outOp > 0 && outIdx >= -1 && outIdx < memories.length && (
        <div style={{
          opacity: outOp,
          transform: `translateY(${-30 * (1 - outOp)}px)`,
          position: 'absolute',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}>
          {outIdx < 0 ? (
            <OpeningCard />
          ) : (
            <MemoryCard memory={memories[outIdx]} muted={muted} onToggleMute={onToggleMute} />
          )}
        </div>
      )}
      {inOp > 0 && inIdx >= 0 && inIdx < memories.length && (
        <div style={{
          opacity: inOp,
          transform: `translateY(${30 * (1 - inOp)}px)`,
          position: 'absolute',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <MemoryCard memory={memories[inIdx]} muted={muted} onToggleMute={onToggleMute} />
        </div>
      )}
    </div>
  );
}
