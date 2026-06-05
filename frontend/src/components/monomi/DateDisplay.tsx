import { useTranslation } from 'react-i18next';

export interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: 'short' | 'long' | 'relative';
  className?: string;
}

const TZ = 'Asia/Jakarta';

export const DateDisplay = ({ date, format: variant = 'short', className }: DateDisplayProps) => {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'id-ID';

  if (!date) return <span className={className}>—</span>;
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatted = variant === 'long'
    ? d.toLocaleString(locale, {
        timeZone: TZ,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : d.toLocaleDateString(locale, {
        timeZone: TZ,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
  return <span className={className}>{formatted}</span>;
};
