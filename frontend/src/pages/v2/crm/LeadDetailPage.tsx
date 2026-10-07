import { Fragment, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, ChevronDown, Hourglass, MessageCircle, MoreHorizontal, Pencil, Repeat, Trash2, XCircle } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { wibParts, wibToIso } from '@/utils/wib';
import {
  apiErrorMessage, crmApi, type ActivityType, type LeadActivity, type LeadDetail, type MetaEventName,
} from '@/services/crm';
import { CrmShell, nativeSelectClass, textareaClass } from './CrmShell';
import { useCrmAssignees, useCrmCampaigns, useCrmStages } from './crmHooks';
import {
  displayPhone, idr, isWaitingLead, parseActivityBody, parseReturningClient, returningClientText, toNumber, unescapeActivityText,
  useCrmLabels, waitingOutcomeText, waLink,
} from './crmUtils';
import { CodeBadge, LostDialog, MoveStageMenu, SourceBadge, StageBadge, WaitingBadge } from './LeadParts';
import { ConvertDialog } from './ConvertDialog';
import { AdClickSection } from './AdClickSection';
import { LeadWhatsAppPanel } from './whatsapp/LeadWhatsAppPanel';

const META_EVENTS: MetaEventName[] = ['LeadSubmitted', 'QualifiedLead', 'Purchase'];
const pad = (n: number) => String(n).padStart(2, '0');

/** ISO instant -> "YYYY-MM-DDTHH:mm" in WIB for <input type="datetime-local">. */
const toWibInput = (iso: string | null): string => {
  if (!iso) return '';
  const p = wibParts(iso);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};
