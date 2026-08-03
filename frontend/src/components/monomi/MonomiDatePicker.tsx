import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDateLocale } from '@/lib/dateLocale';

export interface MonomiDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Earliest month the year/month dropdowns can reach. Default: 15 years ago. */
  startMonth?: Date;
  /** Latest month the year/month dropdowns can reach. Default: 3 years from now. */
  endMonth?: Date;
}

export const MonomiDatePicker = ({
  value, onChange, placeholder, disabled, className, startMonth, endMonth,
}: MonomiDatePickerProps) => {
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const [open, setOpen] = useState(false);
  const placeholderText = placeholder ?? t('common.selectDate', 'Select date');
  const today = new Date();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-text-tertiary',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'd MMMM yyyy', { locale: idLocale }) : placeholderText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { onChange?.(d); setOpen(false); }}
          locale={idLocale}
          weekStartsOn={1}
          // Month/year dropdowns instead of only prev/next-month arrows --
          // jumping to a date a year (or more) back used to take ~12 clicks.
          captionLayout="dropdown"
          defaultMonth={value ?? today}
          startMonth={startMonth ?? new Date(today.getFullYear() - 15, 0)}
          endMonth={endMonth ?? new Date(today.getFullYear() + 3, 11)}
        />
      </PopoverContent>
    </Popover>
  );
};
