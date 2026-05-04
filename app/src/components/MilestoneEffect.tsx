import '../styles/milestone-effect.css';

const PARTICLE_COUNT = 80;
const COLORS = ['#e8836b', '#f5c242', '#4a9eff', '#e060e0', '#60e090'];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// Group particles into fireworks "bursts" so multiple explosions co-occur,
// each at a different origin, with staggered start times that loop forever.
const BURST_COUNT = 8;
const PARTICLES_PER_BURST = PARTICLE_COUNT / BURST_COUNT;

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const burst = Math.floor(i / PARTICLES_PER_BURST);
  const within = i % PARTICLES_PER_BURST;
  const ox = 15 + seededRandom(burst * 7 + 1) * 70;
  const oy = 15 + seededRandom(burst * 7 + 2) * 70;
  const angle = (within / PARTICLES_PER_BURST) * 2 * Math.PI + seededRandom(i + 11) * 0.4;
  const radius = 60 + seededRandom(i + 200) * 80;
  const cycle = 3.2;
  const delay = seededRandom(burst * 13 + 5) * cycle + within * 0.02;
  const duration = 1.4 + seededRandom(i + 300) * 0.6;
  return {
    ox: `${ox}%`,
    oy: `${oy}%`,
    dx: `${Math.cos(angle) * radius}px`,
    dy: `${Math.sin(angle) * radius}px`,
    color: COLORS[(burst + within) % COLORS.length],
    delay: `${delay.toFixed(2)}s`,
    duration: `${duration.toFixed(2)}s`,
    size: 4 + seededRandom(i + 400) * 4,
  };
});

interface MilestoneEffectProps {
  active: boolean;
}

export default function MilestoneEffect({ active }: MilestoneEffectProps) {
  if (!active) return null;

  return (
    <div className="milestone-effect">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="milestone-effect__particle"
          style={{
            left: p.ox,
            top: p.oy,
            '--dx': p.dx,
            '--dy': p.dy,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animationDelay: p.delay,
            animationDuration: p.duration,
            width: p.size,
            height: p.size,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
