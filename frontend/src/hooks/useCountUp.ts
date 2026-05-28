import { useEffect, useState } from 'react';

/**
 * Animates a number from 0 → target over the given duration. Used on
 * dashboard hero KPIs to give the page a "load-in" feel — numbers visibly
 * count up as the page mounts, instead of slamming the final value on the
 * user.
 *
 * Uses `cubic-bezier(0.22, 1, 0.36, 1)` easing (the same curve as our
 * RevealOnView reveals) so the count and the fade-in feel like one motion.
 *
 * Respects prefers-reduced-motion (returns the target value immediately).
 *
 * @example
 *   const animated = useCountUp(stats.totalRevenue, 1100);
 *   <MoneyDisplay amount={animated} />
 */
export const useCountUp = (target: number, durationMs = 1100): number => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setValue(target);
      return;
    }
    if (typeof window === 'undefined') {
      setValue(target);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      setValue(Math.round(target * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
};
