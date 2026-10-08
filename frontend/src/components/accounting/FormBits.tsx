import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import type { ChartOfAccount } from '@/services/accounting';
import { formatIdrInput } from './accountingForms';
import { cn } from '@/lib/utils';

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs uppercase tracking-wide text-text-tertiary">
      {children} {required && <span className="text-danger">*</span>}
    </label>
  );
}

/** Translates an error key from accountingForms.ts validators. */
export function FieldError({ code }: { code?: string }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <p role="alert" className="mt-1 text-[11px] text-danger">
      {t(`accounting.forms.errors.${code}`, code)}
    </p>
  );
}

/** Rupiah amount input: shows "Rp" prefix + live thousand separators. */
export function MoneyField({
  value, onChange, invalid, id, placeholder = '0',
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  id?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">Rp</span>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(formatIdrInput(e.target.value))}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={cn('bg-bg-sunken border-border-subtle pl-9 text-right tabular-nums', invalid && 'border-danger')}
      />
    </div>
  );
}

export function accountOptions(accounts: ChartOfAccount[]): ComboboxOption[] {
  return accounts.map((a) => ({
    value: a.id,
    label: `${a.code} · ${a.nameId || a.name}`,
    keywords: [a.code, a.name, a.nameId ?? ''],
  }));
}

/** Searchable chart-of-accounts picker. */
export function AccountPicker({
  accounts, value, onChange, invalid, placeholder,
}: {
  accounts: ChartOfAccount[];
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const options = useMemo(() => accountOptions(accounts), [accounts]);
  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      aria-invalid={invalid}
      placeholder={placeholder ?? t('accounting.forms.pickAccount', 'Select account')}
      searchPlaceholder={t('accounting.forms.searchAccount', 'Search code or name')}
      emptyText={t('accounting.forms.noAccount', 'No matching account')}
      className="bg-bg-sunken border-border-subtle w-full"
    />
  );
}
