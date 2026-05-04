import type { TransportMode } from '../types/memory';

// All icons drawn facing UP (north). The marker rotates by bearing,
// so 0° bearing keeps them as-drawn and any other direction works out.
// Color matches the travel line (#e8836b) with dark stroke for legibility.

const FILL = '#e8836b';
const STROKE = '#2a2a2a';
const SW = 0.7;

const car = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="2" width="12" height="20" rx="3" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <path d="M8 4.5 L16 4.5 L15 7 L9 7 Z" fill="#fff" opacity="0.55"/>
  <rect x="8" y="9" width="8" height="6" rx="0.5" fill="#fff" opacity="0.25"/>
  <path d="M9 19.5 L15 19.5 L16 17 L8 17 Z" fill="#fff" opacity="0.55"/>
</svg>`;

const plane = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 1.5 L13.2 10.5 L22 13.5 L22 15.6 L13.2 14 L13.2 19 L16 21 L16 22.2 L12 21 L8 22.2 L8 21 L10.8 19 L10.8 14 L2 15.6 L2 13.5 L10.8 10.5 Z"
        fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
</svg>`;

const train = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="5.5" y="2" width="13" height="20" rx="2.5" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <rect x="7" y="3.6" width="10" height="2.4" rx="0.4" fill="#fff" opacity="0.7"/>
  <rect x="7" y="8" width="4" height="2.4" rx="0.3" fill="#fff" opacity="0.55"/>
  <rect x="13" y="8" width="4" height="2.4" rx="0.3" fill="#fff" opacity="0.55"/>
  <rect x="7" y="12" width="4" height="2.4" rx="0.3" fill="#fff" opacity="0.55"/>
  <rect x="13" y="12" width="4" height="2.4" rx="0.3" fill="#fff" opacity="0.55"/>
  <rect x="9" y="20" width="6" height="1.4" fill="${STROKE}"/>
</svg>`;

// Walking: two footprints side-by-side (his + hers), each = ball + heel.
// His is a half-stride ahead of hers. Both face north so they rotate with bearing.
const walking = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="8.5" cy="9" rx="2.6" ry="3.4" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <ellipse cx="8.5" cy="13.6" rx="1.4" ry="1.1" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <ellipse cx="15.5" cy="13" rx="2.4" ry="3.2" fill="#7b8db0" stroke="${STROKE}" stroke-width="${SW}"/>
  <ellipse cx="15.5" cy="17.2" rx="1.3" ry="1" fill="#7b8db0" stroke="${STROKE}" stroke-width="${SW}"/>
</svg>`;

const boat = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 1.5 L18 14 L17 21 Q12 22.5 7 21 L6 14 Z" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}" stroke-linejoin="round"/>
  <rect x="10" y="9" width="4" height="4" fill="#fff" opacity="0.6"/>
  <line x1="12" y1="2" x2="12" y2="14" stroke="${STROKE}" stroke-width="0.6"/>
</svg>`;

const bike = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="5" r="2.4" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <circle cx="12" cy="19" r="2.4" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <path d="M12 7.4 L12 16.6" stroke="${STROKE}" stroke-width="1.4"/>
  <path d="M9 11 L15 11 M9 13 L15 13" stroke="${STROKE}" stroke-width="1"/>
</svg>`;

const bus = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="5.5" y="2" width="13" height="20" rx="2" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <rect x="7" y="3.6" width="10" height="3" rx="0.3" fill="#fff" opacity="0.7"/>
  <rect x="7" y="8" width="4.5" height="3" fill="#fff" opacity="0.5"/>
  <rect x="12.5" y="8" width="4.5" height="3" fill="#fff" opacity="0.5"/>
  <rect x="7" y="12.5" width="4.5" height="3" fill="#fff" opacity="0.5"/>
  <rect x="12.5" y="12.5" width="4.5" height="3" fill="#fff" opacity="0.5"/>
  <rect x="7.5" y="19.5" width="3" height="1.5" fill="${STROKE}"/>
  <rect x="13.5" y="19.5" width="3" height="1.5" fill="${STROKE}"/>
</svg>`;

// Metro: shorter rounded carriage with a circular "M" badge — distinct from train.
const metro = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="3" width="12" height="18" rx="5" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>
  <rect x="7.5" y="5" width="9" height="2.4" rx="0.4" fill="#fff" opacity="0.7"/>
  <rect x="7.5" y="9" width="9" height="2.4" rx="0.3" fill="#fff" opacity="0.5"/>
  <circle cx="12" cy="16" r="3" fill="#fff" stroke="${STROKE}" stroke-width="${SW}"/>
  <path d="M10 17.6 L10.6 14.6 L12 16.6 L13.4 14.6 L14 17.6" fill="none" stroke="${STROKE}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SVGS: Record<TransportMode, string> = { car, plane, train, metro, walking, boat, bike, bus };

export function transportSvg(mode: TransportMode = 'car'): string {
  return SVGS[mode] ?? SVGS.car;
}
