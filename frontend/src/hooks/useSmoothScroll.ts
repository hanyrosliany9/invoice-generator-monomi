import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Wires Lenis smooth scrolling to the AppShell's <main> scroll container.
 *
 * Why this exists: native scroll on dense dashboards (long tables, large
 * accounting reports) feels jittery and skips frames during heavy renders.
 * Lenis interpolates scroll position frame-by-frame, giving the same buttery
 * feel that salo.uk / matveyan.com / linear.app users experience.
 *
 * Restraint settings (per "dashboard-appropriate motion"):
 *   - duration 1.0s   (default 1.2; tighter for app feel)
 *   - easing  ease-out (no overshoot)
 *   - wheel multiplier 1.0 (preserve scroll-speed expectations)
 *
 * Auto-disables for prefers-reduced-motion.
 */
export const useSmoothScroll = () => {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const main = document.querySelector('main');
    if (!main) return;

    const lenis = new Lenis({
      wrapper: main as HTMLElement,
      content: main.firstElementChild as HTMLElement,
      duration: 1.0,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
};
