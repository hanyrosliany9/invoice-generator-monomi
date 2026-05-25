import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Container primitive for the dark editorial system.
 *
 * Surface choice is a hierarchy decision, not a style decision:
 *   subtle   → nested wells (inside another panel)
 *   glass    → default card on the base canvas (most common)
 *   strong   → primary feature panel — heaviest weight, highest contrast
 *   elevated → navy-tinted; reserved for accent moments (sheet headers, callouts)
 */
const glassPanelVariants = cva(
  'rounded-lg border shadow-[var(--shadow-glow)]',
  {
    variants: {
      surface: {
        subtle:   'bg-bg-sunken border-border-subtle',
        glass:    'bg-bg-raised border-border-subtle',
        strong:   'bg-bg-panel border-border-default',
        elevated: 'bg-bg-elevated border-border-default backdrop-blur-[24px] backdrop-saturate-[180%]',
      },
      padding: {
        none: '',
        sm:   'p-4',
        md:   'p-6',
        lg:   'p-8',
      },
    },
    defaultVariants: { surface: 'glass', padding: 'md' },
  }
);

export interface GlassPanelProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanelVariants> {}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, surface, padding, ...props }, ref) => (
    <div ref={ref} className={cn(glassPanelVariants({ surface, padding }), className)} {...props} />
  )
);
GlassPanel.displayName = 'GlassPanel';
