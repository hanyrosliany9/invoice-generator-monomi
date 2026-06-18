import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clapperboard, ListChecks, CalendarRange, FileText, Presentation,
  Images, ExternalLink, ChevronRight, AlertCircle, Loader2,
  Film, Calendar,
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  API call — no auth required, uses the public guest endpoint        */
/* ------------------------------------------------------------------ */
async function fetchGuestHub(token: string) {
  const res = await apiClient.get(`/projects/hub/${token}`);
  return res.data.data as GuestHubData;
}

/* ------------------------------------------------------------------ */
/*  Types mirroring the backend response                               */
/* ------------------------------------------------------------------ */
interface GuestHubData {
  project: {
    id: string;
    number: string;
    description: string;
    status: string;
    startDate?: string;
    endDate?: string;
    client?: { id: string; name: string; company?: string };
    projectType?: { id: string; name: string };
    shotLists: GuestShotList[];
    shootingSchedules: GuestSchedule[];
    decks: GuestDeck[];
    mediaProjects: GuestMediaProject[];
  };
  callSheets: GuestCallSheet[];
}

interface GuestShotList {
  id: string; name: string; description?: string; updatedAt: string;
  scenes: { id: string; shots: { id: string }[] }[];
}
interface GuestSchedule {
  id: string; name: string; description?: string; startDate?: string; updatedAt: string;
  _count: { shootDays: number };
}
interface GuestDeck {
  id: string; title: string; description?: string; status: string;
  isPublic: boolean; publicShareToken?: string; updatedAt: string;
  _count: { slides: number };
}
interface GuestMediaProject {
  id: string; name: string; description?: string;
  isPublic: boolean; publicShareToken?: string; updatedAt: string;
  _count: { assets: number };
}
interface GuestCallSheet {
  id: string; productionName?: string; callSheetNumber: number;
  shootDate: string; crewCallTime?: string; locationName?: string;
  _count: { crewCalls: number; castCalls: number };
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function SectionCard({
  icon, title, accentClass, children,
}: {
  icon: React.ReactNode;
  title: string;
  accentClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accentClass)}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ItemRow({
  primary, secondary, meta, href, disabled,
}: {
  primary: string;
  secondary?: string;
  meta?: React.ReactNode;
  href?: string;
  disabled?: boolean;
}) {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag
      {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl',
        'bg-white/5 border border-white/5',
        href && !disabled ? 'hover:bg-white/10 cursor-pointer transition-colors' : '',
        disabled ? 'opacity-40' : '',
      )}
    >
      <div className="min-w-0">
        <div className="text-sm text-white/90 truncate">{primary}</div>
        {secondary && <div className="text-xs text-white/50 truncate mt-0.5">{secondary}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-2 text-xs text-white/40">
        {meta}
        {href && !disabled && <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
        {href && !disabled && <ExternalLink className="h-3 w-3 text-white/30" />}
      </div>
    </Tag>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-white/30 text-xs gap-1">
      <Film className="h-6 w-6 opacity-40 mb-1" />
      {label}
    </div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */
export default function GuestProductionHubPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['guest-hub', token],
    queryFn: () => fetchGuestHub(token!),
    enabled: !!token,
    retry: 1,
  });

