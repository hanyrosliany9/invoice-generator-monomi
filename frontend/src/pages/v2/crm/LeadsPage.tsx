import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LayoutGrid, List as ListIcon, Plus, Search, Settings2, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/monomi/PageHeader';
import { EmptyState } from '@/components/monomi/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ShortcutKeys } from '@/components/ui/kbd';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import {
  apiErrorMessage, crmApi, type Lead, type LeadFilters, type LeadList, type LeadStage,
} from '@/services/crm';
import { CrmShell, nativeSelectClass } from './CrmShell';
import { useCrmAssignees, useCrmBadges, useCrmCampaigns, useCrmStages } from './crmHooks';
import { useCrmLabels, displayPhone, idr, toNumber } from './crmUtils';
import { LeadBoard } from './LeadBoard';
import { LeadCard, LostDialog, SourceBadge, StageBadge, WaitPill, CodeBadge, MoveStageMenu, MoveButton } from './LeadParts';
import { openQuickAdd } from './quickAddBus';

type ViewMode = 'board' | 'list';
const VIEW_KEY = 'crm.leads.view';

const readView = (): ViewMode => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board';
  } catch {
    return 'board';
  }
};

const chip = (active: boolean, tone: 'warning' | 'neutral' = 'neutral') =>
  cn(
    'h-10 md:h-9 rounded-md border px-3 text-sm transition-colors whitespace-nowrap',
    active
      ? tone === 'warning'
        ? 'border-warning/60 bg-warning/10 font-medium text-warning'
        : 'border-ring/60 bg-bg-raised font-medium text-text-primary'
      : 'border-border-subtle bg-bg-sunken text-text-secondary hover:text-text-primary',
  );

