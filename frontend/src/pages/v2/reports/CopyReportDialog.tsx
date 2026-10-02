/**
 * "Copy to next month": shows WHERE the copy will land and lets staff pick the
 * month. The default is the next month the project has no report for; when
 * that is not simply the following month (because it already has a report) the
 * skip is spelled out, never silent.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Copy, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ReportUtils } from '@/features/reports/services/reportUtils';
import { socialMediaReportsService } from '@/services/social-media-reports';
import { reportErrorText } from './ReportActionDialogs';
import { pickNextFreePeriod, type Period } from './copyPeriod';

export interface CopySource { id: string; projectId: string; month: number; year: number; title: string }

export function CopyReportDialog({
  source, open, onOpenChange,
}: { source: CopySource; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const locale = i18n.language?.startsWith('id') ? 'id-ID' : 'en-US';
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(locale, { month: 'long' })),
    [locale],
  );

  const { data: reports, isLoading, isError, refetch } = useQuery({
    queryKey: ['reports', { projectId: source.projectId }],
    queryFn: () => socialMediaReportsService.getReports({ projectId: source.projectId }),
    enabled: open,
    staleTime: 0,
  });
  const taken = useMemo(() => new Set((reports ?? []).map((r) => `${r.year}-${r.month}`)), [reports]);
  const suggestion = useMemo(
    () => pickNextFreePeriod({ month: source.month, year: source.year }, taken),
    [source.month, source.year, taken],
  );

  const [month, setMonth] = useState(suggestion.target.month);
  const [year, setYear] = useState(suggestion.target.year);
  useEffect(() => {
    if (!open || reports === undefined) return;
    setMonth(suggestion.target.month);
    setYear(suggestion.target.year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reports]);

  const clash = taken.has(`${year}-${month}`);
  const label = (p: Period) => ReportUtils.formatPeriod(p.month, p.year);

  const copy = useMutation({
    mutationFn: () => socialMediaReportsService.duplicateReport(source.id, { month, year }),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['reports'] });
      toast.success(
        t('reportActions.duplicate.done', 'Copied to {{period}} as a draft. Upload new data to each section.', {
          period: label({ month: created.month, year: created.year }),
        }),
      );
      onOpenChange(false);
      navigate(`/reports/${created.id}/edit`);
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportActions.duplicate.failed', 'Failed to copy the report.'))),
  });

  const valid = year >= 2020 && year <= 2100 && !clash;

  return (
    <Dialog open={open} onOpenChange={(o) => !copy.isPending && onOpenChange(o)}>
      <DialogContent srTitle={t('reportCopy.title', 'Copy report to another month')} className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{t('reportCopy.title', 'Copy report to another month')}</DialogTitle>
          <DialogDescription>
            {t('reportCopy.desc', 'Copies "{{title}}" ({{period}}) as a new draft: same sections and charts, but no data.', {
              title: source.title, period: label(source),
            })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading', 'Loading...')}</div>
        ) : isError ? (
          <div className="grid gap-3 py-2">
            <p className="text-sm text-danger">{t('reportCopy.loadFailed', 'Could not check which months already have a report.')}</p>
            <div><Button size="sm" variant="outline" onClick={() => void refetch()}>{t('common.retry', 'Retry')}</Button></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {suggestion.skipped.length > 0 && (
              <div role="note" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-text-secondary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>
                  {t('reportCopy.skipped', '{{skipped}} already has a report for this project, so the next free month is {{target}}. You can pick another month below.', {
                    skipped: suggestion.skipped.map(label).join(', '),
                    target: label(suggestion.target),
                  })}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="copy-month">{t('reportBuilder.field.month', 'Month')}</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger id="copy-month" className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {m}{taken.has(`${year}-${i + 1}`) ? ` (${t('reportCopy.exists', 'already exists')})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="copy-year">{t('reportBuilder.field.year', 'Year')}</Label>
                <Input id="copy-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1.5 tabular-nums" />
              </div>
            </div>
            {clash ? (
              <p role="alert" className="text-xs text-danger">
                {t('reportCopy.clash', '{{period}} already has a report for this project. Pick another month.', { period: label({ month, year }) })}
              </p>
            ) : (
              <p className="text-xs text-text-tertiary">
                {t('reportCopy.target', 'The copy will be created for {{period}}.', { period: label({ month, year }) })}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={copy.isPending}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={() => copy.mutate()} disabled={!valid || isLoading || isError || copy.isPending}>
            {copy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            {t('reportCopy.submit', 'Copy to {{period}}', { period: label({ month, year }) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
