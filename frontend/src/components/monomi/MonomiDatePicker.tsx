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
}

export const MonomiDatePicker = ({
  value, onChange, placeholder, disabled, className,
}: MonomiDatePickerProps) => {
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const [open, setOpen] = useState(false);
  const placeholderText = placeholder ?? t('common.selectDate', 'Select date');
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
        />
      </PopoverContent>
    </Popover>
  );
};
