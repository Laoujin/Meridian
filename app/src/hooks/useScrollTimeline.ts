import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollTimeline(sectionCount: number) {
  const [activeIndex, setActiveIndex] = useState(-1); // -1 = opening
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis();

    lenisRef.current = lenis;

    // Connect Lenis to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const rafCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(rafCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(rafCallback);
      lenis.destroy();
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenisRef.current = null;
    };
  }, []);

  // Register scroll triggers for each section
  useEffect(() => {
    // Kill existing triggers before re-registering
    ScrollTrigger.getAll().forEach(t => t.kill());

    // Opening section trigger
    const openingEl = document.getElementById('opening-section');
    if (openingEl) {
      ScrollTrigger.create({
        trigger: openingEl,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (self.isActive) {
            setActiveIndex(-1);
          }
        },
      });
    }

    for (let i = 0; i < sectionCount; i++) {
      const el = document.getElementById(`memory-section-${i}`);
      if (!el) continue;

      ScrollTrigger.create({
        trigger: el,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => {
          if (self.isActive) {
            setActiveIndex(i);
          }
        },
      });
    }

    ScrollTrigger.refresh();
  }, [sectionCount]);

  return { activeIndex, lenisRef };
}
