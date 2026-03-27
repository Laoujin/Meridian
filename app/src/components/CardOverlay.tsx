import { useMemo } from 'react';
import type { Memory } from '../types/memory';
import type { ScrollPhase } from '../hooks/useScrollTimeline';
import OpeningCard from './OpeningCard';
import MemoryCard from './MemoryCard';

interface CardOverlayProps {
  activeIndex: number;
  memories: Memory[];
  phase: ScrollPhase;
  progress: number;
  onShowDetails?: (memoryIndex: number) => void;
}

/**
 * Compute card opacity and translateY based on scroll phase and progress.
 *
 * During hold: card is fully visible (opacity 1, translateY 0).
 * During transition:
 *   0.00–0.25: outgoing card fades out (opacity 1→0, translateY 0→-30)
 *   0.25–0.75: no card visible (between locations)
 *   0.75–1.00: incoming card fades in (opacity 0→1, translateY 30→0)
 */
function getCardStyle(phase: ScrollPhase, progress: number): React.CSSProperties {
  if (phase === 'hold') {
    return { opacity: 1, transform: 'translateY(0px)' };
  }

  if (progress <= 0.25) {
    const p = progress / 0.25;
    return {
      opacity: 1 - p,
      transform: `translateY(${-30 * p}px)`,
    };
  }

  if (progress < 0.75) {
    return { opacity: 0, transform: 'translateY(30px)' };
  }

  const p = (progress - 0.75) / 0.25;
  return {
    opacity: p,
    transform: `translateY(${30 * (1 - p)}px)`,
  };
}

export default function CardOverlay({ activeIndex, memories, phase, progress, onShowDetails }: CardOverlayProps) {
  const displayIndex = useMemo(() => {
    if (phase === 'hold') return activeIndex;
    if (progress < 0.25) return activeIndex - 1;
    return activeIndex;
  }, [activeIndex, phase, progress]);

  const style = getCardStyle(phase, progress);
  const isClosing = displayIndex >= memories.length;

  if (isClosing) return null;

  return (
    <div className="card-overlay">
      <div style={style}>
        {displayIndex < 0 ? (
          <OpeningCard />
        ) : (
          <MemoryCard
            memory={memories[displayIndex]}
            onShowDetails={onShowDetails ? () => onShowDetails(displayIndex) : undefined}
          />
        )}
      </div>
    </div>
  );
}
