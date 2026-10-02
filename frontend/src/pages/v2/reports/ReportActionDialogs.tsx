/**
 * Report detail actions that need a dialog:
 *   • EditReportDialog — change title / description / month / year (also after
 *     the report was completed; warns that the client sees edits immediately).
 *   • SendReportDialog — "Kirim ke klien": emails the client's active portal
 *     contacts a link to the report, shows who will be notified, and reports
 *     per-recipient results (SMTP failures are surfaced, never hidden).
 */
import i18n from 'i18next';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Mail, Send, UserPlus, XCircle } from 'lucide-react';
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
import { fmtDateTime } from '@/portal/reports/reportData';
import { socialMediaReportsService } from '@/services/social-media-reports';
import type { SendResult, SocialMediaReport } from '@/types/report';

/** Server error text (NestJS may send `message` as a string or string[]). */
export function reportErrorText(err: unknown, fallback: string): string {
  const res = (err as { response?: { status?: number; data?: { message?: string | string[]; error?: string } } }).response;
  if (res?.status === 413) return i18n.t('reportData.tooLarge', 'File too large (maximum 5 MB).');
  const data = res?.data;
  const m = data?.message ?? data?.error;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string' && m !== '') return m;
  return fallback;
}

interface SendFailureDetails {
  code?: string;
  clientId?: string;
  results?: SendResult['results'];
}
const failureDetails = (err: unknown): SendFailureDetails | undefined =>
  (err as { response?: { data?: { details?: SendFailureDetails } } }).response?.data?.details;

const isClientVisible = (status: string) => status === 'COMPLETED' || status === 'SENT';

/* ------------------------------------------------------------------ */
/*  Edit details                                                       */
/* ------------------------------------------------------------------ */

