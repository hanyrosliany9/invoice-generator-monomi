import { useEffect, useState } from 'react';

type Viewport = 'mobile' | 'tablet' | 'desktop';

/**
 * SSR-safe hook: returns false on first render, updates after mount.
 * Matches (max-width: 767px).
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
};

/**
 * SSR-safe viewport classifier.
 * Returns 'mobile' (<768px), 'tablet' (768-1023px), or 'desktop' (>=1024px).
 * Defaults to 'desktop' on first (SSR) render.
 */
export default useIsMobile;

export const useViewport = (): Viewport => {
  const [viewport, setViewport] = useState<Viewport>('desktop');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setViewport('mobile');
      else if (w < 1024) setViewport('tablet');
      else setViewport('desktop');
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return viewport;
};
