import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Clapperboard, ListChecks, CalendarRange,
  FileText, Presentation, Images, ExternalLink, ChevronRight,
  Share2, Copy, RefreshCw, Trash2, Check, Link as LinkIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { UserChip } from '@/components/monomi/UserChip';
import { PageContainer } from '@/components/monomi/PageContainer';
import { useAuthStore } from '@/store/auth';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { projectService } from '@/services/projects';
import { shotListsApi } from '@/services/shotLists';
import { schedulesApi } from '@/services/schedules';
import { decksApi } from '@/services/decks';
import { callSheetsApi } from '@/services/callSheets';
import { mediaCollabService } from '@/services/media-collab';

/* ------------------------------------------------------------------ */
/*  One tool card — icon, title, count badge, list of items + create   */
/* ------------------------------------------------------------------ */
function ToolCard({
  icon,
  title,
  description,
  count,
  loading,
  onNew,
  newLabel,
  children,
  accentClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  loading: boolean;
  onNew: () => void;
  newLabel: string;
  children: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <GlassPanel surface="glass" padding="lg" className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accentClass ?? 'bg-bg-raised border border-border-subtle')}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{title}</span>
              {!loading && (
                <Badge variant="secondary" className="text-[10px] tabular-nums">{count}</Badge>
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <Button size="sm" className="shrink-0" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />
          {newLabel}
        </Button>
      </div>

      {/* Item list */}
      <div className="flex-1 min-h-[120px]">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
          </div>
        ) : (
          children
        )}
      </div>
    </GlassPanel>
  );
}