export function EditReportDialog({
  report, open, onOpenChange,
}: { report: SocialMediaReport; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description ?? '');
  const [month, setMonth] = useState(report.month);
  const [year, setYear] = useState(report.year);

  useEffect(() => {
    if (!open) return;
    setTitle(report.title);
    setDescription(report.description ?? '');
    setMonth(report.month);
    setYear(report.year);
  }, [open, report.id, report.title, report.description, report.month, report.year]);

  const locale = i18n.language?.startsWith('id') ? 'id-ID' : 'en-US';
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(locale, { month: 'long' })),
    [locale],
  );

  const mutation = useMutation({
    mutationFn: () =>
      socialMediaReportsService.updateReport(report.id, {
        title: title.trim(),
        description: description.trim(),
        month,
        year,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report', report.id] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('reportActions.edit.saved', 'Report details updated.'));
      onOpenChange(false);
    },
    onError: (e) => toast.error(reportErrorText(e, t('reportActions.edit.failed', 'Failed to update report details.'))),
  });

  const valid = title.trim() !== '' && year >= 2020 && year <= 2100;
  const unchanged =
    title.trim() === report.title && description.trim() === (report.description ?? '') && month === report.month && year === report.year;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent srTitle={t('reportActions.edit.title', 'Edit report details')} className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{t('reportActions.edit.title', 'Edit report details')}</DialogTitle>
          <DialogDescription>
            {t('reportActions.edit.desc', 'Change the title, description or reporting period. Sections and data are not affected.')}
          </DialogDescription>
        </DialogHeader>

        {isClientVisible(report.status) && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-text-secondary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              {t(
                'reportActions.edit.liveWarning',
                'This report is live in the client portal. Changes are visible to the client immediately. Move it back to draft first if you want to edit privately.',
              )}
            </span>
          </div>
        )}

        <div className="grid gap-4">
          <div>
            <Label htmlFor="edit-title">{t('reportBuilder.field.title', 'Report Title')} <span className="text-danger">*</span></Label>
            <Input id="edit-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="edit-desc">{t('reportBuilder.field.description', 'Description')}</Label>
            <Input id="edit-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-month">{t('reportBuilder.field.month', 'Month')}</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger id="edit-month" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-year">{t('reportBuilder.field.year', 'Year')}</Label>
              <Input id="edit-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1.5 tabular-nums" />
            </div>
          </div>
          {(month !== report.month || year !== report.year) && (
            <p className="text-xs text-text-tertiary">
              {t('reportActions.edit.periodHint', 'New period: {{period}}. Each project can have one report per month.', {
                period: ReportUtils.formatPeriod(month, year),
              })}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || unchanged || mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Send to client                                                     */
/* ------------------------------------------------------------------ */

export function SendReportDialog({
  report, open, onOpenChange,
}: { report: SocialMediaReport; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<SendResult | null>(null);
  const [failure, setFailure] = useState<{ message: string; results?: SendResult['results'] } | null>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setFailure(null);
    }
  }, [open]);

  const { data: recipients, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-send-recipients', report.id],
    queryFn: () => socialMediaReportsService.getSendRecipients(report.id),
    enabled: open,
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: () => socialMediaReportsService.sendToClient(report.id),
    onSuccess: (r) => {
      setFailure(null);
      setResult(r);
      void queryClient.invalidateQueries({ queryKey: ['report', report.id] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      if (r.failed > 0) {
        toast.warning(t('reportActions.send.partial', 'Sent to {{sent}} contact(s); {{failed}} failed.', { sent: r.sent, failed: r.failed }));
      } else {
        toast.success(t('reportActions.send.done', 'Report sent to {{count}} contact(s).', { count: r.sent }));
      }
    },
    onError: (e) => {
      const message = reportErrorText(e, t('reportActions.send.failed', 'The email could not be sent.'));
      setFailure({ message, results: failureDetails(e)?.results });
      toast.error(message);
    },
  });

  const noContacts = recipients !== undefined && recipients.contacts.length === 0;
  const empty = (report.sections ?? []).every((s) => s.rowCount === 0);
  const live = isClientVisible(report.status);

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent srTitle={t('reportActions.send.title', 'Send to client')} className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{t('reportActions.send.title', 'Send to client')}</DialogTitle>
          <DialogDescription>
            {t(
              'reportActions.send.desc',
              'Emails the client\'s active portal contacts a link to this report in the client portal, then marks it as Sent.',
            )}
          </DialogDescription>
        </DialogHeader>

        {result !== null ? (
          <div className="grid gap-3" aria-live="polite">
            <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-text-primary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{t('reportActions.send.done', 'Report sent to {{count}} contact(s).', { count: result.sent })}</span>
            </div>
            <RecipientResults results={result.results} />
            {result.failed > 0 && (
              <p className="text-xs text-text-tertiary">
                {t('reportActions.send.partialHint', 'Some emails failed. Check the SMTP configuration, then send again; contacts already notified will receive it again.')}
              </p>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading', 'Loading...')}</div>
        ) : isError || recipients === undefined ? (
          <div className="grid gap-3 py-2">
            <p className="text-sm text-danger">{t('reportActions.send.loadFailed', 'Could not load the recipients.')}</p>
            <div><Button size="sm" variant="outline" onClick={() => void refetch()}>{t('common.retry', 'Retry')}</Button></div>
          </div>
        ) : recipients.client.isInternal ? (
          <p className="rounded-md border border-border-subtle bg-bg-sunken p-3 text-sm text-text-secondary">
            {t('reportActions.send.internal', 'This report belongs to an internal client, which has no client portal.')}
          </p>
        ) : noContacts ? (
          <div className="grid gap-3 rounded-md border border-border-subtle bg-bg-sunken p-4">
            <p className="text-sm text-text-primary">
              {t('reportActions.send.noContacts', '{{client}} has no active portal contacts yet, so there is nobody to email.', { client: recipients.client.name })}
            </p>
            <p className="text-xs text-text-tertiary">
              {t('reportActions.send.noContactsHint', 'Add a contact under "Client Portal" on the client page, then come back here.')}
            </p>
            <div>
              <Button asChild size="sm">
                <Link to={`/clients/${recipients.client.id}`} onClick={() => onOpenChange(false)}>
                  <UserPlus className="h-4 w-4" />
                  {t('reportActions.send.openClient', 'Open client page')}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-text-secondary">
                {t('reportActions.send.willNotify', 'These contacts will be emailed ({{count}})', { count: recipients.contacts.length })}
              </div>
              <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
                {recipients.contacts.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    <span className="min-w-0 truncate text-text-primary">{c.name}</span>
                    <span className="min-w-0 truncate text-xs text-text-tertiary">{c.email}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-xs text-text-tertiary break-all">
              {t('reportActions.send.link', 'Link in the email')}: <span className="font-mono">{recipients.reportUrl}</span>
            </div>
            {live ? null : (
              <div role="note" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-text-secondary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{t('reportActions.send.draftNote', 'This report is still a draft. Sending it publishes it to the client portal.')}</span>
              </div>
            )}
            {recipients.lastEmailedAt && (
              <p className="text-xs text-text-tertiary">
                {t('reportActions.send.lastSent', 'Last sent {{date}}. Sending again will email the contacts again.', {
                  date: fmtDateTime(new Date(recipients.lastEmailedAt)),
                })}
              </p>
            )}
            {empty && (
              <p role="alert" className="text-xs text-danger">
                {t('reportActions.send.noData', 'This report has no data yet. Upload data to at least one section before sending.')}
              </p>
            )}
            {failure !== null && (
              <div role="alert" className="grid gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-text-primary">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <span>{failure.message}</span>
                </div>
                {failure.results && <RecipientResults results={failure.results} />}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {result !== null ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
          </Button>
          {result === null && recipients !== undefined && !recipients.client.isInternal && !noContacts && (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || empty}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {failure !== null ? t('reportActions.send.retry', 'Try again') : t('reportActions.send.submit', 'Send email')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipientResults({ results }: { results: SendResult['results'] }) {
  return (
    <ul className="grid gap-1 text-xs">
      {results.map((r) => (
        <li key={r.email} className="flex items-start gap-2">
          {r.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />}
          <span className="min-w-0 break-words text-text-primary">
            {r.email}
            {!r.ok && r.error ? <span className="text-text-tertiary"> — {r.error}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
