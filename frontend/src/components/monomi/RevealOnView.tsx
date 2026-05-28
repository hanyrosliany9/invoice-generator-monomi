import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface RevealOnViewProps {
  children: ReactNode;
  /** Delay before this element begins revealing, in ms. Use for staggers. */
  delay?: number;
  /** How far the element slides up from while fading in. Default 24px. */
  offset?: number;
  /** ms of the reveal animation. Default 600. */
  duration?: number;
  /** Once revealed, stay revealed (default true — dashboard re-scroll feels
   *  off when items re-hide). */
  once?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'header' | 'article';
}

/**
 * Restrained scroll-reveal — fades + slides up by a small offset when the
 * element enters the viewport. Designed for dashboard-appropriate motion:
 * subtle, fast, never spring-y. Used for stat cards, chart panels, table
 * headers — wrap any element that should "arrive" on view.
 *
 * Stagger pattern (for a row of cards):
 *   {items.map((it, i) => (
 *     <RevealOnView key={it.id} delay={i * 60}>...</RevealOnView>
 *   ))}
 *
 * Auto-disables for prefers-reduced-motion (renders immediately at final state).
 */
export const RevealOnView = ({
  children,
  delay = 0,
  offset = 24,
  duration = 600,
  once = true,
  className,
  as: Tag = 'div',
}: RevealOnViewProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) obs.unobserve(entry.target);
          } else if (!once) {
            setShown(false);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  const style: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? 'translate3d(0, 0, 0)' : `translate3d(0, ${offset}px, 0)`,
    transition: `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
    willChange: 'opacity, transform',
  };

  return (
    <Tag ref={ref as never} style={style} className={className && cn(className)}>
      {children}
    </Tag>
  );
};
