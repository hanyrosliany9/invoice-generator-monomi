export interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: 'short' | 'long' | 'relative';
  className?: string;
}

const TZ = 'Asia/Jakarta';

export const DateDisplay = ({ date, format: variant = 'short', className }: DateDisplayProps) => {
  if (!date) return <span className={className}>—</span>;
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatted = variant === 'long'
    ? d.toLocaleString('id-ID', {
        timeZone: TZ,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : d.toLocaleDateString('id-ID', {
        timeZone: TZ,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
  return <span className={className}>{formatted}</span>;
};