export default function LeadsPage() {
  const { t, stageLabel, formatDateTime } = useCrmLabels();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const me = useAuthStore((s) => s.user);

  const [view, setView] = useState<ViewMode>(readView);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 300);
  const [campaignId, setCampaignId] = useState('');
  const [assignee, setAssignee] = useState('');
  const [uncontacted, setUncontacted] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [mobileStage, setMobileStage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lostTarget, setLostTarget] = useState<Lead | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem(VIEW_KEY, view); } catch { /* ignore */ }
  }, [view]);

  const filters: LeadFilters = useMemo(() => ({
    q: q || undefined,
    campaignId: campaignId || undefined,
    assignee: assignee || undefined,
    uncontacted: uncontacted || undefined,
    followUp: followUp ? 'due' : undefined,
    limit: 500,
  }), [q, campaignId, assignee, uncontacted, followUp]);

  const leadsQ = useQuery({
    queryKey: ['crm', 'leads', filters],
    queryFn: () => crmApi.listLeads(filters),
    refetchInterval: 60_000,
  });
  const { stages } = useCrmStages();
  const campaigns = useCrmCampaigns();
  const assignees = useCrmAssignees();
  const badges = useCrmBadges();
  const leads = leadsQ.data?.items ?? [];
  const threshold = leadsQ.data?.thresholdMinutes ?? badges.data?.thresholdMinutes ?? 15;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });

  const moveMut = useMutation({
    mutationFn: ({ lead, stage }: { lead: Lead; stage: LeadStage }) => crmApi.moveStage(lead.id, stage.id),
    onMutate: async ({ lead, stage }) => {
      await qc.cancelQueries({ queryKey: ['crm', 'leads'] });
      const prev = qc.getQueriesData<LeadList>({ queryKey: ['crm', 'leads'] });
      qc.setQueriesData<LeadList>({ queryKey: ['crm', 'leads'] }, (old) =>
        old ? { ...old, items: old.items.map((l) => (l.id === lead.id ? { ...l, stageId: stage.id, stage } : l)) } : old);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      ctx?.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(apiErrorMessage(err, t('crm.errors.move', 'Could not move the lead.')));
    },
    onSettled: invalidate,
  });

  const lostMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => crmApi.markLost(id, reason),
    onSuccess: () => { toast.success(t('crm.lost.done', 'Lead marked as lost.')); setLostTarget(null); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.move', 'Could not move the lead.'))),
    onSettled: invalidate,
  });

  const bulkMut = useMutation({
    mutationFn: (d: { assignedToId?: string | null; stageId?: string }) => crmApi.bulk([...selected], d),
    onSuccess: (r) => {
      toast.success(t('crm.list.bulkDone', '{{count}} leads updated.', { count: r.updated }));
      if (r.failed.length) toast.error(t('crm.list.bulkFailed', '{{n}} could not be updated.', { n: r.failed.length }));
      setSelected(new Set());
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.bulk', 'Bulk update failed.'))),
    onSettled: invalidate,
  });

  const handleMove = (lead: Lead, stage: LeadStage) => {
    if (stage.type === 'LOST') { setLostTarget(lead); return; }
    moveMut.mutate({ lead, stage });
  };

  const activeStageId = mobileStage ?? stages[0]?.id ?? null;
  const mobileLeads = leads.filter((l) => l.stageId === activeStageId);
  const unanswered = badges.data?.uncontacted ?? 0;
  const followUpsDue = badges.data?.followUpsDue ?? 0;
  const loading = leadsQ.isLoading || stages.length === 0;
  const filtered = !!(q || campaignId || assignee || uncontacted || followUp);

  const toggleSel = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <CrmShell wide>
      <PageHeader
        title={t('crm.leads.title', 'Leads')}
        description={t('crm.leads.subtitle', 'Every potential client from WhatsApp ads and other sources.')}
        actions={
          <>
            {!isMobile && (
              <div role="group" aria-label={t('crm.leads.view', 'View')} className="inline-flex rounded-md border border-border-subtle p-0.5">
                {(['board', 'list'] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={view === m}
                    onClick={() => setView(m)}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded px-3 text-sm', view === m ? 'bg-bg-raised font-medium text-text-primary' : 'text-text-secondary hover:text-text-primary')}
                  >
                    {m === 'board' ? <LayoutGrid className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
                    {m === 'board' ? t('crm.leads.board', 'Board') : t('crm.leads.list', 'List')}
                  </button>
                ))}
              </div>
            )}
            <Button asChild variant="ghost" size="icon" aria-label={t('crm.settings.open', 'CRM settings')} title={t('crm.settings.open', 'CRM settings')}>
              <Link to="/crm/settings"><Settings2 /></Link>
            </Button>
            <Button type="button" onClick={openQuickAdd} className="hidden gap-2 md:inline-flex">
              <Plus /> {t('crm.leads.new', 'New lead')}
              <span className="hidden md:inline"><ShortcutKeys id="crmQuickAdd" /></span>
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[220px] flex-1 basis-64">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('crm.leads.search', 'Search name, WhatsApp number, campaign code…')}
            aria-label={t('crm.leads.search', 'Search name, WhatsApp number, campaign code…')}
            className="pl-9"
          />
        </label>
        <select className={cn(nativeSelectClass, 'w-auto')} value={campaignId} onChange={(e) => setCampaignId(e.target.value)} aria-label={t('crm.leads.campaign', 'Campaign')}>
          <option value="">{t('crm.leads.campaignAll', 'Campaign: All')}</option>
          {(campaigns.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select>
        <select className={cn(nativeSelectClass, 'w-auto')} value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label={t('crm.leads.owner', 'Owner')}>
          <option value="">{t('crm.leads.ownerAll', 'Owner: All')}</option>
          <option value="me">{t('crm.leads.ownerMe', 'Mine')}</option>
          <option value="unassigned">{t('crm.leads.ownerNone', 'Unassigned')}</option>
          {(assignees.data ?? []).filter((a) => a.id !== me?.id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button type="button" aria-pressed={uncontacted} onClick={() => setUncontacted((v) => !v)} className={chip(uncontacted, 'warning')}>
          {t('crm.leads.unanswered', '{{n}} unanswered > {{min}} min', { n: unanswered, min: threshold })}
        </button>
        <button type="button" aria-pressed={followUp} onClick={() => setFollowUp((v) => !v)} className={chip(followUp)}>
          {t('crm.leads.followUpsToday', '{{count}} follow-ups today', { count: followUpsDue })}
        </button>
      </div>

      {isMobile && unanswered > 0 && !uncontacted && (
        <button type="button" onClick={() => setUncontacted(true)} className="mb-4 w-full rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-left text-sm text-warning">
          {t('crm.leads.unansweredBanner', '{{count}} leads unanswered for more than {{min}} minutes', { count: unanswered, min: threshold })}
        </button>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-[272px] shrink-0 rounded-xl" />)}
        </div>
      ) : leads.length === 0 && !filtered ? (
        <EmptyState
          icon={<UserPlus />}
          title={t('crm.leads.emptyTitle', 'No leads yet')}
          description={t('crm.leads.emptyDesc', 'Paste the first WhatsApp message from an ad and the lead is created for you.')}
          action={<Button type="button" onClick={openQuickAdd}><Plus /> {t('crm.leads.new', 'New lead')}</Button>}
        />
      ) : isMobile ? (
        <div>
          <div role="tablist" aria-label={t('crm.leads.stages', 'Stages')} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {stages.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={s.id === activeStageId}
                type="button"
                onClick={() => setMobileStage(s.id)}
                className={cn('h-10 shrink-0 rounded-full border px-4 text-sm', s.id === activeStageId ? 'border-ring/60 bg-bg-raised font-medium text-text-primary' : 'border-border-subtle text-text-secondary')}
              >
                {stageLabel(s)} <span className="ml-1 font-mono text-xs text-text-tertiary">{leads.filter((l) => l.stageId === s.id).length}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 pb-24">
            {mobileLeads.length === 0 && <p className="py-10 text-center text-sm text-text-tertiary">{t('crm.leads.emptyStage', 'No leads in this stage.')}</p>}
            {mobileLeads.map((l) => (
              <div key={l.id} onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button,[role="menuitem"]')) navigate(`/crm/leads/${l.id}`); }}>
                <LeadCard lead={l} stages={stages} onMove={(s) => handleMove(l, s)} />
              </div>
            ))}
          </div>
          <Button type="button" onClick={openQuickAdd} size="lg" className="fixed bottom-5 right-4 z-30 gap-2 rounded-full shadow-xl">
            <Plus /> {t('crm.leads.newShort', 'Lead')}
          </Button>
        </div>
      ) : view === 'board' ? (
        <LeadBoard stages={stages} leads={leads} onMove={handleMove} />
      ) : (
        <div>
          {selected.size > 0 && (
            <div role="region" aria-label={t('crm.list.bulk', 'Bulk actions')} className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-bg-raised px-3 py-2">
              <span className="text-sm font-medium">{t('crm.list.selected', '{{n}} selected', { n: selected.size })}</span>
              <select className={cn(nativeSelectClass, 'w-auto')} defaultValue="" aria-label={t('crm.list.assignTo', 'Assign to…')}
                onChange={(e) => { if (e.target.value) { bulkMut.mutate({ assignedToId: e.target.value === '__none__' ? null : e.target.value }); e.target.value = ''; } }}>
                <option value="">{t('crm.list.assignTo', 'Assign to…')}</option>
                <option value="__none__">{t('crm.leads.ownerNone', 'Unassigned')}</option>
                {(assignees.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select className={cn(nativeSelectClass, 'w-auto')} defaultValue="" aria-label={t('crm.list.moveTo', 'Move to stage…')}
                onChange={(e) => { if (e.target.value) { bulkMut.mutate({ stageId: e.target.value }); e.target.value = ''; } }}>
                <option value="">{t('crm.list.moveTo', 'Move to stage…')}</option>
                {stages.filter((s) => s.type !== 'LOST').map((s) => <option key={s.id} value={s.id}>{stageLabel(s)}</option>)}
              </select>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>{t('crm.common.clear', 'Clear')}</Button>
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-bg-sunken text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={t('crm.list.selectAll', 'Select all')}
                      checked={leads.length > 0 && selected.size === leads.length}
                      onChange={(e) => setSelected(e.target.checked ? new Set(leads.map((l) => l.id)) : new Set())}
                    />
                  </th>
                  <th className="px-3 py-2.5">{t('crm.list.lead', 'Lead')}</th>
                  <th className="px-3 py-2.5">{t('crm.list.stage', 'Stage')}</th>
                  <th className="px-3 py-2.5">{t('crm.list.campaign', 'Campaign')}</th>
                  <th className="px-3 py-2.5">{t('crm.list.owner', 'Owner')}</th>
                  <th className="px-3 py-2.5">{t('crm.list.followUp', 'Follow-up')}</th>
                  <th className="px-3 py-2.5 text-right">{t('crm.list.value', 'Estimate')}</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-border-subtle hover:bg-bg-raised/60">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" aria-label={t('crm.list.selectRow', 'Select {{name}}', { name: l.name })} checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Link to={`/crm/leads/${l.id}`} className="font-medium text-text-primary hover:underline">{l.name}</Link>
                        <WaitPill lead={l} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-text-secondary">
                        {displayPhone(l.phone)} <SourceBadge source={l.source} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><StageBadge stage={l.stage} /></td>
                    <td className="px-3 py-2.5">{l.campaignCode ? <CodeBadge code={l.campaignCode} /> : <span className="text-text-tertiary">-</span>}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{l.assignedTo?.name ?? '-'}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{l.followUpAt ? formatDateTime(l.followUpAt) : '-'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-text-secondary">{toNumber(l.estimatedValue) > 0 ? idr(toNumber(l.estimatedValue)) : '-'}</td>
                    <td className="px-2 py-2.5">
                      <MoveStageMenu stages={stages} currentStageId={l.stageId} onMove={(s) => handleMove(l, s)} trigger={<MoveButton label={t('crm.lead.moveTo', 'Move to…')} />} />
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-text-tertiary">{t('crm.leads.noMatch', 'No leads match these filters.')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LostDialog
        open={!!lostTarget}
        leadName={lostTarget?.name}
        busy={lostMut.isPending}
        onCancel={() => setLostTarget(null)}
        onConfirm={(reason) => lostTarget && lostMut.mutate({ id: lostTarget.id, reason })}
      />
    </CrmShell>
  );
}
