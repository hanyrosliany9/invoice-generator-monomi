import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassPanelVariants = cva(
  'rounded-lg border border-border-subtle backdrop-blur-[24px] backdrop-saturate-[180%] shadow-[var(--shadow-glow)]',
  {
    variants: {
      surface: {
        glass:    'bg-bg-glass',
        strong:   'bg-bg-glass-strong',
        elevated: 'bg-bg-elevated',
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