/* ------------------------------------------------------------------ */
/*  Generic item row inside a tool card                                */
/* ------------------------------------------------------------------ */
function ItemRow({
  primary,
  secondary,
  meta,
  onClick,
}: {
  primary: string;
  secondary?: string;
  meta?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 text-left rounded-md hover:bg-bg-sunken/50 transition-colors group"
    >
      <div className="min-w-0">
        <div className="text-sm text-text-primary truncate">{primary}</div>
        {secondary && <div className="text-xs text-text-tertiary truncate mt-0.5">{secondary}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-3 text-xs text-text-tertiary">
        {meta}
        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */
export default function ProductionHubPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  });

  const { data: shotLists = [], isLoading: slLoading } = useQuery({
    queryKey: ['shot-lists', 'by-project', id],
    queryFn: () => shotListsApi.getByProject(id!),
    enabled: !!id,
  });

  const { data: schedules = [], isLoading: schLoading } = useQuery({
    queryKey: ['schedules', 'by-project', id],
    queryFn: () => schedulesApi.getByProject(id!),
    enabled: !!id,
  });

  const { data: callSheets = [], isLoading: csLoading } = useQuery({
    queryKey: ['call-sheets', 'by-project', id],
    queryFn: () => callSheetsApi.getByProject(id!),
    enabled: !!id,
  });

  const { data: decks = [], isLoading: deckLoading } = useQuery({
    queryKey: ['decks', 'by-project', id],
    queryFn: () => decksApi.getAll({ projectId: id }),
    enabled: !!id,
  });

  const { data: mediaProjects = [], isLoading: mpLoading } = useQuery({
    queryKey: ['media-projects', 'by-biz-project', id],
    queryFn: () => mediaCollabService.getProjectsByBizProject(id!),
    enabled: !!id,
  });

  // Project token (for guest access)
  const { data: tokenData, isLoading: tokenLoading } = useQuery({
    queryKey: ['project', id, 'hub-token'],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}`);
      const p = res.data.data as { productionHubToken?: string; productionHubTokenAt?: string };
      return { token: p.productionHubToken ?? null, generatedAt: p.productionHubTokenAt ?? null };
    },
    enabled: !!id,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiClient.post(`/projects/${id}/production-hub/token`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'hub-token'] });
      toast.success('Guest link generated');
    },
    onError: () => toast.error('Failed to generate link'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => apiClient.delete(`/projects/${id}/production-hub/token`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'hub-token'] });
      toast.success('Guest link revoked');
    },
    onError: () => toast.error('Failed to revoke link'),
  });

  const guestUrl = tokenData?.token
    ? `${window.location.origin}/guest/hub/${tokenData.token}`
    : null;

  function copyLink() {
    if (!guestUrl) return;
    navigator.clipboard.writeText(guestUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const fromParam = encodeURIComponent(`/projects/${id}/production`);
  const backTo = `/projects/${id}`;

  const totalItems = shotLists.length + schedules.length + callSheets.length + decks.length + mediaProjects.length;

  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer>
        {/* Back link */}
        <div className="mb-4">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {projectLoading ? t('common.back', 'Back') : `${project?.number || ''} ${project?.description || ''}`.trim() || t('common.back', 'Back')}
          </Link>
        </div>

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-navy-wash border border-accent-navy/20">
              <Clapperboard className="h-6 w-6 text-accent-navy" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">{t('productionHub.title', 'Production Hub')}</h1>
              <p className="text-sm text-text-secondary mt-0.5">
                {projectLoading ? (
                  <Skeleton className="h-4 w-48 inline-block" />
                ) : (
                  `${project?.number || ''} · ${project?.description || ''}`.replace(/^·\s*/, '')
                )}
              </p>
            </div>
          </div>
          {!projectLoading && totalItems > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
              {t('productionHub.totalItems', '{{count}} items', { count: totalItems })}
            </Badge>
          )}
        </div>

        {/* ── Guest Access / Share Hub ─────────────────────────────── */}
        <GlassPanel surface="glass" padding="lg" className="mb-8">
          <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-raised border border-border-subtle">
              <Share2 className="h-5 w-5 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">{t('productionHub.shareTitle', 'Guest Access Link')}</p>
              <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">
                {t('productionHub.shareDesc', 'Share a read-only link with your client. They can view decks, shot lists, schedules, call sheets, and media spaces — nothing else.')}
              </p>
              {guestUrl && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken px-3 py-1.5 text-xs text-text-secondary font-mono truncate">
                    <LinkIcon className="h-3 w-3 shrink-0 text-text-tertiary" />
                    <span className="truncate">{guestUrl}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 gap-1.5">
                    {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t('productionHub.copied', 'Copied') : t('productionHub.copy', 'Copy')}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {guestUrl ? (
                <>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    className="gap-1.5"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', generateMutation.isPending && 'animate-spin')} />
                    {t('productionHub.rotate', 'Rotate')}
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => revokeMutation.mutate()}
                    disabled={revokeMutation.isPending}
                    className="gap-1.5 text-danger hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('productionHub.revoke', 'Revoke')}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || tokenLoading}
                  className="gap-1.5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {t('productionHub.generateLink', 'Generate Link')}
                </Button>
              )}
            </div>
          </div>
        </GlassPanel>

        {/* 2-column grid for tool cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* DECK */}
          <ToolCard
            icon={<Presentation className="h-5 w-5 text-violet-500" />}
            title={t('productionHub.decks', 'Creative Decks')}
            description={t('productionHub.decksDesc', 'Mood boards, concepts, and creative briefs for client approval.')}
            count={decks.length}
            loading={deckLoading}
            onNew={() => navigate(`/decks?projectId=${id}&from=${fromParam}`)}
            newLabel={t('productionHub.newDeck', 'New Deck')}
            accentClass="bg-violet-500/10 border border-violet-500/20"
          >
            {decks.length === 0 ? (
              <EmptyState
                icon={<Presentation className="h-8 w-8" />}
                title={t('productionHub.noDecks', 'No decks yet')}
                description={t('productionHub.noDecksDesc', 'Start with a mood board or concept deck.')}
              />
            ) : (
              <ul>
                {decks.map((deck) => (
                  <ItemRow
                    key={deck.id}
                    primary={deck.title}
                    secondary={deck.description ?? undefined}
                    meta={
                      <>
                        <Badge variant="outline" className="text-[10px] capitalize">{deck.status?.toLowerCase()}</Badge>
                        <DateDisplay date={deck.updatedAt} />
                      </>
                    }
                    onClick={() => navigate(`/decks/${deck.id}?from=${fromParam}`)}
                  />
                ))}
              </ul>
            )}
          </ToolCard>

          {/* SHOT LIST */}
          <ToolCard
            icon={<ListChecks className="h-5 w-5 text-blue-500" />}
            title={t('productionHub.shotLists', 'Shot Lists')}
            description={t('productionHub.shotListsDesc', 'Scene-by-scene shot breakdown for the photography team.')}
            count={shotLists.length}
            loading={slLoading}
            onNew={() => navigate(`/shot-lists?projectId=${id}&from=${fromParam}`)}
            newLabel={t('productionHub.newShotList', 'New Shot List')}
            accentClass="bg-blue-500/10 border border-blue-500/20"
          >
            {shotLists.length === 0 ? (
              <EmptyState
                icon={<ListChecks className="h-8 w-8" />}
                title={t('productionHub.noShotLists', 'No shot lists yet')}
                description={t('productionHub.noShotListsDesc', 'Plan every scene and setup before shoot day.')}
              />
            ) : (
              <ul>
                {shotLists.map((sl) => {
                  const shotCount = (sl.scenes ?? []).reduce((acc: number, sc: { shots?: unknown[] }) => acc + (sc.shots?.length ?? 0), 0);
                  return (
                    <ItemRow
                      key={sl.id}
                      primary={sl.name}
                      secondary={sl.description ?? undefined}
                      meta={
                        <>
                          <span className="tabular-nums">{t('productionHub.shots', '{{n}} shots', { n: shotCount })}</span>
                          <DateDisplay date={sl.updatedAt} />
                        </>
                      }
                      onClick={() => navigate(`/shot-lists/${sl.id}?from=${fromParam}`)}
                    />
                  );
                })}
              </ul>
            )}
          </ToolCard>

          {/* SCHEDULE / RUNDOWN */}
          <ToolCard
            icon={<CalendarRange className="h-5 w-5 text-emerald-500" />}
            title={t('productionHub.schedules', 'Shooting Schedules')}
            description={t('productionHub.schedulesDesc', 'Day-by-day shoot schedule and strip board for the production team.')}
            count={schedules.length}
            loading={schLoading}
            onNew={() => navigate(`/schedules?projectId=${id}&from=${fromParam}`)}
            newLabel={t('productionHub.newSchedule', 'New Schedule')}
            accentClass="bg-emerald-500/10 border border-emerald-500/20"
          >
            {schedules.length === 0 ? (
              <EmptyState
                icon={<CalendarRange className="h-8 w-8" />}
                title={t('productionHub.noSchedules', 'No schedules yet')}
                description={t('productionHub.noSchedulesDesc', 'Build the day-by-day plan and generate call sheets from it.')}
              />
            ) : (
              <ul>
                {schedules.map((sch) => {
                  const dayCount = sch._count?.shootDays ?? sch.shootDays?.length ?? 0;
                  return (
                    <ItemRow
                      key={sch.id}
                      primary={sch.name}
                      secondary={sch.description ?? undefined}
                      meta={
                        <>
                          <span className="tabular-nums">{t('productionHub.days', '{{n}} days', { n: dayCount })}</span>
                          <DateDisplay date={sch.updatedAt} />
                        </>
                      }
                      onClick={() => navigate(`/schedules/${sch.id}?from=${fromParam}`)}
                    />
                  );
                })}
              </ul>
            )}
          </ToolCard>

          {/* CALL SHEETS */}
          <ToolCard
            icon={<FileText className="h-5 w-5 text-amber-500" />}
            title={t('productionHub.callSheets', 'Call Sheets')}
            description={t('productionHub.callSheetsDesc', 'Day-of crew briefings with call times, locations, and shot lists.')}
            count={callSheets.length}
            loading={csLoading}
            onNew={() => navigate(`/call-sheets?projectId=${id}&from=${fromParam}`)}
            newLabel={t('productionHub.newCallSheet', 'New Call Sheet')}
            accentClass="bg-amber-500/10 border border-amber-500/20"
          >
            {callSheets.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title={t('productionHub.noCallSheets', 'No call sheets yet')}
                description={t('productionHub.noCallSheetsDesc', 'Generate from a schedule or create a standalone call sheet.')}
              />
            ) : (
              <ul>
                {callSheets.map((cs) => (
                  <ItemRow
                    key={cs.id}
                    primary={cs.productionName || t('productionHub.callSheetN', 'Call Sheet #{{n}}', { n: cs.callSheetNumber })}
                    secondary={new Date(cs.shootDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    meta={
                      <>
                        <span>{t('productionHub.crew', '{{n}} crew', { n: cs._count?.crewCalls ?? 0 })}</span>
                        <span>{t('productionHub.cast', '{{n}} cast', { n: cs._count?.castCalls ?? 0 })}</span>
                      </>
                    }
                    onClick={() => navigate(`/call-sheets/${cs.id}?from=${fromParam}`)}
                  />
                ))}
              </ul>
            )}
          </ToolCard>

          {/* MEDIA COLLABORATION — full-width */}
          <div className="lg:col-span-2">
            <ToolCard
              icon={<Images className="h-5 w-5 text-rose-500" />}
              title={t('productionHub.mediaProjects', 'Media Collaboration')}
              description={t('productionHub.mediaProjectsDesc', 'Shared spaces for uploading selects, client review, and asset approval.')}
              count={mediaProjects.length}
              loading={mpLoading}
              onNew={() => navigate(`/media-collab?projectId=${id}&from=${fromParam}`)}
              newLabel={t('productionHub.newMediaProject', 'New Media Space')}
              accentClass="bg-rose-500/10 border border-rose-500/20"
            >
              {mediaProjects.length === 0 ? (
                <EmptyState
                  icon={<Images className="h-8 w-8" />}
                  title={t('productionHub.noMediaProjects', 'No media spaces yet')}
                  description={t('productionHub.noMediaProjectsDesc', 'Create a shared space to deliver selects and get client approval.')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mediaProjects.map((mp) => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => navigate(`/media-collab/${mp.id}?from=${fromParam}`)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border-subtle bg-bg-sunken/30 hover:bg-bg-sunken/60 transition-colors text-left group"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <Images className="h-4 w-4 text-rose-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-text-primary truncate">{mp.name}</div>
                        <div className="text-xs text-text-tertiary mt-0.5 flex items-center gap-2">
                          <span>{t('productionHub.assets', '{{n}} assets', { n: mp._count?.assets ?? 0 })}</span>
                          {mp.isPublic && (
                            <Badge variant="outline" className="text-[10px] text-accent-navy border-accent-navy/30 py-0">
                              <ExternalLink className="h-2.5 w-2.5 mr-1" />
                              {t('productionHub.shared', 'Shared')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ToolCard>
          </div>

        </div>
      </PageContainer>
    </AppShell>
  );
}
