/**
 * Confirmation shown BEFORE data is applied when it would do something staff
 * may not expect:
 *   - the dates are outside the report's month (an October report that would
 *     show November numbers), and/or
 *   - replacing the data removes configured charts (their columns are gone).
 * Nothing is saved until the person confirms, so nothing is lost silently.
 */
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import type { ChartImpact, PeriodMismatch } from '@/types/report';

/** Message line for a period mismatch ("Data contains dates outside October 2026 ..."). */
export function PeriodMismatchText({ mismatch, month, year }: { mismatch: PeriodMismatch; month: number; year: number }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="font-medium text-text-primary">
        {t('reportData.periodMismatch', 'The data contains dates outside {{period}}. Use it anyway?', {
          period: ReportUtils.formatPeriod(month, year),
        })}
      </span>
      <span className="mt-1 block text-text-secondary">
        {t('reportData.periodMismatchDetail', '{{outside}} of {{total}} dates in "{{column}}" are outside that month (the data runs from {{min}} to {{max}}).', {
          outside: mismatch.outside, total: mismatch.total, column: mismatch.column, min: mismatch.min, max: mismatch.max,
        })}
      </span>
    </>
  );
}

/** After a replacement: the localized note about charts that were removed (none when nothing was). */
export function chartImpactNotes(t: TFunction, impact: ChartImpact | undefined | null): string[] {
  if (!impact || impact.removed.length === 0) return [];
  const names = impact.removed.join(', ');
  return [
    impact.regenerated
      ? t('reportData.chartsReplacedNote', 'The new data has different columns, so the charts were re-created automatically. Removed: {{names}}. Please check them.', { names })
      : t('reportData.chartsRemovedNote', 'Removed because their columns are not in the new data: {{names}}.', { names }),
  ];
}

export function DataConfirmDialog({
  open, onCancel, onConfirm, busy = false, title, month, year, mismatch, impact,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  title: string;
  month: number;
  year: number;
  mismatch?: PeriodMismatch | null;
  impact?: ChartImpact | null;
}) {
  const { t } = useTranslation();
  const removed = impact?.removed ?? [];
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent srTitle={title} className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t('reportData.confirmDesc', 'Please check this before the data is applied. Nothing has been changed yet.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {mismatch && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="min-w-0"><PeriodMismatchText mismatch={mismatch} month={month} year={year} /></div>
            </div>
          )}
          {removed.length > 0 && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-text-secondary">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div className="min-w-0">
                <div className="font-medium text-text-primary">
                  {impact?.regenerated
                    ? t('reportData.chartsReplaced', 'The new data has different columns. These {{count}} chart(s) will be removed:', { count: removed.length })
                    : t('reportData.chartsRemoved', 'These {{count}} chart(s) use columns that are not in the new data and will be removed:', { count: removed.length })}
                </div>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-text-primary">
                  {removed.map((r, i) => <li key={i} className="break-words">{r}</li>)}
                </ul>
                {impact?.regenerated ? (
                  <p className="mt-1.5">
                    {t('reportData.chartsRegenerated', '{{count}} new chart(s) will be created automatically from the new columns. Check them afterwards.', { count: impact.created })}
                  </p>
                ) : (
                  impact !== undefined && impact !== null && impact.kept.length > 0 && (
                    <p className="mt-1.5">{t('reportData.chartsKept', '{{count}} other chart(s) keep working.', { count: impact.kept.length })}</p>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('reportData.confirmApply', 'Use this data anyway')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
