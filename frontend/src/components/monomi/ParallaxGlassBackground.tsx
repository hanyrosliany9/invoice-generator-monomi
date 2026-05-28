import { useEffect, useRef } from 'react';
import './ParallaxGlassBackground.css';

/**
 * "Aurora Drift" background — modern 2026 dashboard aesthetic.
 *
 * Visual concept: three enormous soft-blurred light blooms (navy + cyan +
 * cream) slowly drift, scale, and shift across a pure-black canvas. A faint
 * dot field anchors the eye and creates tactile depth. The whole thing
 * parallaxes against scroll at three different depth speeds.
 *
 * Why this works (and the previous rectangles didn't):
 * - Bloom orbs read as *atmosphere*, not as objects. The eye relaxes.
 * - Heavy blur (~120px) hides any sharp edges → never looks like "shapes".
 * - Three depth layers (0.15x → 0.35x → 0.55x scroll) give cinematic depth.
 * - Cream + navy + cyan-tinted navy creates a warm/cool tension on a
 *   neutral-black base — classic luxury palette.
 *
 * Performance: only `transform` and `opacity` animate; everything is
 * GPU-composited via `will-change: transform`. Single passive RAF scroll
 * handler updates one CSS variable. No JS animation loops.
 *
 * Respects `prefers-reduced-motion`.
 */
export const ParallaxGlassBackground = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    const apply = (y: number) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        root.style.setProperty('--scroll-y', `${y}px`);
        ticking = false;
      });
    };

    const onWindowScroll = () => apply(window.scrollY);
    // AppShell uses <main className="overflow-y-auto"> as its scroller, so
    // window.scrollY stays 0. Subscribe to that element too.
    const main = document.querySelector('main');
    const onMainScroll = () => apply(main?.scrollTop ?? 0);

    window.addEventListener('scroll', onWindowScroll, { passive: true });
    main?.addEventListener('scroll', onMainScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onWindowScroll);
      main?.removeEventListener('scroll', onMainScroll);
    };
  }, []);

  return (
    <div ref={rootRef} className="pgbg" aria-hidden="true">
      {/* Three depth-staggered aurora bloom layers. Each lives inside a
       * parallax wrapper so the scroll-coupled translate composes with the
       * inner drift/scale animation without stomping it. */}
      <div className="pgbg-layer pgbg-layer-back">
        <div className="pgbg-aurora pgbg-aurora-1" />
      </div>
      <div className="pgbg-layer pgbg-layer-mid">
        <div className="pgbg-aurora pgbg-aurora-2" />
      </div>
      <div className="pgbg-layer pgbg-layer-front">
        <div className="pgbg-aurora pgbg-aurora-3" />
      </div>

      {/* Tactile dot field — closest layer, parallaxes the most. */}
      <div className="pgbg-dots" />

      {/* Edge vignette focuses attention center, hides scaling artifacts. */}
      <div className="pgbg-vignette" />
    </div>
  );
};
