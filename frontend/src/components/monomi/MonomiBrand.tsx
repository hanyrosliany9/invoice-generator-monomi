import logoUrl from '@/assets/logos/monomi-logo-optimized.svg';
import { cn } from '@/lib/utils';

export interface MonomiBrandProps {
  className?: string;
  /** When true, only show the mark (no wordmark). Used for collapsed sidebar. */
  iconOnly?: boolean;
}

/**
 * Monomi brand block.
 *
 * The SVG file uses `fill="currentColor"` for path strokes. When loaded
 * via `<img src>`, browsers ignore that and render the paths black, which
 * is invisible on our pure-black sidebar. Workaround: render the SVG as a
 * CSS mask layered over a `background-color` we control — so we can fill
 * the wordmark with brand cream, brand white, navy, anything.
 */
export const MonomiBrand = ({ className, iconOnly }: MonomiBrandProps) => (
  <div className={cn('flex items-center gap-2', className)}>
    <span
      aria-label="Monomi"
      role="img"
      className={cn(
        'block shrink-0 bg-brand-cream',
        iconOnly ? 'h-7 w-7' : 'h-7 w-[110px]',
      )}
      style={{
        WebkitMaskImage: `url(${logoUrl})`,
        maskImage: `url(${logoUrl})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'left center',
        maskPosition: 'left center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  </div>
);
