/* ------------------------------------------------------------------ */
/*  ContentCalendarClientsPage — the client picker.                    */
/*                                                                     */
/*  Mirrors the Media Collaboration folder grid: content is scoped per */
/*  client, so this landing page lets you pick a client folder, then   */
/*  opens that client's scoped content calendar + Instagram preview.   */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, CalendarRange, AtSign, FolderOpen,
  ChevronRight, CalendarClock, Images,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { clientService, type Client } from '@/services/clients';
import contentCalendarService, { type ContentCalendarItem } from '@/services/content-calendar';
import { cn } from '@/lib/utils';

interface ClientStats {
  total: number;
  scheduled: number;
  instagram: number;
  nextAt: string | null;
}

export default function ContentCalendarClientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  // One fetch of all content; counts are grouped per client client-side.
  const { data: content = [], isLoading: loadingContent } = useQuery({
    queryKey: ['content-calendar-v2', {}],
    queryFn: () => contentCalendarService.getContents(),
  });

  const statsByClient = useMemo(() => {
    const map = new Map<string, ClientStats>();
    (content as ContentCalendarItem[]).forEach((it) => {
      if (!it.clientId) return;
      const s = map.get(it.clientId) ?? { total: 0, scheduled: 0, instagram: 0, nextAt: null };
      s.total += 1;
      if (it.status === 'SCHEDULED') s.scheduled += 1;
      if (it.platforms?.includes('INSTAGRAM')) s.instagram += 1;
      if (it.scheduledAt && (!s.nextAt || it.scheduledAt < s.nextAt) && new Date(it.scheduledAt) >= new Date()) {
        s.nextAt = it.scheduledAt;
      }
      map.set(it.clientId, s);
    });
    return map;
  }, [content]);

  const totals = useMemo(() => {
    const items = content as ContentCalendarItem[];
    return {
      clients: clients.length,
      content: items.length,
      scheduled: items.filter((i) => i.status === 'SCHEDULED').length,
    };
  }, [clients, content]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...clients].sort((a, b) => {
      // clients with content float to the top, then alphabetical
      const ca = statsByClient.get(a.id)?.total ?? 0;
      const cb = statsByClient.get(b.id)?.total ?? 0;
      if (ca !== cb) return cb - ca;
      return a.name.localeCompare(b.name);
    });
    if (!q) return list;
    return list.filter((c) =>
      c.name?.toLowerCase().includes(q)
      || c.company?.toLowerCase().includes(q)
      || c.instagramHandle?.toLowerCase().includes(q),
    );
  }, [clients, search, statsByClient]);

  const isLoading = loadingClients || loadingContent;

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
        <PageHeader
          title={t('content.clients.title', 'Kalender Konten')}
          description={t('content.clients.subtitle', 'Pilih klien untuk mengelola dan mempratinjau konten media sosialnya.')}
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
              <CalendarRange className="h-4 w-4" />
              {t('content.openGeneral', 'Kalender Umum')}
            </Button>
          }
        />

        {/* KPI band */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard label={t('content.clients.totalClients', 'Klien')} value={String(totals.clients)} />
                <StatCard label={t('content.clients.totalContent', 'Total Konten')} value={String(totals.content)} />
                <StatCard label={t('content.clients.scheduled', 'Terjadwal')} value={String(totals.scheduled)} />
              </>
            )}
          </div>
        </section>

        <GlassPanel surface="glass" padding="none">
          {/* search */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('content.clients.searchPlaceholder', 'Cari klien...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="text-text-tertiary hover:text-text-primary">
                <X className="h-3.5 w-3.5" />
                {t('common.reset', 'Reset')}
              </Button>
            )}
          </div>

          {/* grid */}
          {isLoading ? (
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[124px] rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title={search ? t('content.clients.noMatch', 'Tidak ada klien yang cocok') : t('content.clients.empty', 'Belum ada klien')}
              description={search
                ? t('content.clients.noMatchDesc', 'Coba kata kunci lain.')
                : t('content.clients.emptyDesc', 'Tambah klien terlebih dahulu untuk merencanakan kontennya.')}
            />
          ) : (
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((c) => (
                <ClientFolderCard
                  key={c.id}
                  client={c}
                  stats={statsByClient.get(c.id)}
                  onOpen={() => navigate(`/calendar/content/clients/${c.id}`)}
                />
              ))}
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  ClientFolderCard                                                   */
/* ------------------------------------------------------------------ */

function ClientFolderCard({
  client, stats, onOpen,
}: {
  client: Client;
  stats?: ClientStats;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const total = stats?.total ?? 0;
  const handle = client.instagramHandle
    || '@' + client.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  const letter = client.name.charAt(0).toUpperCase();
  const nextLabel = stats?.nextAt
    ? new Date(stats.nextAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-sunken p-4 text-left transition-all hover:-translate-y-0.5 hover:border-border-default hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        {client.instagramAvatarUrl ? (
          <img src={client.instagramAvatarUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-border-subtle" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent-navy-wash to-bg-raised text-sm font-semibold text-text-primary ring-1 ring-border-subtle">
            {letter}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-text-primary">{client.name}</div>
          <div className="flex items-center gap-1 truncate text-[11px] text-text-tertiary">
            <AtSign className="h-3 w-3 shrink-0" />
            <span className="truncate">{handle.replace(/^@/, '')}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1 text-[10px]">
          <Images className="h-3 w-3" /> {total} {t('content.clients.posts', 'konten')}
        </Badge>
        {(stats?.scheduled ?? 0) > 0 && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <CalendarClock className="h-3 w-3" /> {stats?.scheduled}
          </Badge>
        )}
        {nextLabel && (
          <span className="ml-auto text-[10px] text-text-tertiary">
            {t('content.clients.next', 'Berikutnya')} {nextLabel}
          </span>
        )}
      </div>
    </button>
  );
}
