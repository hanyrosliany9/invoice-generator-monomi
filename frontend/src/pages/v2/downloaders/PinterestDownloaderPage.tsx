import { useCallback, useMemo, useState } from 'react';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Download, Clipboard, Loader2, CheckCircle2, XCircle, Image as ImageIcon,
  Video, Link2, Trash2, FolderArchive, Eye, X, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  pinterestService,
  type PinterestJob,
  type PinterestPin,
} from '@/services/pinterestService';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — same shape as other v2 pages; Unduhan points to the   */
/*  media downloader by default since that's the broader tool.         */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Unduhan',    icon: <Download    className="h-4 w-4" />, href: '/v2/downloaders/media' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const URL_TYPE_LABEL: Record<string, string> = {
  pin:     'Pin tunggal',
  board:   'Board',
  user:    'Profil pengguna',
  section: 'Section',
  unknown: 'Tidak dikenal',
};

const JOB_STATUS_LABEL: Record<PinterestJob['status'], string> = {
  pending:   'Menunggu',
  running:   'Berjalan',
  completed: 'Selesai',
  failed:    'Gagal',
};

const formatJobName = (j: PinterestJob): string =>
  j.boardName || j.username || URL_TYPE_LABEL[j.type] || 'Tanpa nama';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const PIN_FILE_URL = (pinId: string) => `/api/v1/pinterest/pins/${pinId}/file`;

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function PinterestDownloaderPageV2() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [url, setUrl] = useState('');
  const [downloadImages, setDownloadImages] = useState(true);
  const [downloadVideos, setDownloadVideos] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const debouncedUrl = useDebouncedValue(url.trim(), 500);

  /* ---- URL inspection (Pinterest-only; reject everything else) ---- */
  const isPinterestUrl =
    debouncedUrl.includes('pinterest.com') || debouncedUrl.includes('pin.it');

  const { data: pinInfo, isFetching: checking } = useQuery({
    queryKey: ['pinterest', 'pin-info', debouncedUrl],
    queryFn: () => pinterestService.getPinInfo(debouncedUrl),
    enabled: debouncedUrl.length >= 10 && isPinterestUrl,
    retry: false,
    staleTime: 60_000,
  });

  /* ---- Jobs (poll while running) ---- */
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['pinterest', 'jobs'],
    queryFn: () => pinterestService.getJobs(1, 25),
    refetchInterval: 5000,
  });
  const jobs = jobsData?.data ?? [];
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  /* ---- Pins for selected job ---- */
  const { data: pinsData, isLoading: pinsLoading } = useQuery({
    queryKey: ['pinterest', 'pins', selectedJobId],
    queryFn: () => pinterestService.getPins(selectedJobId!),
    enabled: !!selectedJobId,
  });
  const pins: PinterestPin[] = pinsData?.data ?? [];

  /* ---- Mutations ---- */
  const startBatch = useMutation({
    mutationFn: () =>
      pinterestService.startDownload(debouncedUrl, {
        downloadImages,
        downloadVideos,
      }),
    onSuccess: () => {
      toast.success('Pekerjaan unduhan dimulai. Pantau progresnya di bawah.');
      setUrl('');
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'jobs'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal memulai unduhan.';
      toast.error(message);
    },
  });

  const quickPin = useMutation({
    mutationFn: () => pinterestService.quickDownload(debouncedUrl),
    onSuccess: () => {
      toast.success('Pin diunduh ke folder Downloads.');
      setUrl('');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Gagal mengunduh pin.';
      toast.error(message);
    },
  });

  const cancelJob = useMutation({
    mutationFn: (id: string) => pinterestService.cancelJob(id),
    onSuccess: () => {
      toast.success('Pekerjaan dibatalkan.');
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'jobs'] });
    },
    onError: () => toast.error('Gagal membatalkan pekerjaan.'),
  });

  const deleteJob = useMutation({
    mutationFn: (id: string) => pinterestService.deleteJob(id),
    onSuccess: () => {
      toast.success('Pekerjaan dihapus.');
      if (selectedJobId) setSelectedJobId(null);
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'jobs'] });
    },
    onError: () => toast.error('Gagal menghapus pekerjaan.'),
  });

  /* ---- Clipboard ---- */
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        toast.success('URL ditempel dari clipboard.');
      } else {
        toast.info('Clipboard kosong.');
      }
    } catch {
      toast.error('Tidak bisa membaca clipboard. Tempel manual saja.');
    }
  }, []);

  /* ---- Derived KPIs from the jobs list ---- */
  const stats = useMemo(() => {
    const total = jobs.length;
    const running = jobs.filter((j) => j.status === 'running' || j.status === 'pending').length;
    const totalPins = jobs.reduce((s, j) => s + (j.downloadedPins ?? 0), 0);
    return { total, running, totalPins };
  }, [jobs]);

  /* ---- Decisions for the URL state ---- */
  const isSinglePin = !!pinInfo?.isPin;
  const canStart = debouncedUrl.length >= 10 && isPinterestUrl && !checking;
  const submitting = startBatch.isPending || quickPin.isPending;

  const handleSubmit = () => {
    if (!canStart) return;
    if (isSinglePin) quickPin.mutate();
    else startBatch.mutate();
  };

  const triggerJobZip = (jobId: string) => {
    const link = document.createElement('a');
    link.href = pinterestService.getJobDownloadUrl(jobId);
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  return (
    <Shell>
      <PageHeader
        title="Pengunduh Pinterest"
        description="Unduh satu pin, seluruh board, atau profil pengguna. Pekerjaan batch berjalan di latar belakang — Anda bisa menutup tab dan kembali nanti."
        actions={
          <Badge
            variant="outline"
            className="border-border-subtle text-text-tertiary px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider"
          >
            Pin · Board · Profil
          </Badge>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          Hero — same structural language as the media downloader so
          the two tools feel like siblings rather than separate apps.
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="strong" padding="none" className="mb-10 overflow-hidden">
        <div className="px-6 sm:px-8 py-7">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-base font-display font-semibold text-text-primary">
              Tempel tautan Pinterest
            </h2>
            <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
              Langkah 1
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://pinterest.com/pin/123… atau https://pinterest.com/username/board"
                className="pl-9 pr-3 h-11 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary text-sm"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handlePaste}
              className="h-11 shrink-0 border-border-subtle text-text-secondary hover:text-text-primary"
            >
              <Clipboard className="h-4 w-4" />
              Tempel
            </Button>
          </div>

          {/* Inline status */}
          <div className="mt-3 min-h-[20px] flex items-center gap-2 text-xs">
            {url.length === 0 ? (
              <span className="text-text-tertiary">
                Hanya tautan pinterest.com atau pin.it yang diterima.
              </span>
            ) : !isPinterestUrl ? (
              <>
                <XCircle className="h-3.5 w-3.5 text-danger" />
                <span className="text-text-secondary">
                  Tautan ini bukan dari Pinterest.
                </span>
              </>
            ) : checking ? (
              <span className="inline-flex items-center gap-1.5 text-text-tertiary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Memeriksa tautan…
              </span>
            ) : pinInfo ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span className="text-text-secondary">Terdeteksi</span>
                <Badge
                  variant="outline"
                  className="border-transparent bg-accent-navy/15 text-accent-navy px-2 py-0.5 text-[10px] font-medium"
                >
                  {URL_TYPE_LABEL[pinInfo.urlType] ?? pinInfo.urlType}
                </Badge>
                {isSinglePin && (
                  <span className="text-text-tertiary">
                    — akan langsung diunduh ke browser.
                  </span>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* Options + CTA — checkboxes for batch only; quick download
            for single pin doesn't need filters. */}
        <div className="border-t border-border-subtle bg-bg-sunken/40 px-6 sm:px-8 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-6">
            {!isSinglePin && (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">
                <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                  Jenis media
                </span>
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={downloadImages}
                      onCheckedChange={(c) => setDownloadImages(c === true)}
                    />
                    <span className="inline-flex items-center gap-1.5 text-sm text-text-primary">
                      <ImageIcon className="h-3.5 w-3.5 text-text-tertiary" />
                      Gambar
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={downloadVideos}
                      onCheckedChange={(c) => setDownloadVideos(c === true)}
                    />
                    <span className="inline-flex items-center gap-1.5 text-sm text-text-primary">
                      <Video className="h-3.5 w-3.5 text-text-tertiary" />
                      Video
                    </span>
                  </label>
                </div>
              </div>
            )}

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!canStart || submitting || (!isSinglePin && !downloadImages && !downloadVideos)}
              className="w-full lg:w-auto lg:ml-auto h-11 min-h-[44px] lg:min-w-[200px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memulai…
                </>
              ) : isSinglePin ? (
                <>
                  <Download className="h-4 w-4" />
                  Unduh Pin
                </>
              ) : (
                <>
                  <FolderArchive className="h-4 w-4" />
                  Mulai Unduhan Batch
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Single-pin preview strip */}
        {isSinglePin && pinInfo && (
          <div className="border-t border-border-subtle px-6 sm:px-8 py-5 flex items-start gap-4">
            {pinInfo.previewUrl ? (
              <img
                src={pinInfo.previewUrl}
                alt=""
                className="w-20 h-20 object-cover rounded-md border border-border-subtle shrink-0 bg-bg-sunken"
                loading="lazy"
              />
            ) : (
              <div className="w-20 h-20 rounded-md border border-border-subtle bg-bg-sunken flex items-center justify-center shrink-0">
                {pinInfo.mediaType === 'video'
                  ? <Video className="h-6 w-6 text-text-tertiary" />
                  : <ImageIcon className="h-6 w-6 text-text-tertiary" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-display font-semibold text-text-primary line-clamp-1 leading-snug">
                {pinInfo.title || 'Tanpa judul'}
              </h3>
              <div className="mt-1 text-xs text-text-tertiary">
                ID pin: <span className="text-text-secondary font-mono">{pinInfo.pinId}</span>
              </div>
              <Badge
                variant="outline"
                className="mt-2 border-transparent bg-bg-sunken text-text-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              >
                {pinInfo.mediaType === 'video' ? 'Video' : 'Gambar'}
              </Badge>
            </div>
          </div>
        )}
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────────────
          KPI band
         ───────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total pekerjaan"
            value={jobsLoading ? '…' : stats.total}
            sublabel="batch + tunggal tersimpan"
          />
          <StatCard
            label="Sedang berjalan"
            value={jobsLoading ? '…' : stats.running}
            sublabel="diperbarui tiap 5 detik"
          />
          <StatCard
            label="Total pin diunduh"
            value={jobsLoading ? '…' : stats.totalPins.toLocaleString('id-ID')}
            sublabel="lintas semua pekerjaan"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          Jobs + Pin preview. Two-column layout on lg, single column on
          smaller. The selected job opens a side panel rather than a
          modal so the list stays in context.
         ───────────────────────────────────────────────────────────── */}
      <div className={cn(
        'grid gap-4',
        selectedJobId ? 'lg:grid-cols-[1.4fr_1fr]' : 'grid-cols-1',
      )}>
        {/* Jobs list */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-border-subtle flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="h-4 w-4 text-text-tertiary shrink-0" />
              <h2 className="text-sm font-display font-semibold text-text-primary">
                Pekerjaan unduhan
              </h2>
            </div>
            {jobs.length > 0 && (
              <span className="text-xs text-text-tertiary tabular-nums">
                {jobs.length} pekerjaan
              </span>
            )}
          </div>

          {jobsLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={<FolderArchive />}
              title="Belum ada pekerjaan unduhan"
              description="Tempel URL board atau profil Pinterest di atas untuk memulai unduhan batch pertama Anda."
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isSelected={job.id === selectedJobId}
                  onSelect={() => setSelectedJobId(job.id)}
                  onCancel={() => cancelJob.mutate(job.id)}
                  onDelete={() => {
                    if (confirm(`Hapus pekerjaan "${formatJobName(job)}"? File yang sudah diunduh juga akan ikut terhapus.`)) {
                      deleteJob.mutate(job.id);
                    }
                  }}
                  onZip={() => triggerJobZip(job.id)}
                />
              ))}
            </ul>
          )}
        </GlassPanel>

        {/* Detail / pins panel */}
        {selectedJobId && (
          <GlassPanel surface="glass" padding="none" className="overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-border-subtle flex items-center justify-between gap-3">
              <h2 className="text-sm font-display font-semibold text-text-primary truncate">
                {selectedJob ? formatJobName(selectedJob) : 'Detail pekerjaan'}
              </h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedJobId(null)}
                className="text-text-tertiary hover:text-text-primary shrink-0"
                aria-label="Tutup panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedJob && (
              <div className="px-5 sm:px-6 py-4 border-b border-border-subtle">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <MiniStat label="Total" value={selectedJob.totalPins} />
                  <MiniStat label="Selesai" value={selectedJob.downloadedPins} tone="success" />
                  <MiniStat label="Gagal" value={selectedJob.failedPins} tone={selectedJob.failedPins > 0 ? 'danger' : undefined} />
                </div>
                {selectedJob.status === 'completed' && selectedJob.downloadedPins > 0 && (
                  <Button
                    size="sm"
                    onClick={() => triggerJobZip(selectedJob.id)}
                    className="w-full"
                  >
                    <FolderArchive className="h-4 w-4" />
                    Unduh semua sebagai ZIP
                  </Button>
                )}
                {selectedJob.outputPath && (
                  <p className="mt-3 text-xs text-text-tertiary">
                    Tersimpan di{' '}
                    <code className="font-mono text-text-secondary break-all">
                      {selectedJob.outputPath}
                    </code>
                  </p>
                )}
              </div>
            )}

            {/* Pin gallery */}
            {pinsLoading ? (
              <div className="p-5 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : pins.length === 0 ? (
              <EmptyState
                icon={<ImageIcon />}
                title="Belum ada pin"
                description="Pin akan muncul di sini setelah selesai diunduh."
              />
            ) : (
              <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[480px] overflow-y-auto">
                {pins.map((pin) => (
                  <PinTile key={pin.id} pin={pin} />
                ))}
              </div>
            )}
          </GlassPanel>
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  JobRow — one row per job. Progress bar carries the running state,  */
/*  and we keep the actions narrow so the title can breathe.           */
/* ------------------------------------------------------------------ */

interface JobRowProps {
  job: PinterestJob;
  isSelected: boolean;
  onSelect: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onZip: () => void;
}

function JobRow({ job, isSelected, onSelect, onCancel, onDelete, onZip }: JobRowProps) {
  const total = job.totalPins || 0;
  const done = job.downloadedPins + job.failedPins + job.skippedPins;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusTone: Record<PinterestJob['status'], string> = {
    pending:   'text-text-tertiary',
    running:   'text-accent-navy',
    completed: 'text-success',
    failed:    'text-danger',
  };

  return (
    <li
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-selected={isSelected}
      className={cn(
        'group px-5 sm:px-6 py-4 cursor-pointer transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy/40 focus-visible:ring-inset',
        isSelected ? 'bg-bg-sunken/70' : 'hover:bg-bg-sunken/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-display font-semibold text-text-primary truncate">
              {formatJobName(job)}
            </span>
            <Badge
              variant="outline"
              className="border-border-subtle text-text-tertiary px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider shrink-0"
            >
              {URL_TYPE_LABEL[job.type] ?? job.type}
            </Badge>
          </div>
          <div className="mt-0.5 text-xs text-text-tertiary truncate">
            {formatDate(job.createdAt)}
          </div>
        </div>

        <span className={cn('text-xs font-medium shrink-0 inline-flex items-center gap-1', statusTone[job.status])}>
          {job.status === 'running' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : job.status === 'completed' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : job.status === 'failed' ? (
            <XCircle className="h-3 w-3" />
          ) : null}
          {JOB_STATUS_LABEL[job.status]}
        </span>
      </div>

      {/* Progress */}
      <div className="mt-3">
        <Progress
          value={percent}
          className={cn(
            'h-1.5 bg-bg-sunken',
            job.status === 'failed' && '[&>div]:bg-danger',
            job.status === 'completed' && '[&>div]:bg-success',
          )}
        />
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-text-tertiary tabular-nums">
          <span>{job.downloadedPins} / {total || '?'} pin</span>
          <span>{percent}%</span>
        </div>
      </div>

      {/* Actions row */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mt-3 flex items-center gap-1 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelect}
          className="text-text-tertiary hover:text-text-primary h-7 px-2 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          Lihat pin
        </Button>
        {job.status === 'completed' && job.downloadedPins > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onZip}
            className="text-text-tertiary hover:text-text-primary h-7 px-2 text-xs"
          >
            <FolderArchive className="h-3.5 w-3.5" />
            ZIP
          </Button>
        )}
        {job.status === 'running' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-text-tertiary hover:text-danger h-7 px-2 text-xs"
          >
            <XCircle className="h-3.5 w-3.5" />
            Batal
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="ml-auto text-text-tertiary hover:text-danger h-7 px-2 text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Hapus
        </Button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  MiniStat — used inside the detail panel where StatCard would feel  */
/*  too heavy. Same vocabulary, lighter weight.                        */
/* ------------------------------------------------------------------ */

function MiniStat({
  label, value, tone,
}: { label: string; value: number; tone?: 'success' | 'danger' }) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-sunken/60 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
        {label}
      </div>
      <div className={cn(
        'mt-1 text-lg font-display font-semibold tabular-nums leading-none',
        tone === 'success' ? 'text-success'
          : tone === 'danger' ? 'text-danger'
          : 'text-text-primary',
      )}>
        {value.toLocaleString('id-ID')}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PinTile — one square tile in the gallery. Failed pins get a quiet  */
/*  X; pending pins get a spinner. We never display a broken-image     */
/*  glyph because that reads as a bug, not a state.                    */
/* ------------------------------------------------------------------ */

function PinTile({ pin }: { pin: PinterestPin }) {
  return (
    <div
      className="relative aspect-square rounded-md overflow-hidden border border-border-subtle bg-bg-sunken"
      title={pin.title || pin.pinId}
    >
      {pin.downloaded && pin.localPath ? (
        <img
          src={PIN_FILE_URL(pin.id)}
          alt={pin.title || pin.pinId}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {pin.error
            ? <XCircle className="h-5 w-5 text-danger" />
            : <Loader2 className="h-4 w-4 text-text-tertiary animate-spin" />}
        </div>
      )}
      {pin.mediaType === 'video' && pin.downloaded && (
        <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5">
          <Video className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
}
