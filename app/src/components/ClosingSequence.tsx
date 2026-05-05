import { useMemo } from 'react';
import type { Memory } from '../types/memory';
import { computeStats } from '../utils/stats';
import type { JourneyStats } from '../utils/stats';
import '../styles/closing.css';

type ClosingPhase = 'overview' | 'stats' | 'gift';

interface ClosingSequenceProps {
  memories: Memory[];
  phase: ClosingPhase;
  progress: number;
  onWhatsNext?: () => void;
}

interface StatDisplay {
  number: string;
  label: string;
}

function buildStatDisplays(stats: JourneyStats): StatDisplay[] {
  return [
    { number: `${stats.total}`, label: 'herinneringen' },
    { number: `${stats.dates}`, label: 'dates' },
    { number: `${stats.trips}`, label: 'reizen' },
    { number: `${stats.milestones}`, label: 'milestones' },
    { number: `${stats.uniqueLocations}`, label: 'unieke plekken' },
    { number: `${stats.totalPhotos}+`, label: "foto's" },
    { number: '∞', label: 'cocktails' },
  ];
}

export default function ClosingSequence({ memories, phase, progress, onWhatsNext }: ClosingSequenceProps) {
  const stats = useMemo(() => computeStats(memories), [memories]);
  const displays = useMemo(() => buildStatDisplays(stats), [stats]);

  if (phase === 'overview') {
    return (
      <div className="closing-sequence closing-sequence--bottom">
        <div className="closing-whats-next">
          <button className="closing-whats-next__btn" onClick={onWhatsNext}>
            what's next? ✨
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'stats') {
    const visibleCount = Math.floor(progress * (displays.length + 1));

    return (
      <div className="closing-sequence">
        <div className="closing-stats">
          {displays.map((stat, i) => (
            <div
              key={i}
              className={`closing-stats__item ${i < visibleCount ? 'closing-stats__item--visible' : ''}`}
            >
              <div className="closing-stats__number">{stat.number}</div>
              <div className="closing-stats__label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'gift') {
    return (
      <div className="closing-sequence">
        <div className="closing-gift">
          <button className="closing-gift__btn">
            Open je cadeau 🎁
          </button>
        </div>
      </div>
    );
  }

  return null;
}
