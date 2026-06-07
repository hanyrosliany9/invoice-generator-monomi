import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number; // 0–5
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'sm',
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const display = hovered ?? value;

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      onMouseLeave={() => !readonly && setHovered(null)}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const starN = i + 1;
        const filled = starN <= display;
        return (
          <button
            key={starN}
            type="button"
            disabled={readonly}
            aria-label={`${starN} star`}
            onMouseEnter={() => !readonly && setHovered(starN)}
            onClick={() => {
              if (readonly || !onChange) return;
              // Clicking the current rating clears it (toggle off)
              onChange(value === starN ? 0 : starN);
            }}
            className={cn(
              'transition-colors focus:outline-none',
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
            )}
          >
            <Star
              className={cn(
                iconSize,
                'transition-colors',
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-text-tertiary',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
