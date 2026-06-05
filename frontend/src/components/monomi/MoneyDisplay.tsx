import { cn } from '@/lib/utils';
import { safeNumber } from '@/utils/currency';

export interface MoneyDisplayProps {
  amount: number | string | null | undefined;
  currency?: 'IDR';
  colorize?: boolean;
  className?: string;
}

export const MoneyDisplay = ({ amount, currency = 'IDR', colorize, className }: MoneyDisplayProps) => {
  const n = safeNumber(amount);
  const isNeg = n < 0;
  const formatted = `Rp ${Math.round(Math.abs(n)).toLocaleString('id-ID')}`;
  return (
    <span className={cn(
      'font-mono tabular-nums',
      colorize && isNeg && 'text-danger',
      colorize && n > 0 && 'text-success',
      className,
    )}>
      {isNeg && '−'}{formatted}
    </span>
  );
};
