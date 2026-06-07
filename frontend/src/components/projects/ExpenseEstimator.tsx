import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, TrendingDown } from 'lucide-react';

import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { expenseService } from '@/services/expenses';
import type { EstimatedExpense } from '@/services/projects';
import type { ExpenseCategory } from '@/types/expense';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// Internal row type — adds a stable `key` so React can track
// rows without relying on index (avoids focus-loss on remove).
// ──────────────────────────────────────────────────────────────
interface ExpenseRow extends EstimatedExpense {
  _key: string;
}

// Shared input class — mirrors ProjectForm's fieldInputClass.
const fieldInputClass =
  'bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary ' +
  'focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40';

// ──────────────────────────────────────────────────────────────
// Helper — stable unique key for new rows.
// ──────────────────────────────────────────────────────────────
let _seq = 0;
const nextKey = () => `ee-${Date.now()}-${++_seq}`;

// Strip the internal `_key` before calling onChange so the parent
// only sees clean EstimatedExpense objects.
const toExternal = (rows: ExpenseRow[]): EstimatedExpense[] =>
  rows.map(({ _key: _ignored, ...rest }) => rest);

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
export interface ExpenseEstimatorProps {
  value: EstimatedExpense[];
  onChange: (expenses: EstimatedExpense[]) => void;
  disabled?: boolean;
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export function ExpenseEstimator({
  value,
  onChange,
  disabled = false,
}: ExpenseEstimatorProps) {
  const { t } = useTranslation();
  const uid = useId();

  // Initialise rows from `value` once on mount; after that this component
  // is fully controlled — every mutation writes back via onChange.
  // We store rows in a local `rows` variable derived from `value` so the
  // parent drives updates (same as RHF useFieldArray pattern).
  const rows: ExpenseRow[] = (value ?? []).map((exp, i) => ({
    ...exp,
    // Stable key: if we already have a _key stored on the object we
    // preserve it; otherwise generate one. Because the parent value is
    // plain EstimatedExpense we use a synthetic key derived from index
    // for the initial hydration — subsequent adds use nextKey().
    _key: (exp as any)._key ?? `ee-init-${i}`,
  }));

  // ── Fetch categories ──────────────────────────────────────
  const { data: categories = [], isLoading: categoriesLoading } =
    useQuery<ExpenseCategory[]>({
      queryKey: ['expense-categories'],
      queryFn: expenseService.getExpenseCategories,
    });

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.nameId || cat.name,
    keywords: [cat.accountCode, cat.name, cat.nameId].filter(Boolean) as string[],
    node: (
      <span className="flex items-baseline gap-1.5 min-w-0">
        <span className="font-mono text-[11px] text-text-tertiary shrink-0">
          {cat.accountCode}
        </span>
        <span className="truncate">{cat.nameId || cat.name}</span>
      </span>
    ),
  }));

  // ── Mutations ─────────────────────────────────────────────
  const addRow = () => {
    const newRow: ExpenseRow = {
      _key: nextKey(),
      categoryId: '',
      categoryName: '',
      categoryNameId: '',
      amount: 0,
      notes: '',
      costType: 'direct',
    };
    onChange(toExternal([...rows, newRow]));
  };

  const removeRow = (key: string) => {
    onChange(toExternal(rows.filter((r) => r._key !== key)));
  };

  const updateRow = (
    key: string,
    patch: Partial<EstimatedExpense>,
  ) => {
    onChange(
      toExternal(
        rows.map((r) =>
          r._key === key ? { ...r, ...patch } : r,
        ),
      ),
    );
  };

  const handleCategoryChange = (key: string, catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    updateRow(key, {
      categoryId: catId,
      categoryName: cat?.name ?? '',
      categoryNameId: cat?.nameId ?? '',
    });
  };

  // ── Totals ────────────────────────────────────────────────
  const directTotal = rows
    .filter((r) => r.costType === 'direct')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const indirectTotal = rows
    .filter((r) => r.costType === 'indirect')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const grandTotal = directTotal + indirectTotal;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Column header — hidden on small screens */}
      {rows.length > 0 && (
        <div className="hidden sm:grid grid-cols-[1fr_140px_160px_1fr_32px] gap-3 px-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
          <div>{t('projectForm.estimator.colCategory', 'Expense Category')}</div>
          <div>{t('projectForm.estimator.colCostType', 'Cost Type')}</div>
          <div className="text-right">{t('projectForm.estimator.colAmount', 'Estimated Amount')}</div>
          <div>{t('projectForm.estimator.colNotes', 'Notes')}</div>
          <div />
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-border-subtle">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-md border border-dashed border-border-subtle bg-bg-sunken/40">
            <TrendingDown className="h-8 w-8 text-text-tertiary opacity-40" />
            <p className="text-sm text-text-tertiary">
              {t('projectForm.estimator.empty', 'No estimated expenses yet.')}
            </p>
            <p className="text-xs text-text-tertiary">
              {t('projectForm.estimator.emptyHint', 'Add rows below to estimate direct and indirect costs.')}
            </p>
          </div>
        ) : (
          rows.map((row, idx) => (
            <div
              key={row._key}
              className="grid grid-cols-1 sm:grid-cols-[1fr_140px_160px_1fr_32px] gap-3 py-3 items-start"
            >
              {/* Category */}
              <div className="space-y-1">
                <Label className="sm:hidden text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  {t('projectForm.estimator.colCategory', 'Expense Category')}
                </Label>
                <Combobox
                  id={`${uid}-cat-${idx}`}
                  value={row.categoryId || undefined}
                  onChange={(v) => handleCategoryChange(row._key, v)}
                  disabled={disabled || categoriesLoading}
                  className={cn('w-full', fieldInputClass)}
                  placeholder={
                    categoriesLoading
                      ? t('projectForm.loading', 'Loading...')
                      : t('projectForm.estimator.categoryPh', 'Select category')
                  }
                  searchPlaceholder={t('projectForm.estimator.categorySearch', 'Search by name or code…')}
                  emptyText={t('projectForm.estimator.categoryEmpty', 'No categories found.')}
                  options={categoryOptions}
                />
              </div>

              {/* Cost Type */}
              <div className="space-y-1">
                <Label className="sm:hidden text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  {t('projectForm.estimator.colCostType', 'Cost Type')}
                </Label>
                <Select
                  value={row.costType}
                  onValueChange={(v) =>
                    updateRow(row._key, { costType: v as 'direct' | 'indirect' })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger
                    id={`${uid}-ct-${idx}`}
                    className={cn('w-full', fieldInputClass)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle">
                    <SelectItem value="direct">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                        {t('projectForm.estimator.direct', 'Direct')}
                      </span>
                    </SelectItem>
                    <SelectItem value="indirect">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        {t('projectForm.estimator.indirect', 'Indirect')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label className="sm:hidden text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  {t('projectForm.estimator.colAmount', 'Estimated Amount')}
                </Label>
                <Input
                  id={`${uid}-amt-${idx}`}
                  type="number"
                  min={0}
                  step="1"
                  inputMode="decimal"
                  placeholder="0"
                  value={row.amount === 0 ? '' : row.amount}
                  onChange={(e) =>
                    updateRow(row._key, {
                      amount: Number(e.target.value) || 0,
                    })
                  }
                  disabled={disabled}
                  className={cn(
                    fieldInputClass,
                    'text-right font-mono tabular-nums',
                  )}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="sm:hidden text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  {t('projectForm.estimator.colNotes', 'Notes')}
                </Label>
                <Input
                  id={`${uid}-notes-${idx}`}
                  type="text"
                  placeholder={t('projectForm.estimator.notesPh', 'Optional note')}
                  value={row.notes ?? ''}
                  onChange={(e) =>
                    updateRow(row._key, { notes: e.target.value })
                  }
                  disabled={disabled}
                  className={fieldInputClass}
                />
              </div>

              {/* Remove */}
              <div className="flex items-center justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(row._key)}
                  disabled={disabled}
                  className="text-text-tertiary hover:text-danger"
                  aria-label={t('projectForm.estimator.removeRow', 'Remove row')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: Add + totals */}
      <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={disabled}
          className="border-border-subtle text-text-secondary hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('projectForm.estimator.addRow', 'Add Expense Row')}
        </Button>

        {/* Totals — only shown when there's data */}
        {rows.length > 0 && (
          <div className="flex items-center gap-6 text-right">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
                {t('projectForm.estimator.directTotal', 'Direct')}
              </p>
              <MoneyDisplay
                amount={directTotal}
                className="text-sm text-text-secondary tabular-nums"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                {t('projectForm.estimator.indirectTotal', 'Indirect')}
              </p>
              <MoneyDisplay
                amount={indirectTotal}
                className="text-sm text-text-secondary tabular-nums"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {t('projectForm.estimator.grandTotal', 'Total Cost Estimate')}
              </p>
              <MoneyDisplay
                amount={grandTotal}
                className="text-base font-display font-semibold text-text-primary tabular-nums"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpenseEstimator;
