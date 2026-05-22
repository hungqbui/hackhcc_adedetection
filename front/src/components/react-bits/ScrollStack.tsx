import React, { useEffect, useRef } from 'react';
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';

type ScrollStackProps = {
  children?: React.ReactNode;
  className?: string;
};

export default function ScrollStack({ children, className = '' }: ScrollStackProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.4, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // small GSAP parallax
    const el = ref.current;
    if (el) {
      const sections = Array.from(el.querySelectorAll('.stack-section')) as HTMLElement[];
      sections.forEach((sec, i) => {
        gsap.fromTo(sec, { y: 40 }, { y: -40, scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={ref} className={`scroll-stack relative ${className}`}>
      {children}
    </div>
  );
}
