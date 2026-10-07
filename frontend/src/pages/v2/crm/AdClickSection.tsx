import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiErrorMessage, crmApi, type LeadDetail } from '@/services/crm';
import { useCrmLabels } from './crmUtils';

/** "https://link.monomiagency.com/?utm_x=1" -> "link.monomiagency.com/" (display only). */
const shortUrl = (url: string | null): string => {
  if (!url) return '-';
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
  } catch {
    return url.slice(0, 60);
  }
};

const REF_RE = /^[2-9A-HJ-NP-Z]{6}$/;

/**
 * Lead detail: the landing-page click this lead is linked to, and a field to
 * link the "Kode: XXXXXX" a chat carried. A code held by a lead that still
 * waits for its WhatsApp chat merges that waiting lead into this one.
 */
export function AdClickSection({
  lead, onData, onWaitingResolved,
}: {
  lead: LeadDetail;
  onData: (d: LeadDetail) => void;
  onWaitingResolved?: (d: LeadDetail) => void;
}) {
  const { t, formatDateTime } = useCrmLabels();
  const [code, setCode] = useState('');
  const click = lead.adClick;
  const normalized = code.trim().toUpperCase();

  const link = useMutation({
    mutationFn: () => crmApi.linkAdClick(lead.id, normalized),
    onSuccess: (d) => {
      setCode('');
      if (d.waitingOutcome && onWaitingResolved) { onWaitingResolved(d); return; }
      onData(d);
      toast.success(t('crm.adClick.linkedToast', 'Ad click linked.'));
    },
    onError: (err) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(
        status === 404 ? t('crm.adClick.notFound', 'No ad click with that code.')
          : status === 409 ? t('crm.adClick.taken', 'That code is already linked to another lead.')
            : apiErrorMessage(err, t('crm.errors.save', 'Could not save.')),
      );
    },
  });

  const answers = click ? (['brandName', 'category'] as const).filter((k) => click[k]) : [];
  const utm = click ? [click.utmSource, click.utmMedium, click.utmContent].filter(Boolean).join(' / ') : '';

  const linkForm = (
    <form
      onSubmit={(e) => { e.preventDefault(); if (REF_RE.test(normalized)) link.mutate(); }}
      className="space-y-2"
    >
      {!click && <p className="text-sm text-text-tertiary">{t('crm.adClick.linkHelp', 'The chat has no “Kode: XXXXXX”? Type the code from the customer\'s message to link this lead to its ad click.')}</p>}
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={12}
          placeholder={t('crm.adClick.linkPlaceholder', 'e.g. K7QM2X')}
          aria-label={t('crm.adClick.linkTitle', 'Link ad click code')}
          aria-invalid={normalized.length > 0 && !REF_RE.test(normalized)}
          className="min-w-0 font-mono uppercase"
          autoComplete="off"
        />
        <Button type="submit" variant="outline" disabled={!REF_RE.test(normalized) || link.isPending}>{t('crm.adClick.linkButton', 'Link')}</Button>
      </div>
      {normalized.length > 0 && !REF_RE.test(normalized) && (
        <p className="text-xs text-text-tertiary">{t('crm.adClick.invalid', 'Enter the 6-character code, e.g. K7QM2X.')}</p>
      )}
    </form>
  );

  const unconfirmed = lead.unconfirmedAdClickRefs ?? [];
  const unconfirmedNote = unconfirmed.length > 0 && (
    <p className="mt-3 text-xs text-text-tertiary" data-testid="adclick-unconfirmed">
      {t('crm.adClick.unconfirmedTaps', 'Tapped again on the landing page with the same Instagram (not confirmed, not used for Meta): {{refs}}. Link the code from their chat to confirm it.', { refs: unconfirmed.join(', ') })}
    </p>
  );

  if (click) {
    const others = lead.otherAdClickRefs ?? [];
    return (
      <>
        <p className="mb-3 text-xs font-medium text-success" data-testid="adclick-matched">{t('crm.adClick.matched', 'Matched via website click')}</p>
        <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
          <dt className="text-text-tertiary">{t('crm.adClick.code', 'Code')}</dt>
          <dd className="font-mono">{click.ref}</dd>
          <dt className="text-text-tertiary">{t('crm.adClick.campaign', 'Campaign')}</dt>
          <dd className="break-words">{lead.campaign ? `${lead.campaign.code} · ${lead.campaign.name}` : (click.campaignCode ?? click.utmCampaign ?? '-')}</dd>
          <dt className="text-text-tertiary">{t('crm.adClick.landing', 'Landing page')}</dt>
          <dd className="break-all">{shortUrl(click.pageUrl)}</dd>
          <dt className="text-text-tertiary">{t('crm.adClick.clickedAt', 'Clicked')}</dt>
          <dd>{formatDateTime(click.createdAt)}</dd>
          {utm && (
            <>
              <dt className="text-text-tertiary">{t('crm.adClick.utm', 'Ad parameters')}</dt>
              <dd className="break-all font-mono text-xs">{utm}</dd>
            </>
          )}
          {answers.length > 0 && (
            <>
              <dt className="text-text-tertiary">{t('crm.adClick.answers', 'Answers on the landing page')}</dt>
              <dd className="space-y-0.5">
                {answers.map((k) => (
                  <div key={k} className="break-words"><span className="text-text-tertiary">{t(`crm.adClick.${k}`, k)}:</span> {click[k]}</div>
                ))}
              </dd>
            </>
          )}
          {others.length > 0 && (
            <>
              <dt className="text-text-tertiary">{t('crm.adClick.otherTaps', 'Earlier taps')}</dt>
              <dd className="break-all font-mono text-xs" data-testid="adclick-others">{others.join(', ')}</dd>
            </>
          )}
        </dl>
        {unconfirmedNote}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-text-tertiary hover:text-text-primary">{t('crm.adClick.linkAnother', 'Link another code')}</summary>
          <div className="mt-2">{linkForm}</div>
        </details>
      </>
    );
  }

  return <>{linkForm}{unconfirmedNote}</>;
}