  /* ── Loading ─────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/50">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading production hub…</p>
        </div>
      </div>
    );
  }

  /* ── Error / invalid token ───────────────────────────────────────── */
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
          </div>
          <h2 className="text-white font-semibold">Access Denied</h2>
          <p className="text-sm text-white/50">
            This link is invalid or has been revoked by the project owner.
          </p>
        </div>
      </div>
    );
  }

  const { project, callSheets } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header bar — branding only, no navigation */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-navy/80">
              <Clapperboard className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90 tracking-tight">Monomi Studio</span>
          </div>
          <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">
            Read-only
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Project header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest">{project.number}</span>
            {project.projectType && (
              <Badge variant="outline" className="text-[10px] border-white/10 text-white/40 capitalize">
                {project.projectType.name}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{project.description}</h1>
          {project.client && (
            <p className="text-sm text-white/50">
              {project.client.company || project.client.name}
            </p>
          )}
          {(project.startDate || project.endDate) && (
            <p className="text-xs text-white/30 flex items-center gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {project.startDate && formatDate(project.startDate)}
              {project.startDate && project.endDate && ' – '}
              {project.endDate && formatDate(project.endDate)}
            </p>
          )}
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* DECKS */}
          <SectionCard
            icon={<Presentation className="h-4 w-4 text-violet-400" />}
            title="Creative Decks"
            accentClass="bg-violet-500/10 border border-violet-500/20"
          >
            {project.decks.length === 0 ? (
              <EmptyCard label="No decks shared yet" />
            ) : (
              <div className="space-y-2">
                {project.decks.map((deck) => {
                  const href = deck.isPublic && deck.publicShareToken
                    ? `${window.location.origin}/deck-public/${deck.publicShareToken}`
                    : undefined;
                  return (
                    <ItemRow
                      key={deck.id}
                      primary={deck.title}
                      secondary={deck.description}
                      href={href}
                      disabled={!deck.isPublic}
                      meta={
                        <>
                          <span>{deck._count.slides} slides</span>
                          {deck.isPublic
                            ? <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">Open</Badge>
                            : <Badge variant="outline" className="text-[10px] border-white/10 text-white/30">Private</Badge>
                          }
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* SHOT LISTS */}
          <SectionCard
            icon={<ListChecks className="h-4 w-4 text-blue-400" />}
            title="Shot Lists"
            accentClass="bg-blue-500/10 border border-blue-500/20"
          >
            {project.shotLists.length === 0 ? (
              <EmptyCard label="No shot lists yet" />
            ) : (
              <div className="space-y-2">
                {project.shotLists.map((sl) => {
                  const shotCount = sl.scenes.reduce((acc, sc) => acc + sc.shots.length, 0);
                  return (
                    <ItemRow
                      key={sl.id}
                      primary={sl.name}
                      secondary={sl.description}
                      meta={<span>{shotCount} shots · {sl.scenes.length} scenes</span>}
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* SHOOTING SCHEDULES */}
          <SectionCard
            icon={<CalendarRange className="h-4 w-4 text-emerald-400" />}
            title="Shooting Schedules"
            accentClass="bg-emerald-500/10 border border-emerald-500/20"
          >
            {project.shootingSchedules.length === 0 ? (
              <EmptyCard label="No schedules yet" />
            ) : (
              <div className="space-y-2">
                {project.shootingSchedules.map((sch) => (
                  <ItemRow
                    key={sch.id}
                    primary={sch.name}
                    secondary={sch.description}
                    meta={
                      <>
                        <span>{sch._count.shootDays} shoot days</span>
                        {sch.startDate && <span>{formatDate(sch.startDate)}</span>}
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* CALL SHEETS */}
          <SectionCard
            icon={<FileText className="h-4 w-4 text-amber-400" />}
            title="Call Sheets"
            accentClass="bg-amber-500/10 border border-amber-500/20"
          >
            {callSheets.length === 0 ? (
              <EmptyCard label="No call sheets yet" />
            ) : (
              <div className="space-y-2">
                {callSheets.map((cs) => (
                  <ItemRow
                    key={cs.id}
                    primary={cs.productionName || `Call Sheet #${cs.callSheetNumber}`}
                    secondary={
                      [
                        formatDate(cs.shootDate),
                        cs.crewCallTime && `Crew call: ${cs.crewCallTime}`,
                        cs.locationName,
                      ].filter(Boolean).join(' · ')
                    }
                    meta={
                      <>
                        <span>{cs._count.crewCalls} crew</span>
                        <span>{cs._count.castCalls} cast</span>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* MEDIA COLLABORATION — full width */}
          <div className="md:col-span-2">
            <SectionCard
              icon={<Images className="h-4 w-4 text-rose-400" />}
              title="Media Collaboration"
              accentClass="bg-rose-500/10 border border-rose-500/20"
            >
              {project.mediaProjects.length === 0 ? (
                <EmptyCard label="No media spaces shared yet" />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {project.mediaProjects.map((mp) => {
                    const href = mp.isPublic && mp.publicShareToken
                      ? `${window.location.origin}/media-collab/view/${mp.publicShareToken}`
                      : undefined;
                    return (
                      <a
                        key={mp.id}
                        {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5',
                          href ? 'hover:bg-white/10 cursor-pointer transition-colors' : 'opacity-40 cursor-default',
                        )}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <Images className="h-4 w-4 text-rose-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white/90 truncate">{mp.name}</div>
                          <div className="text-xs text-white/40 mt-0.5 flex items-center gap-1.5">
                            <span>{mp._count.assets} assets</span>
                            {mp.isPublic
                              ? <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400 py-0">Shared</Badge>
                              : <Badge variant="outline" className="text-[10px] border-white/10 text-white/30 py-0">Private</Badge>
                            }
                          </div>
                        </div>
                        {href && <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />}
                      </a>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

        </div>
      </main>

      {/* Footer — no links to the rest of the app */}
      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-12 flex items-center">
          <p className="text-xs text-white/20">
            Monomi Studio · Read-only production view · {project.number}
          </p>
        </div>
      </footer>
    </div>
  );
}
