import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import {
  apiErrorMessage, crmApi, type Campaign, type CampaignPlatform, type CampaignStatus,
} from '@/services/crm';
import { CrmShell, nativeSelectClass, textareaClass } from './CrmShell';
import { buildAdLink, buildTikTokAdLink, buildUniversalAdLink, campaignPlatformKind, formatMoney, idr, timeAgo, useCrmLabels, wibDateStr } from './crmUtils';
import { CodeBadge, PlatformBadge } from './LeadParts';
import { tiktokSpendSplit } from './tiktokUi';

const compactNumber = (n: number): string => n.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 1 });

/** 'YYYY-MM-DD' <-> local Date for the app date picker (unambiguous "7 October 2026" display). */
const ymdToDate = (v: string): Date | undefined => (v ? new Date(`${v.slice(0, 10)}T00:00:00`) : undefined);
const dateToYmd = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Message to paste into the Meta ad: template + the [CODE] that links every lead to this campaign. */
export const buildPrefill = (template: string | null, code: string, fallback: string): string => {
  const base = (template && template.trim()) || fallback;
  return base.includes(`[${code}]`) ? base : `${base.trim()} [${code}]`;
};

export default function CampaignsPage() {
  const { t, formatDate, uiLang: lang } = useCrmLabels();
  const qc = useQueryClient();
  const campaignsQ = useQuery({ queryKey: ['crm', 'campaigns'], queryFn: crmApi.campaigns });
  const campaigns = campaignsQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null);
  const [spendOpen, setSpendOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adLinkCopied, setAdLinkCopied] = useState(false);
  const trackingQ = useQuery({ queryKey: ['crm', 'tracking'], queryFn: crmApi.trackingSummary, retry: false });
  const metaQ = useQuery({ queryKey: ['crm', 'meta-ads', 'status'], queryFn: crmApi.metaAdsStatus, retry: false, staleTime: 30_000 });
  const metaCampaignsQ = useQuery({ queryKey: ['crm', 'meta-ads', 'campaigns'], queryFn: crmApi.metaAdsCampaigns, retry: false, staleTime: 30_000 });
  const tiktokQ = useQuery({ queryKey: ['crm', 'tiktok', 'ads'], queryFn: crmApi.tiktokAdsStatus, retry: false, staleTime: 30_000 });
  const tiktokCampaignsQ = useQuery({ queryKey: ['crm', 'tiktok', 'campaigns'], queryFn: crmApi.tiktokAdsCampaigns, retry: false, staleTime: 30_000 });
  const tiktokStatus = tiktokQ.data;
  const tiktokSyncedLine = tiktokStatus && tiktokStatus.state === 'READY'
    ? (tiktokStatus.lastSuccessAt
      ? t('crm.campaigns.syncedTikTok', 'Synced from TikTok · last sync {{ago}}', { ago: timeAgo(tiktokStatus.lastSuccessAt, lang) })
      : t('crm.campaigns.syncedTikTokNever', 'TikTok sync has not run yet'))
    : null;
  const metaStatus = metaQ.data;
  const syncedLine = metaStatus && metaStatus.state === 'READY'
    ? (metaStatus.lastSuccessAt
      ? t('crm.campaigns.synced', 'Synced from Meta · last sync {{ago}}', { ago: timeAgo(metaStatus.lastSuccessAt, lang) })
      : t('crm.campaigns.syncedNever', 'Meta sync has not run yet'))
    : null;
  const linkMut = useMutation({
    mutationFn: ({ id, metaCampaignId }: { id: string; metaCampaignId: string | null }) => crmApi.setMetaLink(id, metaCampaignId),
    onSuccess: (_c, v) => {
      toast.success(v.metaCampaignId ? t('crm.campaigns.metaLink.saved', 'Linked to the Meta campaign.') : t('crm.campaigns.metaLink.unlinked', 'Unlinked from Meta.'));
      qc.invalidateQueries({ queryKey: ['crm'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const ttLinkMut = useMutation({
    mutationFn: ({ id, tiktokCampaignId }: { id: string; tiktokCampaignId: string | null }) => crmApi.setTikTokLink(id, tiktokCampaignId),
    onSuccess: (_c, v) => {
      toast.success(v.tiktokCampaignId ? t('crm.campaigns.tiktokLink.saved', 'Linked to the TikTok campaign.') : t('crm.campaigns.tiktokLink.unlinked', 'Unlinked from TikTok.'));
      qc.invalidateQueries({ queryKey: ['crm'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const [adLinkVariant, setAdLinkVariant] = useState<'universal' | 'code' | 'tiktok' | null>(null);

  useEffect(() => {
    if (!selectedId && campaigns.length > 0) setSelectedId(campaigns[0].id);
  }, [campaigns, selectedId]);
  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  const spendQ = useQuery({
    queryKey: ['crm', 'spend', selectedId],
    queryFn: () => crmApi.spend(selectedId as string),
    enabled: !!selectedId,
  });

  const defaultPrefill = t('crm.campaigns.defaultPrefill', "Hi Monomi, I'm interested in your service. Could you share the details and price?");
  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });

  const deleteMut = useMutation({
    mutationFn: (id: string) => crmApi.deleteCampaign(id),
    onSuccess: () => { toast.success(t('crm.campaigns.deleted', 'Campaign deleted.')); setSelectedId(null); invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.delete', 'Could not delete.'))),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) => crmApi.updateCampaign(id, { status }),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const delSpendMut = useMutation({
    mutationFn: (id: string) => crmApi.deleteSpend(id),
    onSuccess: invalidate,
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t('crm.campaigns.copied', 'Message copied.'));
    } catch {
      toast.error(t('crm.campaigns.copyFail', 'Could not copy. Select the text and copy it manually.'));
    }
  };

  const copyAdLink = async (link: string, variant: 'universal' | 'code' | 'tiktok') => {
    try {
      await navigator.clipboard.writeText(link);
      setAdLinkVariant(variant);
      setAdLinkCopied(true);
      setTimeout(() => setAdLinkCopied(false), 2000);
      toast.success(t('crm.campaigns.adLink.copied', 'Ad link copied.'));
    } catch {
      toast.error(t('crm.campaigns.copyFail', 'Could not copy. Select the text and copy it manually.'));
    }
  };

  const statusText = (s: CampaignStatus) => ({
    ACTIVE: t('crm.campaigns.status.ACTIVE', 'Active'),
    PAUSED: t('crm.campaigns.status.PAUSED', 'Paused'),
    ENDED: t('crm.campaigns.status.ENDED', 'Ended'),
  }[s]);
  const platformText = (p: CampaignPlatform) => ({
    FACEBOOK: t('crm.campaigns.platform.FACEBOOK', 'Facebook'),
    INSTAGRAM: t('crm.campaigns.platform.INSTAGRAM', 'Instagram'),
    BOTH: t('crm.campaigns.platform.BOTH', 'Facebook + Instagram'),
    TIKTOK: t('crm.campaigns.platform.TIKTOK', 'TikTok'),
  }[p]);

  return (
    <CrmShell>
      <PageHeader
        title={t('crm.campaigns.title', 'Campaigns')}
        description={t('crm.campaigns.subtitle', "Every ad gets a unique code. Put it in the WhatsApp ad's pre-filled message so every lead knows where it came from.")}
        actions={(
          <>
            <GuideHelpLink slug="crm-leads-whatsapp" anchor="kampanye" />
            <Button type="button" className="gap-2" onClick={() => setEditing('new')}><Plus /> {t('crm.campaigns.new', 'New campaign')}</Button>
          </>
        )}
      />

      {campaignsQ.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          title={t('crm.campaigns.emptyTitle', 'No campaigns yet')}
          description={t('crm.campaigns.emptyDesc', 'Create one per ad, then copy its pre-filled message into Meta Ads Manager.')}
          action={<Button type="button" onClick={() => setEditing('new')}><Plus /> {t('crm.campaigns.new', 'New campaign')}</Button>}
        />
      ) : (
        <div className="space-y-5">
          {syncedLine && (
            <p className="flex items-center gap-1.5 text-xs text-text-secondary" data-testid="synced-line"><RefreshCw className="h-3.5 w-3.5 shrink-0" /> {syncedLine}</p>
          )}
          {tiktokSyncedLine && (
            <p className="flex items-center gap-1.5 text-xs text-text-secondary" data-testid="synced-line-tiktok"><RefreshCw className="h-3.5 w-3.5 shrink-0" /> {tiktokSyncedLine}</p>
          )}
          {/* Desktop table */}
          <GlassPanel padding="none" className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-bg-sunken text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                <tr>
                  <th className="px-4 py-3">{t('crm.campaigns.col.campaign', 'Campaign')}</th>
                  <th className="px-4 py-3">{t('crm.campaigns.col.code', 'Code')}</th>
                  <th className="px-4 py-3 text-right">{t('crm.campaigns.col.leads', 'Leads')}</th>
                  <th className="px-4 py-3 text-right">{t('crm.campaigns.col.won', 'Won')}</th>
                  <th className="px-4 py-3 text-right">{t('crm.campaigns.col.spend', 'Ad spend')}</th>
                  <th className="px-4 py-3 text-right">{t('crm.campaigns.col.costLead', 'Cost / lead')}</th>
                  <th className="px-4 py-3 text-right">{t('crm.campaigns.col.costQualified', 'Cost / Qualified')}</th>
                  <th className="px-4 py-3 text-right">{t('crm.campaigns.col.costClient', 'Cost / client')}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn('cursor-pointer border-t border-border-subtle hover:bg-bg-raised/60', c.id === selectedId && 'bg-bg-raised')}
                  >
                    <td className="px-4 py-3">
                      <button type="button" className="text-left" aria-pressed={c.id === selectedId} onClick={() => setSelectedId(c.id)}>
                        <div className="flex items-center gap-2"><span className="font-semibold">{c.name}</span><PlatformBadge kind={campaignPlatformKind(c)} /></div>
                        <div className="text-xs text-text-tertiary">{statusText(c.status)} · {platformText(c.platform)}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3"><CodeBadge code={c.code} /></td>
                    <td className="px-4 py-3 text-right font-mono">{c.leads}</td>
                    <td className="px-4 py-3 text-right font-mono">{c.won}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(c.spend, c.spendCurrency)}
                      {(c.impressions ?? 0) > 0 && (
                        <div className="font-sans text-[11px] text-text-tertiary">
                          {t('crm.campaigns.imprClicks', '{{impr}} impr. · {{clicks}} clicks', { impr: compactNumber(c.impressions ?? 0), clicks: compactNumber(c.clicks ?? 0) })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatMoney(c.costPerLead, c.spendCurrency)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatMoney(c.costPerQualified, c.spendCurrency)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatMoney(c.costPerClient, c.spendCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {campaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                aria-pressed={c.id === selectedId}
                className={cn('w-full rounded-xl border p-4 text-left', c.id === selectedId ? 'border-ring/60 bg-bg-raised' : 'border-border-subtle bg-bg-sunken')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="font-semibold">{c.name}</span><PlatformBadge kind={campaignPlatformKind(c)} /></div>
                  <CodeBadge code={c.code} />
                </div>
                <div className="mt-0.5 text-xs text-text-tertiary">{statusText(c.status)} · {platformText(c.platform)}</div>
                <dl className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2.5 text-xs">
                  <div><dt className="text-text-tertiary">{t('crm.campaigns.col.leads', 'Leads')}</dt><dd className="font-mono text-sm">{c.leads}</dd></div>
                  <div><dt className="text-text-tertiary">{t('crm.campaigns.col.won', 'Won')}</dt><dd className="font-mono text-sm">{c.won}</dd></div>
                  <div className="min-w-0"><dt className="text-text-tertiary">{t('crm.campaigns.col.spend', 'Ad spend')}</dt><dd className="break-words font-mono text-xs">{formatMoney(c.spend, c.spendCurrency)}</dd></div>
                  <div className="min-w-0"><dt className="text-text-tertiary">{t('crm.campaigns.col.costLead', 'Cost / lead')}</dt><dd className="break-words font-mono text-xs">{formatMoney(c.costPerLead, c.spendCurrency)}</dd></div>
                  <div className="min-w-0"><dt className="text-text-tertiary">{t('crm.campaigns.col.costQualified', 'Cost / Qualified')}</dt><dd className="break-words font-mono text-xs">{formatMoney(c.costPerQualified, c.spendCurrency)}</dd></div>
                  <div className="min-w-0"><dt className="text-text-tertiary">{t('crm.campaigns.col.costClient', 'Cost / client')}</dt><dd className="break-words font-mono text-xs">{formatMoney(c.costPerClient, c.spendCurrency)}</dd></div>
                </dl>
              </button>
            ))}
          </div>

          {selected && (
            <div className="grid gap-5 lg:grid-cols-2">
              <GlassPanel padding="none" className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2"><h2 className="font-display text-2xl leading-tight">{selected.name}</h2><PlatformBadge kind={campaignPlatformKind(selected)} /></div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t('crm.campaigns.more', 'Campaign actions')}><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-bg-raised border-border-subtle text-text-primary">
                      <DropdownMenuItem onSelect={() => setEditing(selected)} className="gap-2"><Pencil className="h-4 w-4" />{t('crm.campaigns.edit', 'Edit')}</DropdownMenuItem>
                      {(['ACTIVE', 'PAUSED', 'ENDED'] as CampaignStatus[]).filter((s) => s !== selected.status).map((s) => (
                        <DropdownMenuItem key={s} onSelect={() => statusMut.mutate({ id: selected.id, status: s })}>{t('crm.campaigns.markAs', 'Mark as {{status}}', { status: statusText(s) })}</DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 text-danger focus:text-danger"
                        onSelect={() => { if (window.confirm(t('crm.campaigns.deleteConfirm', 'Delete this campaign and its spend log? Leads keep their code.'))) deleteMut.mutate(selected.id); }}
                      ><Trash2 className="h-4 w-4" />{t('crm.campaigns.delete', 'Delete')}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">{t('crm.campaigns.prefillTitle', 'Pre-filled message for the WhatsApp ad')}</div>
                <div className="rounded-lg border border-border-subtle bg-bg-sunken p-3 text-sm leading-relaxed" data-testid="prefill">
                  {buildPrefill(selected.prefillMessage, selected.code, defaultPrefill)}
                </div>
                <div className="mt-3">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => copy(buildPrefill(selected.prefillMessage, selected.code, defaultPrefill))}>
                    {copied ? <Check /> : <Copy />} {copied ? t('crm.campaigns.copiedShort', 'Copied') : t('crm.campaigns.copy', 'Copy message')}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-text-tertiary">
                  {t('crm.campaigns.prefillHelp', 'Paste it in Meta Ads Manager → Ad → Message → "Pre-filled message". The code at the end links each lead to this campaign.')}
                </p>
                <div className="flex flex-col">
                <div className={cn('mt-5 border-t border-border-subtle pt-4', campaignPlatformKind(selected) === 'TIKTOK' ? 'order-2' : 'order-1')}>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">{t('crm.campaigns.adLink.universalTitle', 'Ad link for Meta ads (one link for every ad)')}</div>
                  <code className="block break-all rounded-lg border border-border-subtle bg-bg-sunken p-3 text-xs" data-testid="ad-link-universal">
                    {buildUniversalAdLink(trackingQ.data?.landingPageUrl)}
                  </code>
                  <div className="mt-3">
                    <Button type="button" variant="outline" className="gap-2" onClick={() => copyAdLink(buildUniversalAdLink(trackingQ.data?.landingPageUrl), 'universal')}>
                      {adLinkCopied && adLinkVariant === 'universal' ? <Check /> : <Copy />} {adLinkCopied && adLinkVariant === 'universal' ? t('crm.campaigns.copiedShort', 'Copied') : t('crm.campaigns.adLink.copy', 'Copy ad link')}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-text-tertiary">
                    {t('crm.campaigns.adLink.universalHelp', "Works for every ad: paste it once as the ad's Website URL (or in the URL parameters) in Ads Manager. Meta fills in {{campaignId}} and {{adId}} for each ad, so every landing visit is linked to its campaign automatically.", { campaignId: '{{campaign.id}}', adId: '{{ad.id}}' })}
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-text-tertiary hover:text-text-primary">{t('crm.campaigns.adLink.title', 'Link with this campaign code (other channels)')}</summary>
                    <code className="mt-2 block break-all rounded-lg border border-border-subtle bg-bg-sunken p-3 text-xs" data-testid="ad-link">
                      {buildAdLink(trackingQ.data?.landingPageUrl, selected.code)}
                    </code>
                    <div className="mt-3">
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => copyAdLink(buildAdLink(trackingQ.data?.landingPageUrl, selected.code), 'code')}>
                        {adLinkCopied && adLinkVariant === 'code' ? <Check /> : <Copy />} {adLinkCopied && adLinkVariant === 'code' ? t('crm.campaigns.copiedShort', 'Copied') : t('crm.campaigns.adLink.copyCode', 'Copy link with code')}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-text-tertiary">{t('crm.campaigns.adLink.help', 'For links outside Meta (Instagram bio, newsletter, other ad networks): the campaign code travels as utm_campaign.')}</p>
                  </details>
                </div>
                <div className={cn('mt-5 border-t border-border-subtle pt-4', campaignPlatformKind(selected) === 'TIKTOK' ? 'order-1' : 'order-2')} data-testid="tiktok-ad-link-block">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-text-tertiary">{t('crm.campaigns.tiktokAdLink.title', 'Ad link for TikTok ads (one link for every ad)')}</div>
                  <code className="block break-all rounded-lg border border-border-subtle bg-bg-sunken p-3 text-xs" data-testid="ad-link-tiktok">
                    {buildTikTokAdLink(trackingQ.data?.landingPageUrl)}
                  </code>
                  <div className="mt-3">
                    <Button type="button" variant="outline" className="gap-2" onClick={() => copyAdLink(buildTikTokAdLink(trackingQ.data?.landingPageUrl), 'tiktok')}>
                      {adLinkCopied && adLinkVariant === 'tiktok' ? <Check /> : <Copy />} {adLinkCopied && adLinkVariant === 'tiktok' ? t('crm.campaigns.copiedShort', 'Copied') : t('crm.campaigns.tiktokAdLink.copy', 'Copy TikTok ad link')}
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-text-tertiary">
                    {t('crm.campaigns.tiktokAdLink.help', "Paste it once in the TikTok ad (Ads Manager > Ad > Destination URL, or the URL parameters field without the leading ?). TikTok fills __CAMPAIGN_ID__, __AID__ (ad group) and __CID__ (creative) for each ad and adds the ttclid click id by itself, so every landing visit is linked to its campaign automatically. Keep the macros UPPERCASE with two underscores on each side.")}
                  </p>
                </div>
                </div>
                <div className="mt-5 border-t border-border-subtle pt-4">
                  <Label htmlFor="tiktok-link" className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-tertiary">{t('crm.campaigns.tiktokLink.title', 'TikTok campaign')}</Label>
                  <select
                    id="tiktok-link"
                    className={cn(nativeSelectClass, 'w-full')}
                    value={selected.tiktokCampaignId ?? ''}
                    disabled={ttLinkMut.isPending}
                    onChange={(e) => ttLinkMut.mutate({ id: selected.id, tiktokCampaignId: e.target.value || null })}
                  >
                    <option value="">{t('crm.campaigns.tiktokLink.none', 'Not linked to a TikTok campaign')}</option>
                    {(tiktokCampaignsQ.data ?? []).map((m) => (
                      <option key={m.tiktokCampaignId} value={m.tiktokCampaignId} disabled={!!m.linkedCampaignId && m.linkedCampaignId !== selected.id}>
                        {m.name} · {m.tiktokCampaignId}{m.linkedCampaignId && m.linkedCampaignId !== selected.id ? ` (${t('crm.campaigns.metaLink.takenBy', 'linked to {{code}}', { code: m.linkedCampaignCode ?? '' })})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-text-tertiary">
                    {selected.tiktokCampaignId
                      ? t('crm.campaigns.tiktokLink.linkedHelp', 'Spend of TikTok campaign "{{name}}" syncs into this campaign, and landing visits from its ads are linked to it. Choose "Not linked" to stop.', { name: selected.tiktokCampaignName ?? selected.tiktokCampaignId })
                      : (tiktokCampaignsQ.data ?? []).length === 0
                        ? t('crm.campaigns.tiktokLink.empty', 'No TikTok campaigns known yet. Run "Sync now" in CRM settings > TikTok.')
                        : t('crm.campaigns.tiktokLink.help', 'Link this campaign to its TikTok campaign to pull the ad spend automatically.')}
                  </p>
                </div>
                <div className="mt-5 border-t border-border-subtle pt-4">
                  <Label htmlFor="meta-link" className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-tertiary">{t('crm.campaigns.metaLink.title', 'Meta campaign')}</Label>
                  <select
                    id="meta-link"
                    className={cn(nativeSelectClass, 'w-full')}
                    value={selected.metaCampaignId ?? ''}
                    disabled={linkMut.isPending}
                    onChange={(e) => linkMut.mutate({ id: selected.id, metaCampaignId: e.target.value || null })}
                  >
                    <option value="">{t('crm.campaigns.metaLink.none', 'Not linked to a Meta campaign')}</option>
                    {(metaCampaignsQ.data ?? []).map((m) => (
                      <option key={m.metaCampaignId} value={m.metaCampaignId} disabled={!!m.linkedCampaignId && m.linkedCampaignId !== selected.id}>
                        {m.name} · {m.metaCampaignId}{m.linkedCampaignId && m.linkedCampaignId !== selected.id ? ` (${t('crm.campaigns.metaLink.takenBy', 'linked to {{code}}', { code: m.linkedCampaignCode ?? '' })})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-text-tertiary">
                    {selected.metaCampaignId
                      ? t('crm.campaigns.metaLink.linkedHelp', 'Spend of Meta campaign "{{name}}" syncs into this campaign, and landing visits from its ads are linked to it. Choose "Not linked" to stop.', { name: selected.metaCampaignName ?? selected.metaCampaignId })
                      : (metaCampaignsQ.data ?? []).length === 0
                        ? t('crm.campaigns.metaLink.empty', 'No Meta campaigns known yet. Run "Sync now" in CRM settings.')
                        : t('crm.campaigns.metaLink.help', 'Link this campaign to its Meta campaign to pull the ad spend automatically.')}
                  </p>
                </div>
                {(selected.startDate || selected.endDate || selected.budget) && (
                  <p className="mt-3 text-xs text-text-secondary">
                    {[
                      selected.startDate || selected.endDate
                        ? `${selected.startDate ? formatDate(selected.startDate) : '…'} – ${selected.endDate ? formatDate(selected.endDate) : '…'}`
                        : null,
                      selected.budget ? `${t('crm.campaigns.budget', 'Budget')} ${idr(selected.budget)}` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
              </GlassPanel>

              <GlassPanel padding="none" className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{t('crm.campaigns.spendTitle', 'Ad spend')}</h2>
                  <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setSpendOpen(true)}><Plus /> {t('crm.campaigns.logSpend', 'Log other costs')}</Button>
                </div>
                <div className="mb-3 rounded-lg bg-bg-sunken px-3 py-2 text-sm" data-testid="spend-summary">
                  <div className="font-mono">{formatMoney(selected.spend, selected.spendCurrency)}</div>
                  <div className="text-xs text-text-tertiary">
                    {tiktokSpendSplit(t, selected) ?? (
                      <>
                    {selected.manualSeparate
                      ? t('crm.campaigns.spendSplitSeparate', 'Meta {{meta}}. Other costs {{other}} are in rupiah and are not added to {{currency}}.', {
                        meta: formatMoney(selected.metaSpend ?? 0, selected.spendCurrency),
                        other: idr(selected.manualSpend ?? 0),
                        currency: selected.spendCurrency ?? '',
                      })
                      : t('crm.campaigns.spendSplit', 'Meta {{meta}} + other costs {{other}}', {
                        meta: formatMoney(selected.metaSpend ?? 0, selected.spendCurrency),
                        other: formatMoney(selected.manualSpend ?? 0, selected.spendCurrency),
                      })}
                      </>
                    )}
                    {(selected.impressions ?? 0) > 0 && <> · {t('crm.campaigns.imprClicks', '{{impr}} impr. · {{clicks}} clicks', { impr: compactNumber(selected.impressions ?? 0), clicks: compactNumber(selected.clicks ?? 0) })}</>}
                  </div>
                </div>
                <ul className="max-h-96 divide-y divide-border-subtle overflow-y-auto">
                  {(spendQ.data ?? []).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{s.dateFrom.slice(0, 10) === s.dateTo.slice(0, 10) ? formatDate(s.dateFrom) : `${formatDate(s.dateFrom)} – ${formatDate(s.dateTo)}`}</span>
                          {s.source === 'META' && (
                            <span className="rounded bg-brand-cream/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" data-testid="meta-badge">{t('crm.campaigns.metaBadge', 'Meta')}</span>
                          )}
                          {s.source === 'TIKTOK' && (
                            <span className="rounded bg-text-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" data-testid="tiktok-badge">{t('crm.campaigns.tiktokBadge', 'TikTok')}</span>
                          )}
                        </div>
                        {s.source !== 'MANUAL' && (s.impressions ?? 0) > 0 && (
                          <div className="text-xs text-text-tertiary">{t('crm.campaigns.imprClicks', '{{impr}} impr. · {{clicks}} clicks', { impr: compactNumber(s.impressions ?? 0), clicks: compactNumber(s.clicks ?? 0) })}</div>
                        )}
                        {s.note && <div className="text-xs text-text-tertiary">{s.note}</div>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="font-mono">{formatMoney(s.amount, s.source !== 'MANUAL' ? s.currency : 'IDR')}</span>
                        {s.readOnly ? <span className="inline-block w-8" aria-hidden /> : (
                          <Button
                            type="button" variant="ghost" size="icon-sm" className="text-text-tertiary"
                            aria-label={t('crm.campaigns.deleteSpend', 'Delete spend entry')}
                            onClick={() => { if (window.confirm(t('crm.campaigns.deleteSpendConfirm', 'Delete this spend entry?'))) delSpendMut.mutate(s.id); }}
                          ><Trash2 /></Button>
                        )}
                      </div>
                    </li>
                  ))}
                  {spendQ.data?.length === 0 && <li className="py-6 text-center text-sm text-text-tertiary">{t('crm.campaigns.noSpend', 'No spend logged yet.')}</li>}
                </ul>
                <p className="mt-3 text-xs text-text-tertiary">{t('crm.campaigns.metaSpend', 'Meta ad spend syncs automatically. Use "Log other costs" for anything else (creative, studio, agency fees).')}{(selected.tiktokCampaignId || selected.platform === 'TIKTOK') ? ` ${t('crm.campaigns.tiktokSpend', 'TikTok ad spend syncs automatically too.')}` : ''}</p>
              </GlassPanel>
            </div>
          )}
        </div>
      )}

      {editing && (
        <CampaignDialog
          campaign={editing === 'new' ? null : editing}
          defaultPrefill={defaultPrefill}
          onClose={() => setEditing(null)}
          onSaved={(c) => { setEditing(null); setSelectedId(c.id); invalidate(); }}
        />
      )}
      {spendOpen && selected && (
        <SpendDialog
          campaign={selected}
          onClose={() => setSpendOpen(false)}
          onSaved={() => { setSpendOpen(false); invalidate(); }}
        />
      )}
    </CrmShell>
  );
}

function CampaignDialog({
  campaign, defaultPrefill, onClose, onSaved,
}: { campaign: Campaign | null; defaultPrefill: string; onClose: () => void; onSaved: (c: Campaign) => void }) {
  const { t } = useCrmLabels();
  const [f, setF] = useState({
    name: campaign?.name ?? '',
    code: campaign?.code ?? '',
    platform: (campaign?.platform ?? 'FACEBOOK') as CampaignPlatform,
    status: (campaign?.status ?? 'ACTIVE') as CampaignStatus,
    startDate: campaign?.startDate?.slice(0, 10) ?? '',
    endDate: campaign?.endDate?.slice(0, 10) ?? '',
    budget: campaign?.budget ? String(campaign.budget) : '',
    prefillMessage: campaign?.prefillMessage ?? defaultPrefill,
    metaAdIds: (campaign?.metaAdIds ?? []).join(', '),
  });
  const mut = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name.trim(),
        code: f.code.trim().toUpperCase(),
        platform: f.platform,
        status: f.status,
        startDate: f.startDate || undefined,
        endDate: f.endDate || undefined,
        budget: f.budget ? Number(f.budget) : undefined,
        prefillMessage: f.prefillMessage.trim() || undefined,
        metaAdIds: adIds,
      };
      return campaign ? crmApi.updateCampaign(campaign.id, body) : crmApi.createCampaign(body);
    },
    onSuccess: (c) => { toast.success(t('crm.campaigns.saved', 'Campaign saved.')); onSaved(c); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const codeOk = /^[A-Za-z0-9][A-Za-z0-9_-]{1,23}$/.test(f.code.trim());
  const adIds = f.metaAdIds.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const adIdsOk = adIds.every((s) => /^\d{5,25}$/.test(s));
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto" srTitle={t('crm.campaigns.dialogTitle', 'Campaign')}>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{campaign ? t('crm.campaigns.editTitle', 'Edit campaign') : t('crm.campaigns.new', 'New campaign')}</DialogTitle>
          <DialogDescription>{t('crm.campaigns.codeHint', 'The code (for example FB-OKT1) goes at the end of the ad message so every lead can be traced back.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="cp-name">{t('crm.campaigns.name', 'Name')}</Label><Input id="cp-name" value={f.name} onChange={set('name')} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-code">{t('crm.campaigns.code', 'Unique code')}</Label>
            <Input id="cp-code" value={f.code} onChange={set('code')} placeholder="FB-OKT1" className="font-mono uppercase" aria-invalid={f.code !== '' && !codeOk} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-platform">{t('crm.campaigns.platformLabel', 'Platform')}</Label>
            <select id="cp-platform" className={nativeSelectClass} value={f.platform} onChange={set('platform')}>
              <option value="FACEBOOK">{t('crm.campaigns.platform.FACEBOOK', 'Facebook')}</option>
              <option value="INSTAGRAM">{t('crm.campaigns.platform.INSTAGRAM', 'Instagram')}</option>
              <option value="BOTH">{t('crm.campaigns.platform.BOTH', 'Facebook + Instagram')}</option>
              <option value="TIKTOK">{t('crm.campaigns.platform.TIKTOK', 'TikTok')}</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="cp-start">{t('crm.campaigns.start', 'Start')}</Label><MonomiDatePicker value={ymdToDate(f.startDate)} onChange={(d) => setF((p) => ({ ...p, startDate: d ? dateToYmd(d) : '' }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="cp-end">{t('crm.campaigns.end', 'End')}</Label><MonomiDatePicker value={ymdToDate(f.endDate)} onChange={(d) => setF((p) => ({ ...p, endDate: d ? dateToYmd(d) : '' }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="cp-budget">{t('crm.campaigns.budget', 'Budget')} (Rp)</Label><Input id="cp-budget" type="number" min={0} value={f.budget} onChange={set('budget')} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-status">{t('crm.campaigns.statusLabel', 'Status')}</Label>
            <select id="cp-status" className={nativeSelectClass} value={f.status} onChange={set('status')}>
              <option value="ACTIVE">{t('crm.campaigns.status.ACTIVE', 'Active')}</option>
              <option value="PAUSED">{t('crm.campaigns.status.PAUSED', 'Paused')}</option>
              <option value="ENDED">{t('crm.campaigns.status.ENDED', 'Ended')}</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cp-msg">{t('crm.campaigns.prefillLabel', 'Pre-filled message')}</Label>
            <textarea id="cp-msg" rows={3} className={textareaClass} value={f.prefillMessage} onChange={set('prefillMessage')} maxLength={1000} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cp-adids">{t('crm.campaigns.metaAdIds', 'Meta ad IDs (optional)')}</Label>
            <Input id="cp-adids" value={f.metaAdIds} onChange={set('metaAdIds')} placeholder="120211234567890, 120219876543210" className="font-mono" aria-invalid={!adIdsOk} />
            <p className="text-xs text-text-tertiary">{t('crm.campaigns.metaAdIdsHint', 'Chats from these Click-to-WhatsApp ads are linked to this campaign automatically, even without the code in the message. Find the ID in Ads Manager.')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>{t('crm.common.cancel', 'Cancel')}</Button>
          <Button type="button" disabled={!f.name.trim() || !codeOk || !adIdsOk || mut.isPending} onClick={() => mut.mutate()}>{t('crm.common.save', 'Save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpendDialog({ campaign, onClose, onSaved }: { campaign: Campaign; onClose: () => void; onSaved: () => void }) {
  const { t } = useCrmLabels();
  const today = wibDateStr(new Date());
  const [f, setF] = useState({ dateFrom: today, dateTo: today, amount: '', note: '' });
  const mut = useMutation({
    mutationFn: () => crmApi.addSpend(campaign.id, {
      dateFrom: f.dateFrom, dateTo: f.dateTo || f.dateFrom, amount: Number(f.amount), note: f.note.trim() || undefined,
    }),
    onSuccess: () => { toast.success(t('crm.campaigns.spendSaved', 'Cost logged.')); onSaved(); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const valid = f.dateFrom && Number(f.amount) > 0 && (!f.dateTo || f.dateTo >= f.dateFrom);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" srTitle={t('crm.campaigns.logSpend', 'Log other costs')}>
        <DialogHeader>
          <DialogTitle>{t('crm.campaigns.logSpend', 'Log other costs')} · {campaign.code}</DialogTitle>
          <DialogDescription>{t('crm.campaigns.spendHint', 'Costs that are not synced from Meta, for a day or a date range. Meta ad spend is added automatically.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="sp-from">{t('crm.campaigns.from', 'From')}</Label><MonomiDatePicker value={ymdToDate(f.dateFrom)} onChange={(d) => d && setF((p) => ({ ...p, dateFrom: dateToYmd(d), dateTo: p.dateTo && p.dateTo < dateToYmd(d) ? dateToYmd(d) : p.dateTo }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="sp-to">{t('crm.campaigns.to', 'To')}</Label><MonomiDatePicker value={ymdToDate(f.dateTo)} onChange={(d) => d && setF((p) => ({ ...p, dateTo: dateToYmd(d) }))} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sp-amount">{t('crm.campaigns.amount', 'Amount')} (Rp)</Label><Input id="sp-amount" type="number" inputMode="numeric" min={0} value={f.amount} onChange={set('amount')} autoFocus /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sp-note">{t('crm.campaigns.noteLabel', 'Note')}</Label><Input id="sp-note" value={f.note} onChange={set('note')} maxLength={300} /></div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>{t('crm.common.cancel', 'Cancel')}</Button>
          <Button type="button" disabled={!valid || mut.isPending} onClick={() => mut.mutate()}>{t('crm.common.save', 'Save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
