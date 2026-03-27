import { useEffect, useRef, useState, useMemo } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Memory } from '../types/memory';
import { getTransitionType, getSectionHeight, HOLD_HEIGHT_VH } from '../utils/transitions';

gsap.registerPlugin(ScrollTrigger);

export type ScrollPhase = 'hold' | 'transition';

export interface ScrollState {
  /** -1 = opening, 0..n = memory index, memories.length = closing */
  activeIndex: number;
  phase: ScrollPhase;
  /** 0-1 progress within the current section */
  progress: number;
  /** The transition type for the current section (null during regular hold) */
  transitionType: string | null;
}

interface SectionDef {
  id: string;
  type: 'hold' | 'transition';
  heightVh: number;
  /** Memory index this section relates to (-1 = opening, memories.length = closing) */
  memoryIndex: number;
  transitionType?: string;
}

export function buildSections(memories: Memory[]): SectionDef[] {
  const sections: SectionDef[] = [];

  // Opening hold
  sections.push({ id: 'section-opening-hold', type: 'hold', heightVh: HOLD_HEIGHT_VH, memoryIndex: -1 });

  // Opening → first memory transition
  if (memories.length > 0) {
    const tType = getTransitionType(null, memories[0]);
    sections.push({
      id: 'section-transition-0',
      type: 'transition',
      heightVh: getSectionHeight(tType),
      memoryIndex: 0,
      transitionType: tType,
    });
    sections.push({ id: 'section-hold-0', type: 'hold', heightVh: HOLD_HEIGHT_VH, memoryIndex: 0 });
  }

  // Memory → memory transitions
  for (let i = 1; i < memories.length; i++) {
    const tType = getTransitionType(memories[i - 1], memories[i]);
    sections.push({
      id: `section-transition-${i}`,
      type: 'transition',
      heightVh: getSectionHeight(tType),
      memoryIndex: i,
      transitionType: tType,
    });
    sections.push({ id: `section-hold-${i}`, type: 'hold', heightVh: HOLD_HEIGHT_VH, memoryIndex: i });
  }

  // Last memory → closing transition
  sections.push({
    id: 'section-transition-closing',
    type: 'transition',
    heightVh: 200,
    memoryIndex: memories.length,
    transitionType: 'closing-overview',
  });
  // Closing phases — tagged with transitionType so App can distinguish them
  sections.push({ id: 'section-closing-overview', type: 'hold', heightVh: 200, memoryIndex: memories.length, transitionType: 'closing-overview' });
  sections.push({ id: 'section-closing-stats', type: 'hold', heightVh: 150, memoryIndex: memories.length, transitionType: 'closing-stats' });
  sections.push({ id: 'section-closing-gift', type: 'hold', heightVh: 100, memoryIndex: memories.length, transitionType: 'closing-gift' });

  return sections;
}

export function useScrollTimeline(memories: Memory[]) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    activeIndex: -1,
    phase: 'hold',
    progress: 0,
    transitionType: null,
  });
  const lenisRef = useRef<Lenis | null>(null);

  const sections = useMemo(() => buildSections(memories), [memories]);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis();
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const rafCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(rafCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(rafCallback);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Create ScrollTriggers for each section
  useEffect(() => {
    ScrollTrigger.getAll().forEach((t) => t.kill());

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (!el) continue;

      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          setScrollState({
            activeIndex: section.memoryIndex,
            phase: section.type,
            progress: self.progress,
            transitionType: section.transitionType ?? null,
          });
        },
      });
    }

    ScrollTrigger.refresh();
  }, [sections]);

  return { ...scrollState, sections, lenisRef };
}
