import { useMemo } from 'react';
import '../styles/milestone-effect.css';

const PARTICLE_COUNT = 16;
const COLORS = ['#e8836b', '#f5c242', '#4a9eff', '#e060e0', '#60e090'];

interface MilestoneEffectProps {
  active: boolean;
}

export default function MilestoneEffect({ active }: MilestoneEffectProps) {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
      const radius = 80 + Math.random() * 60;
      return {
        dx: `${Math.cos(angle) * radius}px`,
        dy: `${Math.sin(angle) * radius}px`,
        color: COLORS[i % COLORS.length],
        delay: `${Math.random() * 0.4}s`,
        size: 4 + Math.random() * 4,
      };
    });
  }, []);

  if (!active) return null;

  return (
    <div className="milestone-effect">
      {particles.map((p, i) => (
        <div
          key={i}
          className="milestone-effect__particle"
          style={{
            '--dx': p.dx,
            '--dy': p.dy,
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