const fromWibInput = (v: string): string | null => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  return m ? wibToIso(+m[1], +m[2], +m[3], +m[4], +m[5]) : null;
};
const inWib = (days: number, hour: number): string => {
  const now = new Date(Date.now() + days * 86400000);
  const p = wibParts(now);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(hour)}:00`;
};

type Composer = 'NOTE' | 'CALL' | 'WHATSAPP' | 'MEETING';

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <GlassPanel padding="none" className={cn('p-5', className)}>
      <h2 className="mb-3 text-sm font-semibold text-text-primary">{title}</h2>
      {children}
    </GlassPanel>
  );
}

function ActivityRow({ a, lead }: { a: LeadActivity; lead: LeadDetail }) {
  const { t, stageLabel, sourceLabel, formatDateTime, activityText } = useCrmLabels();
  const who = a.actor?.name;
  const meta = a.metaEvent ? <span className="text-text-tertiary"> · {t('crm.history.meta', 'Meta: {{event}}', { event: a.metaEvent })}</span> : null;
  let body: React.ReactNode;
  switch (a.type) {
    case 'STAGE_CHANGE':
      if (!a.fromStage) {
        body = (
          <>
            {lead.source === 'WHATSAPP_CTWA' || lead.source === 'WHATSAPP_ORGANIC'
              ? t('crm.history.newChat', 'New chat ({{source}})', { source: sourceLabel(lead.source) })
              : t('crm.history.created', 'Lead created ({{source}})', { source: sourceLabel(lead.source) })}
            {lead.campaignCode && <> <CodeBadge code={lead.campaignCode} /></>}
            {a.body ? <>: “{activityText(a.body)}”</> : null}
            {meta}
          </>
        );
      } else {
        body = (
          <>
            {t('crm.history.stageChanged', 'Stage changed')}{' '}
            <strong>{stageLabel(a.fromStage)} → {stageLabel(a.toStage)}</strong>
            {who ? <> {t('crm.history.by', 'by {{name}}', { name: who })}</> : <> {t('crm.history.auto', '(automatic)')}</>}
            {a.body ? <>: {activityText(a.body)}</> : null}
            {meta}
          </>
        );
      }
      break;
    case 'NOTE': {
      const parsed = parseActivityBody(a.body);
      const returning = parsed?.key === 'lead.returningClient' ? parseReturningClient(parsed.text) : null;
      body = (
        <>
          {returning ? (
            <Link className="underline underline-offset-2" to={`/crm/leads/${encodeURIComponent(returning.id)}`} data-testid="returning-client-link">
              {returningClientText(t, returning)}
            </Link>
          ) : parsed ? activityText(a.body) : <>{t('crm.history.note', 'Note')}: {unescapeActivityText(a.body ?? '')}</>}
          {who ? <span className="text-text-tertiary"> · {who}</span> : null}
        </>
      );
      break;
    }
    case 'CALL': body = <>{t('crm.history.call', 'Call')}: {unescapeActivityText(a.body ?? '')}{who ? <span className="text-text-tertiary"> · {who}</span> : null}</>; break;
    case 'WHATSAPP': body = <>{parseActivityBody(a.body) ? activityText(a.body) : <>{t('crm.history.wa', 'WhatsApp message')}: {unescapeActivityText(a.body ?? '')}</>}{who ? <span className="text-text-tertiary"> · {who}</span> : null}</>; break;
    case 'MEETING': body = <>{t('crm.history.meeting', 'Meeting')}: {unescapeActivityText(a.body ?? '')}{who ? <span className="text-text-tertiary"> · {who}</span> : null}</>; break;
    case 'FOLLOW_UP_SET': body = <>{t('crm.history.followSet', 'Follow-up scheduled')}{a.body ? `: ${a.body}` : ''}</>; break;
    case 'FOLLOW_UP_DONE': body = <>{t('crm.history.followDone', 'Follow-up done')}{a.body ? `: ${a.body}` : ''}</>; break;
    case 'CONVERTED': body = <>{t('crm.history.converted', 'Converted')}{a.body ? `: ${activityText(a.body)}` : ''}</>; break;
    case 'ASSIGNED': body = <>{t('crm.history.assigned', 'Assigned to {{name}}', { name: a.body ?? '-' })}{who ? <span className="text-text-tertiary"> · {who}</span> : null}</>; break;
    default: body = a.body;
  }
  return (
    <li className="relative border-l border-border-subtle pb-4 pl-4 last:pb-0">
      <span aria-hidden className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-text-tertiary" />
      <div className="font-mono text-[11px] text-text-tertiary">{formatDateTime(a.createdAt)}</div>
      <div className="mt-0.5 break-words text-sm text-text-primary">{body}</div>
    </li>
  );
}

/**
 * A lead auto-created from the landing-page form has no number until its
 * WhatsApp chat arrives. Pasting that chat in quick-add fills it in; this
 * field does the same with just the number (fill in, or merge into the lead
 * that already has it).
 */
function WaitingBanner({ lead, onResolved }: { lead: LeadDetail; onResolved: (d: LeadDetail) => void }) {
  const { t } = useCrmLabels();
  const [phone, setPhone] = useState('');
  const mut = useMutation({
    mutationFn: () => crmApi.addPhone(lead.id, phone.trim()),
    onSuccess: (d) => { setPhone(''); onResolved(d); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const canSave = phone.replace(/\D/g, '').length >= 8 && !mut.isPending;
  return (
    <div data-testid="waiting-banner" className="mb-4 rounded-lg border border-info/40 bg-info/10 p-3 text-sm">
      <div className="flex items-start gap-2.5">
        <Hourglass aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-info" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary">
            {t('crm.waiting.banner', 'No phone yet — waiting for the WhatsApp message with Kode {{ref}}', { ref: lead.adClick?.ref ?? '—' })}
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {t('crm.waiting.bannerSub', 'When the chat arrives, paste it in Add lead (Ctrl+Shift+L): this lead gets the number and no new lead is made.')}
          </p>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => { e.preventDefault(); if (canSave) mut.mutate(); }}
          >
            <div className="min-w-0 space-y-1 sm:w-64">
              <Label htmlFor="waiting-add-phone" className="text-xs">{t('crm.waiting.addPhone', 'Add phone')}</Label>
              <Input
                id="waiting-add-phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={40}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+62 812-3456-7890"
              />
            </div>
            <Button type="submit" variant="outline" disabled={!canSave}>{t('crm.waiting.addPhoneSave', 'Save number')}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const { id = '' } = useParams();
  const { t, formatDateTime, formatWait, metaStatusLabel, metaRouteLabel } = useCrmLabels();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { stages } = useCrmStages();
  const assignees = useCrmAssignees();
  const campaigns = useCrmCampaigns();

  const leadQ = useQuery({ queryKey: ['crm', 'lead', id], queryFn: () => crmApi.getLead(id), enabled: !!id });
  const lead = leadQ.data;

  const [composer, setComposer] = useState<Composer>('NOTE');
  const [text, setText] = useState('');
  const [lostOpen, setLostOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [followAt, setFollowAt] = useState('');
  const [followNote, setFollowNote] = useState('');
  const [followOpen, setFollowOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'activity' | 'whatsapp'>('activity');

  const onData = (d: LeadDetail) => {
    qc.setQueryData(['crm', 'lead', id], d);
    qc.invalidateQueries({ queryKey: ['crm', 'leads'] });
    qc.invalidateQueries({ queryKey: ['crm', 'badges'] });
  };
  const onErr = (fb: string) => (err: unknown) => toast.error(apiErrorMessage(err, fb));
  /** A waiting lead got its number: stay here, or open the lead it was merged into. */
  const onWaitingResolved = (d: LeadDetail) => {
    if (d.waitingOutcome) toast.success(waitingOutcomeText(t, d.waitingOutcome, d.name));
    if (d.id !== id) {
      qc.invalidateQueries({ queryKey: ['crm'] });
      navigate(`/crm/leads/${d.id}`);
      return;
    }
    onData(d);
  };

  const moveMut = useMutation({
    mutationFn: (stageId: string) => crmApi.moveStage(id, stageId),
    onSuccess: onData, onError: onErr(t('crm.errors.move', 'Could not move the lead.')),
  });
  const lostMut = useMutation({
    mutationFn: (reason: string) => crmApi.markLost(id, reason),
    onSuccess: (d) => { onData(d); setLostOpen(false); toast.success(t('crm.lost.done', 'Lead marked as lost.')); },
    onError: onErr(t('crm.errors.move', 'Could not move the lead.')),
  });
  const activityMut = useMutation({
    mutationFn: (v: { type: Composer; body?: string }) => crmApi.addActivity(id, v.type, v.body),
    onSuccess: (d) => { onData(d); setText(''); },
    onError: onErr(t('crm.errors.activity', 'Could not save the activity.')),
  });
  const followMut = useMutation({
    mutationFn: () => crmApi.setFollowUp(id, fromWibInput(followAt) as string, followNote.trim() || undefined),
    onSuccess: (d) => { onData(d); setFollowOpen(false); },
    onError: onErr(t('crm.errors.followUp', 'Could not save the follow-up.')),
  });
  const followDoneMut = useMutation({
    mutationFn: () => crmApi.followUpDone(id),
    onSuccess: onData, onError: onErr(t('crm.errors.followUp', 'Could not save the follow-up.')),
  });
  const assignMut = useMutation({
    mutationFn: (userId: string | null) => crmApi.assign(id, userId),
    onSuccess: onData, onError: onErr(t('crm.errors.assign', 'Could not assign the lead.')),
  });
  const deleteMut = useMutation({
    mutationFn: () => crmApi.deleteLead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm'] }); toast.success(t('crm.lead.deleted', 'Lead deleted.')); navigate('/crm/leads'); },
    onError: onErr(t('crm.errors.delete', 'Could not delete the lead.')),
  });

  const saveActivity = () => { if (text.trim()) activityMut.mutate({ type: composer, body: text.trim() }); };

  if (leadQ.isLoading || !lead) {
    return (
      <CrmShell>
        {leadQ.isError
          ? <p className="py-20 text-center text-text-secondary">{t('crm.lead.notFound', 'Lead not found.')} <Link className="underline" to="/crm/leads">{t('crm.lead.back', 'Back to leads')}</Link></p>
          : <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64 w-full" /></div>}
      </CrmShell>
    );
  }

  const wa = waLink(lead.phone);
  const open = lead.stage.type === 'OPEN';
  const value = toNumber(lead.estimatedValue);
  const openStageFollowUpOverdue = lead.followUpAt && new Date(lead.followUpAt).getTime() < Date.now();
  const timeline = [...lead.activities];
  const composerTabs: Array<[Composer, string]> = [
    ['NOTE', t('crm.composer.note', 'Note')],
    ['CALL', t('crm.composer.call', 'Call')],
    ['WHATSAPP', t('crm.composer.wa', 'WA message')],
    ['MEETING', t('crm.composer.meeting', 'Meeting')],
  ];

  const onChatClick = () => {
    // The first reply clock stops when someone opens the chat.
    if (!lead.firstResponseAt) activityMut.mutate({ type: 'WHATSAPP', body: t('crm.lead.openedChat', 'Opened WhatsApp chat') });
  };

  return (
    <CrmShell>
      <Link to="/crm/leads" className="mb-4 inline-block text-sm text-text-secondary hover:text-text-primary">← {t('crm.lead.backBoard', 'Back to board')}</Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StageBadge stage={lead.stage} />
            <SourceBadge source={lead.source} />
            {lead.campaignCode && <CodeBadge code={lead.campaignCode} />}
            {isWaitingLead(lead) && <WaitingBadge />}
            {lead.isUncontacted && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                {t('crm.lead.waitingFor', 'No reply for {{time}}', { time: formatWait(lead.waitingMinutes) })}
              </span>
            )}
          </div>
          <h1 className="break-words font-display text-4xl font-normal leading-[1.05] tracking-[-0.012em] sm:text-[44px]">{lead.name}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {[
              lead.phone ? <span key="p" className="font-mono">{displayPhone(lead.phone)}</span> : (
                <span key="p" className="text-text-tertiary">{t('crm.waiting.noPhone', 'No phone yet')}</span>
              ),
              lead.company && lead.company !== lead.name ? <span key="c">{lead.company}</span> : null,
              lead.email ? <span key="e">{lead.email}</span> : null,
            ].filter(Boolean).map((n, i) => <Fragment key={i}>{i > 0 ? ' · ' : ''}{n}</Fragment>)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {wa ? (
            <Button asChild variant="outline" className="gap-2">
              <a href={wa} target="_blank" rel="noopener noreferrer" onClick={onChatClick}><MessageCircle /> {t('crm.lead.chat', 'Chat on WhatsApp')}</a>
            </Button>
          ) : null}
          <MoveStageMenu
            stages={stages}
            currentStageId={lead.stageId}
            onMove={(s) => (s.type === 'LOST' ? setLostOpen(true) : moveMut.mutate(s.id))}
            trigger={<Button type="button" variant="outline" className="gap-2">{t('crm.lead.moveStage', 'Move stage')} <ChevronDown /></Button>}
          />
          <Button type="button" className="hidden lg:inline-flex" onClick={() => setConvertOpen(true)} disabled={lead.stage.type === 'LOST'}>
            {lead.quotationId ? t('crm.lead.convertMore', 'Convert again') : t('crm.lead.convert', 'Convert to Client & Create Quotation')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label={t('crm.lead.more', 'More actions')}><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-bg-raised border-border-subtle text-text-primary">
              <DropdownMenuItem onSelect={() => setEditOpen(true)} className="gap-2"><Pencil className="h-4 w-4" />{t('crm.lead.edit', 'Edit details')}</DropdownMenuItem>
              {open && <DropdownMenuItem onSelect={() => setLostOpen(true)} className="gap-2"><XCircle className="h-4 w-4" />{t('crm.lead.markLost', 'Mark as lost')}</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => { if (window.confirm(t('crm.lead.deleteConfirm', 'Delete this lead and its history?'))) deleteMut.mutate(); }}
                className="gap-2 text-danger focus:text-danger"
              ><Trash2 className="h-4 w-4" />{t('crm.lead.delete', 'Delete lead')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isWaitingLead(lead) && <WaitingBanner lead={lead} onResolved={onWaitingResolved} />}

      {lead.stage.type === 'LOST' && lead.lostReason && (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {t('crm.lead.lostBecause', 'Lost: {{reason}}', { reason: lead.lostReason })}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div role="tablist" aria-label={t('crm.lead.tabs', 'Lead sections')} className="flex gap-2">
            {([['activity', t('crm.lead.tabActivity', 'Activity')], ['whatsapp', t('crm.lead.tabWhatsApp', 'WhatsApp')]] as Array<['activity' | 'whatsapp', string]>).map(([k, label]) => (
              <button
                key={k} type="button" role="tab" aria-selected={mainTab === k} onClick={() => setMainTab(k)}
                className={cn('inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm', mainTab === k ? 'border-ring/60 bg-bg-raised font-medium text-text-primary' : 'border-border-subtle text-text-secondary hover:text-text-primary')}
              >
                {k === 'whatsapp' && <MessageCircle className="h-4 w-4" />}{label}
              </button>
            ))}
          </div>
          {mainTab === 'whatsapp' ? <LeadWhatsAppPanel leadId={lead.id} /> : (<>
          <Section title={t('crm.composer.title', 'Add activity')}>
            <div role="tablist" className="mb-3 flex flex-wrap gap-2">
              {composerTabs.map(([k, label]) => (
                <button
                  key={k} role="tab" aria-selected={composer === k} type="button" onClick={() => setComposer(k)}
                  className={cn('h-9 rounded-md border px-3 text-sm', composer === k ? 'border-ring/60 bg-bg-raised font-medium text-text-primary' : 'border-border-subtle text-text-secondary hover:text-text-primary')}
                >{label}</button>
              ))}
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveActivity(); } }}
              placeholder={t('crm.composer.placeholder', 'e.g. Client needs 4 Reels per month, budget around Rp 12M.')}
              aria-label={t('crm.composer.title', 'Add activity')}
              className={textareaClass}
            />
            <div className="mt-3 flex justify-end">
              <Button type="button" disabled={!text.trim() || activityMut.isPending} onClick={saveActivity}>{t('crm.common.save', 'Save')}</Button>
            </div>
          </Section>

          <Section title={t('crm.history.title', 'History')}>
            <ol className="ml-1">
              {[
                ...timeline.map((a) => ({ at: a.createdAt, key: a.id, node: <ActivityRow a={a} lead={lead} /> })),
                ...(lead.firstResponseAt
                  ? [{
                      at: lead.firstResponseAt,
                      key: 'first-reply',
                      node: (
                        <li className="relative border-l border-border-subtle pb-4 pl-4 last:pb-0">
                          <span aria-hidden className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-success" />
                          <div className="font-mono text-[11px] text-text-tertiary">{formatDateTime(lead.firstResponseAt)}</div>
                          <div className="mt-0.5 text-sm">
                            {t('crm.history.firstReply', 'First reply')} <span className="text-text-tertiary">({t('crm.history.responseTime', 'response time {{time}}', { time: formatWait(lead.firstResponseMinutes) })})</span>
                          </div>
                        </li>
                      ),
                    }]
                  : []),
              ]
                .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
                .map((it) => <Fragment key={it.key}>{it.node}</Fragment>)}
            </ol>
          </Section>
          </>)}
        </div>

        <aside className="space-y-5">
          <Section title={t('crm.info.title', 'Lead info')}>
            <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-sm">
              <dt className="text-text-tertiary">{t('crm.info.owner', 'Owner')}</dt>
              <dd>
                <select
                  className={cn(nativeSelectClass, 'h-8 md:h-8')}
                  value={lead.assignedToId ?? ''}
                  onChange={(e) => assignMut.mutate(e.target.value || null)}
                  aria-label={t('crm.info.owner', 'Owner')}
                >
                  <option value="">{t('crm.leads.ownerNone', 'Unassigned')}</option>
                  {(assignees.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </dd>
              <dt className="text-text-tertiary">{t('crm.info.estimate', 'Estimate')}</dt>
              <dd className="font-mono">{value > 0 ? idr(value) : '-'}</dd>
              <dt className="text-text-tertiary">{t('crm.info.source', 'Source')}</dt>
              <dd><SourceBadge source={lead.source} /></dd>
              <dt className="text-text-tertiary">{t('crm.info.campaign', 'Campaign')}</dt>
              <dd>{lead.campaign ? lead.campaign.name : '-'}</dd>
              {lead.instagramHandle && (
                <>
                  <dt className="text-text-tertiary">{t('crm.info.instagram', 'Instagram')}</dt>
                  <dd className="min-w-0 break-all">
                    <a className="underline underline-offset-2" href={`https://instagram.com/${encodeURIComponent(lead.instagramHandle)}`} target="_blank" rel="noopener noreferrer" data-testid="lead-instagram">@{lead.instagramHandle}</a>
                  </dd>
                </>
              )}
              {lead.company && (
                <>
                  <dt className="text-text-tertiary">{t('crm.info.brand', 'Brand')}</dt>
                  <dd className="min-w-0 break-words" data-testid="lead-brand">{lead.company}</dd>
                </>
              )}
              {lead.category && (
                <>
                  <dt className="text-text-tertiary">{t('crm.info.category', 'Category')}</dt>
                  <dd className="min-w-0 break-words" data-testid="lead-category">{lead.category}</dd>
                </>
              )}
              <dt className="text-text-tertiary">{t('crm.info.firstChat', 'First chat')}</dt>
              <dd>{formatDateTime(lead.firstContactAt)}</dd>
              {(lead.client || lead.project || lead.quotation) && (
                <>
                  <dt className="text-text-tertiary">{t('crm.info.linked', 'Linked')}</dt>
                  <dd className="flex flex-col gap-1">
                    {lead.client && <Link className="underline underline-offset-2" to={`/clients/${lead.client.id}`}>{lead.client.name}</Link>}
                    {lead.project && <Link className="underline underline-offset-2" to={`/projects/${lead.project.id}`}>{lead.project.number}</Link>}
                    {lead.quotation && <Link className="underline underline-offset-2" to={`/quotations/${lead.quotation.id}`}>{lead.quotation.quotationNumber} · {lead.quotation.status}</Link>}
                  </dd>
                </>
              )}
            </dl>
          </Section>

          <Section title={t('crm.adClick.title', 'Ad click')}>
            <AdClickSection lead={lead} onData={onData} onWaitingResolved={onWaitingResolved} />
          </Section>

          <Section title={t('crm.follow.title', 'Follow-up')}>
            {lead.followUpAt ? (
              <div>
                <div className={cn('flex items-start gap-2 text-sm', openStageFollowUpOverdue ? 'text-warning' : 'text-text-primary')}>
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formatDateTime(lead.followUpAt)} WIB{lead.followUpNote ? ` — ${lead.followUpNote}` : ''}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={followDoneMut.isPending} onClick={() => followDoneMut.mutate()}>{t('crm.follow.done', 'Mark done')}</Button>
                  <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => { setFollowAt(toWibInput(lead.followUpAt)); setFollowNote(lead.followUpNote ?? ''); setFollowOpen(true); }}>
                    <Repeat className="h-3.5 w-3.5" />{t('crm.follow.reschedule', 'Reschedule')}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm text-text-tertiary">{t('crm.follow.none', 'No follow-up scheduled.')}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => { setFollowAt(inWib(0, 15)); setFollowNote(''); setFollowOpen(true); }}>
                  {t('crm.follow.set', 'Schedule follow-up')}
                </Button>
              </div>
            )}
          </Section>

          <Section title={t('crm.meta.title', 'Events sent to Meta')}>
            <p className="mb-3 text-xs text-text-tertiary">{t('crm.meta.desc', 'Sent automatically once Meta approves our permissions.')}</p>
            <ul className="space-y-2">
              {lead.adClick && lead.adClickEvent && (
                <li className="text-sm" data-testid="meta-row-lead-click">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs">Lead</span>
                    <span className={cn('text-xs', lead.adClickEvent.status === 'SENT' ? 'text-success' : lead.adClickEvent.status === 'FAILED' ? 'text-danger' : 'text-warning')}>
                      {metaStatusLabel({ eventName: 'LeadSubmitted', status: lead.adClickEvent.status }, 'LeadSubmitted')}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-tertiary">{t('crm.meta.route.leadAtClick', 'Lead (sent when the button was tapped)')} · {t('crm.meta.route.website', 'Matched via website click')}</div>
                </li>
              )}
              {META_EVENTS.filter((name) => !(lead.adClick && name === 'LeadSubmitted')).map((name) => {
                const row = lead.metaEvents.find((e) => e.eventName === name);
                const route = metaRouteLabel(row, !!lead.ctwaClid);
                return (
                  <li key={name} className="text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs">{name}</span>
                      <span className={cn('text-xs', row ? (row.status === 'SENT' ? 'text-success' : row.status === 'FAILED' ? 'text-danger' : 'text-warning') : 'text-text-tertiary')}>
                        {metaStatusLabel(row, name)}
                      </span>
                    </div>
                    {route && <div className="text-[11px] text-text-tertiary" data-testid={`meta-route-${name}`}>{route}</div>}
                  </li>
                );
              })}
            </ul>
          </Section>
        </aside>
      </div>

      {/* Mobile: the primary action stays reachable */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border-subtle bg-bg-base/90 p-3 backdrop-blur lg:hidden">
        <Button type="button" className="w-full" size="lg" onClick={() => setConvertOpen(true)} disabled={lead.stage.type === 'LOST'}>
          {t('crm.lead.convert', 'Convert to Client & Create Quotation')}
        </Button>
      </div>

      <LostDialog open={lostOpen} leadName={lead.name} busy={lostMut.isPending} onCancel={() => setLostOpen(false)} onConfirm={(r) => lostMut.mutate(r)} />
      {convertOpen && <ConvertDialog lead={lead} open={convertOpen} onOpenChange={setConvertOpen} />}
      {editOpen && (
        <EditLeadDialog
          lead={lead}
          campaigns={(campaigns.data ?? []).map((c) => ({ id: c.id, label: `${c.code} · ${c.name}` }))}
          onClose={() => setEditOpen(false)}
          onSaved={(d) => { onData(d); setEditOpen(false); }}
        />
      )}

      <Dialog open={followOpen} onOpenChange={setFollowOpen}>
        <DialogContent className="max-w-md" srTitle={t('crm.follow.title', 'Follow-up')}>
          <DialogHeader><DialogTitle>{t('crm.follow.title', 'Follow-up')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {([['crm.follow.today', 'Today 15:00', 0, 15], ['crm.follow.tomorrow', 'Tomorrow 10:00', 1, 10], ['crm.follow.in3', 'In 3 days', 3, 10]] as Array<[string, string, number, number]>).map(([k, fb, d, h]) => (
                <button key={k} type="button" onClick={() => setFollowAt(inWib(d, h))} className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-secondary hover:text-text-primary">{t(k, fb)}</button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-at">{t('crm.follow.when', 'When (WIB)')}</Label>
              <Input id="fu-at" type="datetime-local" value={followAt} onChange={(e) => setFollowAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-note">{t('crm.follow.note', 'What to do')}</Label>
              <Input id="fu-note" value={followNote} maxLength={300} onChange={(e) => setFollowNote(e.target.value)} placeholder={t('crm.follow.notePlaceholder', 'e.g. send portfolio samples')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setFollowOpen(false)}>{t('crm.common.cancel', 'Cancel')}</Button>
            <Button type="button" disabled={!fromWibInput(followAt) || followMut.isPending} onClick={() => followMut.mutate()}>{t('crm.common.save', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CrmShell>
  );
}

function EditLeadDialog({
  lead, campaigns, onClose, onSaved,
}: {
  lead: LeadDetail;
  campaigns: Array<{ id: string; label: string }>;
  onClose: () => void;
  onSaved: (d: LeadDetail) => void;
}) {
  const { t } = useCrmLabels();
  const [f, setF] = useState({
    name: lead.name,
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    company: lead.company ?? '',
    estimatedValue: String(toNumber(lead.estimatedValue) || ''),
    campaignId: lead.campaignId ?? '',
  });
  const mut = useMutation({
    mutationFn: () => crmApi.updateLead(lead.id, {
      name: f.name.trim(),
      phone: f.phone.trim() || null,
      email: f.email.trim() || undefined,
      company: f.company.trim() || null,
      estimatedValue: f.estimatedValue ? Number(f.estimatedValue) : 0,
      campaignId: f.campaignId || null,
    } as never),
    onSuccess: onSaved,
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" srTitle={t('crm.lead.edit', 'Edit details')}>
        <DialogHeader><DialogTitle>{t('crm.lead.edit', 'Edit details')}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="ed-name">{t('crm.quick.name', 'Name')}</Label><Input id="ed-name" value={f.name} onChange={set('name')} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed-phone">{t('crm.quick.phone', 'WhatsApp number')}</Label><Input id="ed-phone" type="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed-company">{t('crm.edit.company', 'Company')}</Label><Input id="ed-company" value={f.company} onChange={set('company')} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed-email">{t('crm.edit.email', 'Email')}</Label><Input id="ed-email" type="email" value={f.email} onChange={set('email')} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed-value">{t('crm.info.estimate', 'Estimate')} (Rp)</Label><Input id="ed-value" type="number" min={0} value={f.estimatedValue} onChange={set('estimatedValue')} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-camp">{t('crm.info.campaign', 'Campaign')}</Label>
            <select id="ed-camp" className={nativeSelectClass} value={f.campaignId} onChange={set('campaignId')}>
              <option value="">{t('crm.quick.noCampaign', 'No campaign')}</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>{t('crm.common.cancel', 'Cancel')}</Button>
          <Button type="button" disabled={!f.name.trim() || mut.isPending} onClick={() => mut.mutate()}>{t('crm.common.save', 'Save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ActivityType };
