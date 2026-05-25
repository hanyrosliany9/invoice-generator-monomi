import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: 'short' | 'long' | 'relative';
  className?: string;
}

export const DateDisplay = ({ date, format: variant = 'short', className }: DateDisplayProps) => {
  if (!date) return <span className={className}>—</span>;
  const d = typeof date === 'string' ? new Date(date) : date;
  const pattern = variant === 'long' ? 'd MMMM yyyy, HH:mm' : 'd MMM yyyy';
  return <span className={className}>{format(d, pattern, { locale: id })}</span>;
};
